import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { assignedToMe } = req.query;
    
    let patients: any[];

    // If assignedToMe=true, allow employees to see their assigned patients
    if (assignedToMe === 'true' && session.user.role === 'EMPLOYEE') {
      patients = await prisma.patient.findMany({
        where: {
          technicianId: session.user.id, // Filter by technician assignment
        },
        select: getPatientSelectFields()
      });
      
      console.log(`Found ${patients.length} assigned patients for employee ${session.user.id}`);
    } else {
      // Admin access - all patients
      if (session.user.role !== 'ADMIN') {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      patients = await prisma.patient.findMany({
        select: getPatientSelectFields()
      });
      
      console.log(`Found ${patients.length} patients for admin`);
    }

    // Transform data for the map
    const transformedPatients = transformPatientsData(patients);
    
    return res.status(200).json(transformedPatients);
  } catch (error) {
    console.error('Error fetching patient locations:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Helper function to get patient select fields (reduces duplication)
function getPatientSelectFields() {
  return {
    id: true,
    firstName: true,
    lastName: true,
    delegation: true,
    governorate: true,
    detailedAddress: true,
    addressCoordinates: true,
    telephone: true,
    telephoneTwo: true,
    cin: true,
    dateOfBirth: true,
    createdAt: true,
    appointments: {
      orderBy: {
        scheduledDate: 'desc' as any
      },
      take: 1,
      select: {
        scheduledDate: true,
        status: true,
        location: true
      }
    },
    technician: {
      select: {
        firstName: true,
        lastName: true
      }
    },
    rentals: {
      where: {
        status: {
          in: ['ACTIVE' as any, 'PENDING' as any]
        }
      },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        medicalDevice: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            model: true,
            brand: true,
            type: true
          }
        }
      },
      orderBy: {
        startDate: 'desc' as any
      }
    },
    sales: {
      select: {
        id: true,
        saleDate: true,
        status: true,
        items: {
          select: {
            medicalDevice: {
              select: {
                id: true,
                name: true,
                serialNumber: true,
                model: true,
                brand: true,
                type: true
              }
            },
            serialNumber: true,
            quantity: true
          }
        }
      },
      orderBy: {
        saleDate: 'desc' as any
      }
    },
    medicalDevices: {
      select: {
        id: true,
        name: true,
        serialNumber: true,
        model: true,
        brand: true,
        type: true,
        installationDate: true,
        configuration: true
      }
    },
    diagnostics: {
      where: {
        followUpRequired: true,
        followUpDate: {
          gte: new Date() // Only current/future follow-ups
        },
        status: {
          in: ['PENDING' as any, 'COMPLETED' as any] // Active diagnostics
        }
      },
      select: {
        id: true,
        diagnosticDate: true,
        followUpDate: true,
        followUpRequired: true,
        status: true,
        notes: true,
        medicalDevice: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            model: true,
            brand: true,
            type: true
          }
        },
        performedBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        followUpDate: 'asc' as any
      }
    }
  };
}

