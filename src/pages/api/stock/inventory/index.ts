import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/db';
import { ProductType } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { locationId, search, page = '1', limit = '10', productType } = req.query;
      
      // Parse pagination parameters
      const pageNumber = parseInt(page as string, 10) || 1;
      const itemsPerPage = parseInt(limit as string, 10) || 10;
      const skip = (pageNumber - 1) * itemsPerPage;
      
      // Create search conditions for product relation
      const searchCondition = search ? {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' as const } },
          { brand: { contains: search as string, mode: 'insensitive' as const } },
          { model: { contains: search as string, mode: 'insensitive' as const } },
        ]
      } : {};
      
      // Create search conditions for medical devices
      const deviceSearchCondition = search ? {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' as const } },
          { brand: { contains: search as string, mode: 'insensitive' as const } },
          { model: { contains: search as string, mode: 'insensitive' as const } },
        ]
      } : {};
      
      // Create location filter condition
      const locationCondition = locationId ? { stockLocationId: locationId as string } : {};
      
      // Create product type filter condition
      const productTypeCondition = productType ? { type: productType as string } : {};
      
      // 1. Get regular inventory items (accessories and spare parts)
      const stocksPromise = prisma.stock.findMany({
        where: {
          ...(locationId ? { locationId: locationId as string } : {}),
          product: {
            AND: [
              searchCondition,
              ...(productType ? [{ type: productType as ProductType }] : [])
            ]
          }
        },
        include: {
          location: {
            select: {
              id: true,
              name: true,
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              model: true,
              brand: true,
              type: true,
            }
          }
        },
        orderBy: [
          { location: { name: 'asc' } },
          { product: { name: 'asc' } }
        ]
      });
      
      // 2. Get medical devices with patient information for RESERVED devices
      // Exclude SOLD devices as they cannot be transferred
      const medicalDevicesPromise = prisma.medicalDevice.findMany({
        where: {
          ...locationCondition,
          ...deviceSearchCondition,
          ...productTypeCondition,
          // Exclude SOLD devices from transfers
          status: {
            not: 'SOLD'
          },
          // If productType is specified, only include matching devices
          ...(productType ? 
              productType === 'DIAGNOSTIC_DEVICE' ? 
                { type: 'DIAGNOSTIC_DEVICE' } : 
                { type: { not: 'DIAGNOSTIC_DEVICE' } }
              : {})
        },
        include: {
          stockLocation: {
            select: {
              id: true,
              name: true
            }
          },
          // Include diagnostic information to find the patient
          Diagnostic: {
            where: {
              // Only include active diagnostics
              followUpRequired: true
            },
            select: {
              id: true,
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  telephone: true
                }
              },
              Company: {
                select: {
                  id: true,
                  companyName: true,
                  telephone: true
                }
              },
              diagnosticDate: true,
              followUpDate: true
            },
            orderBy: {
              diagnosticDate: 'desc'
            },
            take: 1 // Get the most recent diagnostic
          }
        },
        orderBy: [
          { name: 'asc' }
        ]
      });
      
      // 3. Execute both queries in parallel
      const [stocks, medicalDevices] = await Promise.all([stocksPromise, medicalDevicesPromise]);
      
      
      // 4. Transform medical devices to match the stock format and include patient information
      const medicalDeviceItems = medicalDevices.map(device => {
        // Get the most recent diagnostic for this device (if any)
        const latestDiagnostic = device.Diagnostic && device.Diagnostic.length > 0 ? device.Diagnostic[0] : null;
        
        // Determine if the device is reserved and who it's reserved for
        const isReserved = device.status === 'RESERVED';
        const reservedFor = isReserved && latestDiagnostic ? {
          id: latestDiagnostic.patient?.id || latestDiagnostic.Company?.id || '',
          name: latestDiagnostic.patient 
            ? `${latestDiagnostic.patient.firstName} ${latestDiagnostic.patient.lastName}` 
            : latestDiagnostic.Company?.companyName || '',
          telephone: latestDiagnostic.patient?.telephone || latestDiagnostic.Company?.telephone || '',
          isCompany: !!latestDiagnostic.Company,
          diagnosticId: latestDiagnostic.id,
          diagnosticDate: latestDiagnostic.diagnosticDate,
          resultDueDate: latestDiagnostic.followUpDate
        } : null;

        return {
          id: device.id,
          quantity: 1, // Medical devices are tracked individually
          status: device.status || 'ACTIVE',
          location: {
            id: device.stockLocationId || '',
            name: device.stockLocation ? device.stockLocation.name : 'Non assigné'
          },
          product: {
            id: device.id,
            name: device.name,
            brand: device.brand || '',
            model: device.model || '',
            type: device.type === 'DIAGNOSTIC_DEVICE' ? 'DIAGNOSTIC_DEVICE' : 'MEDICAL_DEVICE',
            originalType: device.type, // Keep original type for reference
            serialNumber: device.serialNumber
          },
          isDevice: true, // Flag to identify this as a device, not regular stock
          reservedFor: reservedFor // Add reservation information
        };
      });
      
      // 5. Combine all items
      const allItems = [
        ...stocks,
        ...medicalDeviceItems
      ];
      
      // 6. Calculate totals for summary
      const summary = {
        total: allItems.length,
        accessories: stocks.filter(item => item.product.type === 'ACCESSORY')
          .reduce((sum, item) => sum + item.quantity, 0),
        spareParts: stocks.filter(item => item.product.type === 'SPARE_PART')
          .reduce((sum, item) => sum + item.quantity, 0),
        medicalDevices: medicalDevices.filter(device => device.type !== 'DIAGNOSTIC_DEVICE').length,
        diagnosticDevices: medicalDevices.filter(device => device.type === 'DIAGNOSTIC_DEVICE').length
      };
      
      // 7. Apply pagination
      const paginatedItems = allItems
        .sort((a, b) => a.location.name.localeCompare(b.location.name) || 
                         a.product.name.localeCompare(b.product.name))
        .slice(skip, skip + itemsPerPage);
      


      // 8. Return paginated results with metadata
      return res.status(200).json({
        items: paginatedItems,
        pagination: {
          total: allItems.length,
          page: pageNumber,
          limit: itemsPerPage,
          totalPages: Math.ceil(allItems.length / itemsPerPage)
        },
        summary
      });
    } catch (error) {
      console.error('Error fetching stock:', error);
      return res.status(500).json({ error: 'Failed to fetch stock' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
