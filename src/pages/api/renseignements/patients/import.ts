import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/db';
import * as XLSX from 'xlsx';
import formidable from 'formidable';
import fs from 'fs/promises';
import { Prisma } from '@prisma/client';

// Helper function to normalize phone numbers
function normalizeTunisianPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.toString().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+216')) return cleaned;
  if (cleaned.startsWith('216')) return '+' + cleaned;
  if (/^[2-9]\d{7}$/.test(cleaned)) return '+216' + cleaned;
  return phone;
}

// Helper function to parse date
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  try {
    // Try different date formats
    // Format: DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr);
    }
    
    // Try default parsing
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the Excel file
    const buffer = await fs.readFile(file.filepath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Process the data
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Create a cache for doctors and technicians
    const doctorCache = new Map<string, string>();
    const technicianCache = new Map<string, string>();

    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];
      
      try {
        // Parse the full name
        const fullName = row['Nom Complet'] || '';
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        if (!firstName) {
          results.failed++;
          results.errors.push(`Ligne ${i + 2}: Nom complet manquant`);
          continue;
        }

        // Find doctor if specified
        let doctorId = null;
        const doctorName = row['Médecin Responsable'];
        if (doctorName) {
          // Check cache first
          if (doctorCache.has(doctorName)) {
            doctorId = doctorCache.get(doctorName);
          } else {
            // Extract just the name part (remove "Dr" prefix if present)
            const cleanDoctorName = doctorName.replace(/^Dr\.?\s*/i, '').trim();
            const [docFirstName, ...docLastNameParts] = cleanDoctorName.split(' ');
            const docLastName = docLastNameParts.join(' ');
            
            const doctor = await prisma.doctor.findFirst({
              where: {
                user: {
                  firstName: {
                    contains: docFirstName,
                    mode: 'insensitive'
                  },
                  lastName: {
                    contains: docLastName,
                    mode: 'insensitive'
                  }
                }
              }
            });
            
            if (doctor) {
              doctorId = doctor.id;
              doctorCache.set(doctorName, doctor.id);
            }
          }
        }

        // Find technician if specified
        let technicianId = null;
        const technicianName = row['Technicien Responsable'];
        if (technicianName) {
          // Check cache first
          if (technicianCache.has(technicianName)) {
            technicianId = technicianCache.get(technicianName);
          } else {
            const [techFirstName, ...techLastNameParts] = technicianName.split(' ');
            const techLastName = techLastNameParts.join(' ');
            
            const technician = await prisma.user.findFirst({
              where: {
                role: 'EMPLOYEE',
                firstName: {
                  contains: techFirstName,
                  mode: 'insensitive'
                },
                lastName: {
                  contains: techLastName,
                  mode: 'insensitive'
                }
              }
            });
            
            if (technician) {
              technicianId = technician.id;
              technicianCache.set(technicianName, technician.id);
            }
          }
        }

        // Normalize phone numbers
        const telephone = row['Téléphone Principal'] ? normalizeTunisianPhone(row['Téléphone Principal'].toString()) : null;
        const telephoneTwo = row['Téléphone Secondaire'] ? normalizeTunisianPhone(row['Téléphone Secondaire'].toString()) : null;

        // Check if patient code is provided and if it already exists
        const patientCode = row['Code Patient'] ? String(row['Code Patient']).trim() : null;
        if (patientCode) {
          const existingPatientByCode = await prisma.patient.findUnique({
            where: { patientCode }
          });

          if (existingPatientByCode) {
            results.failed++;
            results.errors.push(`Ligne ${i + 2}: Un patient avec ce code existe déjà (${patientCode})`);
            continue;
          }
        }

        // Check if patient already exists by phone number
        if (telephone) {
          const existingPatient = await prisma.patient.findFirst({
            where: { telephone }
          });

          if (existingPatient) {
            results.failed++;
            results.errors.push(`Ligne ${i + 2}: Un patient avec ce numéro de téléphone existe déjà (${fullName})`);
            continue;
          }
        }

        // Create patient data
        const patientData: Prisma.PatientCreateInput = {
          patientCode: row['Code Patient'] || null,
          firstName,
          lastName,
          telephone: telephone || '',
          telephoneTwo,
          governorate: row['Gouvernorat'] || null,
          delegation: row['Délégation'] || null,
          detailedAddress: row['Adresse Détaillée'] || null,
          cin: row['CIN'] || null,
          dateOfBirth: parseDate(row['Date de Naissance']),
          cnamId: row['CNAM ID'] || null,
          beneficiaryType: row['Type Bénéficiaire'] || null,
          affiliation: row['Caisse Affiliation'] || null,
          height: row['Taille (cm)'] ? parseFloat(row['Taille (cm)']) : null,
          weight: row['Poids (kg)'] ? parseFloat(row['Poids (kg)']) : null,
          medicalHistory: row['Antécédents'] || null,
          generalNote: row['Note Générale'] || null,
          doctor: doctorId ? { connect: { id: doctorId } } : undefined,
          technician: technicianId ? { connect: { id: technicianId } } : undefined,
          assignedTo: { connect: { id: session.user.id } }
        };

        // Create the patient
        await prisma.patient.create({ data: patientData });
        results.success++;
        
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        results.errors.push(`Ligne ${i + 2}: ${errorMessage}`);
        console.error(`Error importing patient at row ${i + 2}:`, error);
      }
    }

    // Clean up the uploaded file
    await fs.unlink(file.filepath);

    res.status(200).json({
      message: `Import terminé: ${results.success} patients importés, ${results.failed} échecs`,
      results
    });
    
  } catch (error) {
    console.error('Error importing patients:', error);
    res.status(500).json({ error: 'Failed to import patients' });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};