// Transform patients data for the map
function transformPatientsData(patients: any[]) {
  return patients.map((patient) => {
    let latitude = 36.8065; // Default to Tunis
    let longitude = 10.1815;

    // Check if we have actual coordinates from addressCoordinates field
    if (patient.addressCoordinates) {
      let coords;
      
      // Handle case where addressCoordinates is stored as string (JSON)
      if (typeof patient.addressCoordinates === 'string') {
        try {
          coords = JSON.parse(patient.addressCoordinates);
        } catch (e) {
          console.warn('Failed to parse addressCoordinates as JSON:', patient.addressCoordinates);
        }
      } 
      // Handle case where it's already an object
      else if (typeof patient.addressCoordinates === 'object') {
        coords = patient.addressCoordinates as any;
      }
      
      // Extract coordinates from parsed/object data
      if (coords && (coords.lat || coords.latitude)) {
        if (coords.lat && coords.lng) {
          latitude = Number(coords.lat);
          longitude = Number(coords.lng);
        } else if (coords.latitude && coords.longitude) {
          latitude = Number(coords.latitude);
          longitude = Number(coords.longitude);
        }
      }
    }
    
    // If no coordinates, use governorate coordinates with slight offset to avoid overlap
    if (latitude === 36.8065 && longitude === 10.1815 && patient.governorate) {
      const regionCoords = getRegionCoordinates(patient.governorate);
      if (regionCoords) {
        // Add small random offset to prevent markers from overlapping
        latitude = regionCoords.lat + (Math.random() - 0.5) * 0.1;
        longitude = regionCoords.lng + (Math.random() - 0.5) * 0.1;
      }
    } else if (latitude === 36.8065 && longitude === 10.1815) {
      // If still no location, spread them around Tunis with offset
      latitude = latitude + (Math.random() - 0.5) * 0.2;
      longitude = longitude + (Math.random() - 0.5) * 0.2;
    }

    // Calculate age if date of birth exists
    const age = patient.dateOfBirth 
      ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    // Normalize region name for display
    const normalizedRegion = patient.governorate ? normalizeLocationName(patient.governorate) : 'Tunis';

    // Process device information
    const devices: any[] = [];
    
    // Add rented devices
    patient.rentals.forEach((rental: any) => {
      if (rental.medicalDevice) {
        devices.push({
          id: rental.medicalDevice.id,
          name: rental.medicalDevice.name,
          serialNumber: rental.medicalDevice.serialNumber,
          model: rental.medicalDevice.model,
          brand: rental.medicalDevice.brand,
          type: rental.medicalDevice.type,
          status: 'RENTED',
          rentalStatus: rental.status,
          startDate: new Date(rental.startDate).toLocaleDateString('fr-FR'),
          endDate: rental.endDate ? new Date(rental.endDate).toLocaleDateString('fr-FR') : null
        });
      }
    });

    // Add sold devices
    patient.sales.forEach((sale: any) => {
      sale.items.forEach((item: any) => {
        if (item.medicalDevice) {
          devices.push({
            id: item.medicalDevice.id,
            name: item.medicalDevice.name,
            serialNumber: item.serialNumber || item.medicalDevice.serialNumber,
            model: item.medicalDevice.model,
            brand: item.medicalDevice.brand,
            type: item.medicalDevice.type,
            status: 'SOLD',
            saleDate: new Date(sale.saleDate).toLocaleDateString('fr-FR'),
            quantity: item.quantity
          });
        }
      });
    });

    // Add directly assigned devices
    patient.medicalDevices.forEach((device: any) => {
      // Avoid duplicates from rentals/sales
      if (!devices.find(d => d.id === device.id)) {
        devices.push({
          id: device.id,
          name: device.name,
          serialNumber: device.serialNumber,
          model: device.model,
          brand: device.brand,
          type: device.type,
          status: 'ASSIGNED',
          installationDate: device.installationDate 
            ? new Date(device.installationDate).toLocaleDateString('fr-FR') 
            : null,
          configuration: device.configuration
        });
      }
    });

    // Process diagnostic devices
    const diagnosticDevices: any[] = [];
    patient.diagnostics.forEach((diagnostic: any) => {
      if (diagnostic.medicalDevice) {
        diagnosticDevices.push({
          id: diagnostic.id,  
          deviceId: diagnostic.medicalDevice.id,
          deviceName: diagnostic.medicalDevice.name,
          serialNumber: diagnostic.medicalDevice.serialNumber,
          model: diagnostic.medicalDevice.model,
          brand: diagnostic.medicalDevice.brand,
          type: diagnostic.medicalDevice.type,
          diagnosticDate: new Date(diagnostic.diagnosticDate).toLocaleDateString('fr-FR'),
          followUpDate: diagnostic.followUpDate 
            ? new Date(diagnostic.followUpDate).toLocaleDateString('fr-FR') 
            : null,
          status: diagnostic.status,
          notes: diagnostic.notes,
          performedBy: diagnostic.performedBy 
            ? `${diagnostic.performedBy.firstName} ${diagnostic.performedBy.lastName}`
            : null
        });
      }
    });

    return {
      id: patient.id,
      name: `${patient.firstName} ${patient.lastName}`,
      delegation: patient.delegation || 'Non spécifié',
      region: normalizedRegion,
      latitude,
      longitude,
      address: patient.detailedAddress || 'Adresse non spécifiée',
      phone: patient.telephone,
      phoneTwo: patient.telephoneTwo || null,
      cin: patient.cin || null,
      age: age,
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('fr-FR') : null,
      createdAt: new Date(patient.createdAt).toLocaleDateString('fr-FR'),
      lastVisit: patient.appointments[0]?.scheduledDate
        ? new Date(patient.appointments[0].scheduledDate).toLocaleDateString('fr-FR')
        : null,
      lastVisitStatus: patient.appointments[0]?.status || null,
      lastVisitLocation: patient.appointments[0]?.location || null,
      technician: patient.technician 
        ? `${patient.technician.firstName} ${patient.technician.lastName}`
        : null,
      devices: devices,
      hasDevices: devices.length > 0,
      diagnostics: diagnosticDevices,
      hasDiagnostics: diagnosticDevices.length > 0
    };
  });
}

