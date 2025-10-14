import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import type { Diagnostic } from '@prisma/client';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { createDiagnosticResultNotification, createDiagnosticCreationNotification } from '@/lib/notifications';
import { generateDiagnosticCode } from '@/utils/idGenerator';

// Enable bodyParser for all methods except POST with multipart/form-data
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const saveFile = async (file: formidable.File): Promise<string> => {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Generate unique filename
  const timestamp = new Date().getTime();
  const newFilename = `${timestamp}-${file.originalFilename}`;
  const newPath = path.join(uploadsDir, newFilename);

  // Copy file to uploads directory
  const data = fs.readFileSync(file.filepath);
  fs.writeFileSync(newPath, data);
  
  // Return relative path for database storage
  return `/uploads/${newFilename}`;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const diagnostics = await prisma.diagnostic.findMany({
        include: {
          medicalDevice: {
            select: {
              id: true,
              name: true,
              brand: true,
              model: true,
              serialNumber: true,
            },
          },
          patient: {
            select: {
              id: true,
              patientCode: true,
              firstName: true,
              lastName: true,
              telephone: true,
              governorate: true,
              delegation: true,
              detailedAddress: true,
              technician: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              supervisor: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              // Include sales and rentals to check business outcome
              sales: {
                where: {
                  status: {
                    in: ['COMPLETED', 'ON_PROGRESS', 'PENDING']
                  }
                },
                select: {
                  id: true,
                  saleDate: true,
                  status: true,
                  totalAmount: true,
                },
                orderBy: {
                  saleDate: 'asc'
                }
              },
              rentals: {
                where: {
                  status: {
                    in: ['ACTIVE', 'PENDING', 'COMPLETED']
                  }
                },
                select: {
                  id: true,
                  startDate: true,
                  status: true,
                },
                orderBy: {
                  startDate: 'asc'
                }
              },
            },
          },
          Company: {
            select: {
              id: true,
              companyName: true,
              telephone: true,
            },
          },
          performedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          // Include diagnostic result with the new model
          result: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      // Transform the data to make it easier to use in the frontend
      const transformedDiagnostics = diagnostics.map(diagnostic => {
        // Format patient information
        const patientName = diagnostic.patient ? 
          `${diagnostic.patient.firstName} ${diagnostic.patient.lastName}`.trim() : 'N/A';
          
        // Format device information
        const deviceName = `${diagnostic.medicalDevice.name} ${diagnostic.medicalDevice.brand || ''} ${diagnostic.medicalDevice.model || ''}`.trim();
        
        // Determine business outcome (Appareillé ou Non-Appareillé)
        const hasSale = diagnostic.patient?.sales && diagnostic.patient.sales.length > 0;
        const hasRental = diagnostic.patient?.rentals && diagnostic.patient.rentals.length > 0;
        const needsEquipment = diagnostic.result?.iah && diagnostic.result.iah > 15; // IAH > 15 needs equipment
        
        let businessOutcome = 'DIAGNOSTIC_ONLY'; // Just diagnostic, no equipment needed
        if (hasSale || hasRental) {
          businessOutcome = 'APPAREILLE'; // Patient has equipment (sale or rental)
        } else if (needsEquipment) {
          businessOutcome = 'EN_ATTENTE'; // Needs equipment but not yet equipped
        } else if (diagnostic.result?.iah && diagnostic.result.iah <= 15) {
          businessOutcome = 'NON_APPAREILLE'; // Doesn't need equipment (IAH too low)
        }
         
        // Format user information
        const performedBy = diagnostic.performedBy ? 
          `${diagnostic.performedBy.firstName} ${diagnostic.performedBy.lastName}`.trim() : 
          'N/A';

        // Calculate days since first equipment installation
        let daysSinceFirstEquipment = null;
        let firstEquipmentDate = null;
        
        if (hasSale || hasRental) {
          const firstSaleDate = diagnostic.patient?.sales?.[0]?.saleDate;
          const firstRentalDate = diagnostic.patient?.rentals?.[0]?.startDate;
          
          // Find the earliest date between first sale and first rental
          if (firstSaleDate && firstRentalDate) {
            firstEquipmentDate = new Date(firstSaleDate) < new Date(firstRentalDate) 
              ? new Date(firstSaleDate) 
              : new Date(firstRentalDate);
          } else if (firstSaleDate) {
            firstEquipmentDate = new Date(firstSaleDate);
          } else if (firstRentalDate) {
            firstEquipmentDate = new Date(firstRentalDate);
          }
          
          if (firstEquipmentDate) {
            const now = new Date();
            const timeDiff = now.getTime() - firstEquipmentDate.getTime();
            daysSinceFirstEquipment = Math.floor(timeDiff / (1000 * 3600 * 24));
          }
        }

        return {
          id: diagnostic.id,
          diagnosticCode: diagnostic.diagnosticCode,
          deviceName,
          patientName,
          companyName: 'N/A',
          date: diagnostic.diagnosticDate,
          followUpDate: diagnostic.followUpDate,
          followUpRequired: diagnostic.followUpRequired,
          notes: diagnostic.notes,
          performedBy,
          result: diagnostic.result,
          status: diagnostic.result?.status || 'PENDING',
          patient: diagnostic.patient,
          medicalDevice: diagnostic.medicalDevice,
          // Add business outcome data
          businessOutcome,
          hasSale,
          hasRental,
          needsEquipment,
          latestSale: diagnostic.patient?.sales?.[0] || null,
          latestRental: diagnostic.patient?.rentals?.[0] || null,
          // Add equipment installation tracking
          daysSinceFirstEquipment,
          firstEquipmentDate,
        };
      });

      return res.status(200).json({ diagnostics: transformedDiagnostics });
    }

    if (req.method === 'POST') {
      try {
        let clientId = '';
        let products = [];
        let followUpDate = null;
        let notes = '';
        let totalPrice = 0;
        let medicalDeviceId = '';
        let uploadedFileUrls = [];
        
        // Handle regular JSON data
        const data = req.body;
        clientId = data.clientId || '';
        products = data.products || [];
        medicalDeviceId = data.medicalDeviceId || '';
        followUpDate = data.followUpDate ? new Date(data.followUpDate) : null;
        notes = data.notes || '';
        totalPrice = data.totalPrice || 0;
        uploadedFileUrls = data.fileUrls || [];
        
        // Validate required fields
        if (!clientId) {
          return res.status(400).json({ error: 'Patient ID is required' });
        }
        
        if (!medicalDeviceId) {
          return res.status(400).json({ error: 'Medical device ID is required' });
        }
        
        // Get user ID from session
        const userId = session.user.id;
        if (!userId) {
          return res.status(400).json({ error: 'User ID is required' });
        }
        
        // Verify this is a patient and get patient details
        const patient = await prisma.patient.findUnique({
          where: { id: clientId },
          select: { id: true, firstName: true, lastName: true }
        });
        
        if (!patient) {
          return res.status(400).json({ error: 'Patient not found' });
        }
        
        // Prepare diagnostic data
        const diagnosticData = {
          medicalDevice: { 
            connect: { id: medicalDeviceId }
          },
          diagnosticDate: new Date(),
          notes: notes,
          followUpDate: followUpDate,
          followUpRequired: followUpDate ? true : false,
          performedBy: { connect: { id: userId } },
          patient: { connect: { id: clientId } }
        };
        
        // Generate diagnostic code
        const diagnosticCode = await generateDiagnosticCode(prisma);
        
        // Create the diagnostic record
        const diagnostic = await prisma.diagnostic.create({
          data: {
            ...diagnosticData,
            diagnosticCode
          }
        });
        
        // Create diagnostic result
        await prisma.diagnosticResult.create({
          data: {
            iah: null,
            idValue: null,
            remarque: null,
            status: 'PENDING',
            diagnostic: { connect: { id: diagnostic.id } },
          },
        });
        
        // Create patient history record
        await prisma.patientHistory.create({
          data: {
            patient: {
              connect: { id: clientId }
            },
            actionType: 'DIAGNOSTIC',
            details: {
              diagnosticId: diagnostic.id,
              deviceId: medicalDeviceId,
              deviceName: products[0]?.name || 'Unknown device',
              notes: notes,
              followUpDate: followUpDate,
              followUpRequired: followUpDate ? true : false
            },
            relatedItemId: diagnostic.id,
            relatedItemType: 'diagnostic',
            performedBy: {
              connect: { id: userId }
            }
          }
        });
        
        // Update device status to RESERVED
        await prisma.medicalDevice.update({
          where: { id: medicalDeviceId },
          data: { 
            status: 'RESERVED'
          }
        });
        
        // Get device details
        const device = await prisma.medicalDevice.findUnique({
          where: { id: medicalDeviceId },
          select: { name: true }
        });

        // Create notification for diagnostic creation (shows immediately)
        await createDiagnosticCreationNotification(
          medicalDeviceId,
          device?.name || 'Unknown Device',
          clientId,
          `${patient.firstName} ${patient.lastName}`,
          diagnostic.id,
          userId
        );

        // Create notification for diagnostic result (shows on due date)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3); // Due in 3 days
        
        await createDiagnosticResultNotification(
          medicalDeviceId,
          device?.name || 'Unknown Device',
          clientId,
          `${patient.firstName} ${patient.lastName}`,
          diagnostic.id, // Use diagnostic ID as parameter ID
          'Résultat de diagnostic',
          userId,
          dueDate
        );
        
        // Link any uploaded files to the patient and diagnostic
        if (uploadedFileUrls.length > 0) {
          await Promise.all(uploadedFileUrls.map(async (fileUrl: string) => {
            // Create file record linked to patient and diagnostic
            await prisma.file.create({
              data: {
                url: fileUrl,
                type: 'DIAGNOSTIC_DOCUMENT',
                patient: { connect: { id: clientId } },
              }
            });
          }));
        }
        
        // Create a task for follow-up if required
        if (followUpDate) {
          try {
            await prisma.task.create({
              data: {
                title: `Suivi diagnostic - ${patient.firstName} ${patient.lastName}`,
                description: `Suivi requis pour le diagnostic de ${patient.firstName} ${patient.lastName} créé le ${new Date().toLocaleDateString('fr-FR')}`,
                status: 'TODO',
                priority: 'MEDIUM',
                startDate: followUpDate, // Changed to show on follow-up date
                endDate: followUpDate,
                assignedTo: { connect: { id: userId } },
                diagnostic: { connect: { id: diagnostic.id } },
              }
            });
          } catch (error) {
            console.error('Error creating follow-up task:', error);
          }
        }
        
        return res.status(201).json({ 
          success: true, 
          message: 'Diagnostic created successfully',
          diagnosticId: diagnostic.id
        });
      } catch (error) {
        console.error('Error creating diagnostic:', error);
        return res.status(500).json({
          success: false,
          message: `Error creating diagnostic: ${error}`,
        });
      }
    }

    if (req.method === 'PUT') {
      try {
        const { id, ...data } = req.body;

        const diagnostic = await prisma.diagnostic.update({
          where: { id },
          data: {
            ...data,
            diagnosticDate: new Date(data.diagnosticDate),
          }
        });

        return res.status(200).json(diagnostic);
      } catch (error) {
        console.error('Error updating diagnostic:', error);
        return res.status(500).json({ error: 'Error updating diagnostic' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const { id } = req.query;
        const diagnosticId = String(id);
        
        // First, find the diagnostic to get the associated device ID and related records
        const diagnostic = await prisma.diagnostic.findUnique({
          where: { id: diagnosticId },
          include: {
            result: true,
            Task: true
          }
        });
        
        if (!diagnostic) {
          return res.status(404).json({ error: 'Diagnostic not found' });
        }
        
        // Begin transaction to ensure all operations succeed or fail together
        await prisma.$transaction(async (tx) => {
          // 1. Delete related DiagnosticResult if exists
          if (diagnostic.result) {
            await tx.diagnosticResult.delete({
              where: { diagnosticId: diagnosticId }
            });
          }
          
          // 2. Delete related Tasks
          if (diagnostic.Task && diagnostic.Task.length > 0) {
            await tx.task.deleteMany({
              where: { diagnosticId: diagnosticId }
            });
          }
          
          // 3. Reset the device status to ACTIVE and clear the reservedUntil date
          if (diagnostic.medicalDeviceId) {
            await tx.medicalDevice.update({
              where: { id: diagnostic.medicalDeviceId },
              data: { 
                status: 'ACTIVE',
                reservedUntil: null // Clear the reservation date
              }
            });
          }
          
          // 4. Finally, delete the diagnostic record
          await tx.diagnostic.delete({
            where: { id: diagnosticId }
          });
        });
        
        return res.status(200).json({ message: 'Diagnostic deleted successfully and device status reset to ACTIVE' });
      } catch (error) {
        console.error('Error deleting diagnostic:', error);
        return res.status(500).json({ 
          error: 'Error deleting diagnostic', 
          details: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