// Helper function to normalize location names for better matching
function normalizeLocationName(name: string | null | undefined): string {
  if (!name) return '';
  
  // Remove extra spaces and convert to lowercase
  let normalized = name.trim().toLowerCase();
  
  // Remove common prefixes/suffixes
  normalized = normalized
    .replace(/gouvernorat\s+(de\s+)?/gi, '')
    .replace(/delegation\s+(de\s+)?/gi, '')
    .replace(/^(la|le|les)\s+/gi, '')
    .replace(/\s+(nord|sud|est|ouest|center|centre)$/gi, '');
  
  // Handle special cases and variations
  const locationVariations: { [key: string]: string } = {
    'ariana': 'Ariana',
    'ariena': 'Ariana',
    'ben arous': 'Ben Arous',
    'benarous': 'Ben Arous',
    'ben-arous': 'Ben Arous',
    'manouba': 'Manouba',
    'manoubaa': 'Manouba',
    'nabeul': 'Nabeul',
    'nabul': 'Nabeul',
    'zaghouan': 'Zaghouan',
    'zaghwan': 'Zaghouan',
    'bizerte': 'Bizerte',
    'bizerta': 'Bizerte',
    'beja': 'Béja',
    'béja': 'Béja',
    'jendouba': 'Jendouba',
    'jandouba': 'Jendouba',
    'kef': 'Le Kef',
    'le kef': 'Le Kef',
    'lekef': 'Le Kef',
    'siliana': 'Siliana',
    'silyana': 'Siliana',
    'sousse': 'Sousse',
    'soussa': 'Sousse',
    'monastir': 'Monastir',
    'mestir': 'Monastir',
    'mahdia': 'Mahdia',
    'mahdeya': 'Mahdia',
    'sfax': 'Sfax',
    'safax': 'Sfax',
    'sfex': 'Sfax',
    'kairouan': 'Kairouan',
    'kairwan': 'Kairouan',
    'kerwan': 'Kairouan',
    'kasserine': 'Kasserine',
    'kasrine': 'Kasserine',
    'qasrine': 'Kasserine',
    'sidi bouzid': 'Sidi Bouzid',
    'sidibouzid': 'Sidi Bouzid',
    'sidi bou zid': 'Sidi Bouzid',
    'gabes': 'Gabès',
    'gabès': 'Gabès',
    'qabis': 'Gabès',
    'medenine': 'Médenine',
    'médenine': 'Médenine',
    'madanin': 'Médenine',
    'tataouine': 'Tataouine',
    'tatooine': 'Tataouine',
    'tatawin': 'Tataouine',
    'gafsa': 'Gafsa',
    'qafsa': 'Gafsa',
    'tozeur': 'Tozeur',
    'touzeur': 'Tozeur',
    'tawzar': 'Tozeur',
    'kebili': 'Kébili',
    'kébili': 'Kébili',
    'qibili': 'Kébili',
    'tunis': 'Tunis',
    'tounes': 'Tunis',
    'tunes': 'Tunis'
  };
  
  return locationVariations[normalized] || name || '';
}

function getRegionCoordinates(region: string | null | undefined): { lat: number; lng: number } | null {
  const coordinates: { [key: string]: { lat: number; lng: number } } = {
    'Tunis': { lat: 36.8065, lng: 10.1815 },
    'Ariana': { lat: 36.8625, lng: 10.1956 },
    'Ben Arous': { lat: 36.7545, lng: 10.2487 },
    'Manouba': { lat: 36.8101, lng: 10.0956 },
    'Nabeul': { lat: 36.4561, lng: 10.7376 },
    'Zaghouan': { lat: 36.4019, lng: 10.1430 },
    'Bizerte': { lat: 37.2746, lng: 9.8739 },
    'Béja': { lat: 36.7255, lng: 9.1817 },
    'Jendouba': { lat: 36.5011, lng: 8.7808 },
    'Le Kef': { lat: 36.1826, lng: 8.7148 },
    'Siliana': { lat: 36.0850, lng: 9.3708 },
    'Sousse': { lat: 35.8288, lng: 10.6405 },
    'Monastir': { lat: 35.7643, lng: 10.8113 },
    'Mahdia': { lat: 35.5047, lng: 11.0622 },
    'Sfax': { lat: 34.7406, lng: 10.7603 },
    'Kairouan': { lat: 35.6781, lng: 10.0963 },
    'Kasserine': { lat: 35.1674, lng: 8.8365 },
    'Sidi Bouzid': { lat: 35.0381, lng: 9.4858 },
    'Gabès': { lat: 33.8815, lng: 10.0982 },
    'Médenine': { lat: 33.3540, lng: 10.5053 },
    'Tataouine': { lat: 32.9297, lng: 10.4518 },
    'Gafsa': { lat: 34.4250, lng: 8.7842 },
    'Tozeur': { lat: 33.9197, lng: 8.1337 },
    'Kébili': { lat: 33.7048, lng: 8.9699 }
  };

  if (!region) return null;
  
  // Try direct match first
  if (coordinates[region]) {
    return coordinates[region];
  }
  
  // Try normalized name
  const normalizedRegion = normalizeLocationName(region);
  return coordinates[normalizedRegion] || null;
}