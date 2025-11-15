import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set headers to prevent caching
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Vous devez être connecté pour accéder à cette ressource' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID de diagnostic invalide' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getDiagnostic(req, res, id, session);
    case 'PUT':
      return updateDiagnostic(req, res, id, session);
    case 'DELETE':
      return deleteDiagnostic(req, res, id, session);
    default:
      return res.status(405).json({ error: 'Méthode non autorisée' });
  }
}

// Define extended diagnostic type to match what we're using
type ExtendedDiagnostic = any; // This is a temporary solution; ideally we would define the full type

// GET: Fetch a diagnostic by ID with all related information
async function getDiagnostic(req: NextApiRequest, res: NextApiResponse, id: string, session: any) {
  try {
    // Get the diagnostic with all related information including the new DiagnosticResult model
    const diagnostic = await prisma.diagnostic.findUnique({
      where: { id },
      include: {
        patient: true,
        medicalDevice: true,
        performedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        // Include the new DiagnosticResult instead of parameterValues
        result: true,
        // Include tasks related to this diagnostic
        Task: true,
      },
    });

    if (!diagnostic) {
      return res.status(404).json({ error: 'Diagnostic non trouvé' });
    }

    // Check if the user has permission to access this diagnostic
    const userId = session.user.id;
    const userRole = session.user.role;

    if (userRole !== 'ADMIN' && diagnostic.performedById !== userId) {
      return res.status(403).json({ error: 'Vous n\'avez pas la permission d\'accéder à ce diagnostic' });
    }

    // Fetch related files/documents for this diagnostic
    const files = await prisma.file.findMany({
      where: {
        patientId: diagnostic.patientId,
        type: { contains: `DIAGNOSTIC_DOCUMENT_${id}` }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${files.length} documents for diagnostic ${id}:`, 
      files.map(f => ({ id: f.id, url: f.url, type: f.type })));
    
    // Cast diagnostic to any to avoid TypeScript errors with potentially missing fields
    // This is a temporary solution until we can update the Prisma schema or types
    const typedDiagnostic = diagnostic as ExtendedDiagnostic;
    
    // Add debug information about the diagnostic result
    const diagnosticWithDebug = {
      ...diagnostic,
      documents: files, // Add the documents to the response
      _debug: {
        hasResult: !!typedDiagnostic.result,
        resultStatus: typedDiagnostic.result?.status || 'NO_RESULT',
        followUpRequired: typedDiagnostic.followUpRequired,
        followUpDate: typedDiagnostic.followUpDate,
        taskCount: typedDiagnostic.Task?.length || 0,
        documentCount: files.length
      }
    };
    
    console.log('Returning diagnostic with result:', {
      id: typedDiagnostic.id,
      hasResult: !!typedDiagnostic.result,
      resultStatus: typedDiagnostic.result?.status || 'NO_RESULT',
      iah: typedDiagnostic.result?.iah,
      idValue: typedDiagnostic.result?.idValue,
      remarque: typedDiagnostic.result?.remarque,
      documentCount: files.length
    });
    
    // Return the diagnostic data with debug info
    return res.status(200).json(diagnosticWithDebug);
  } catch (error) {
    console.error('Error fetching diagnostic:', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de la récupération du diagnostic' });
  }
}

// PUT: Update a diagnostic and its result
async function updateDiagnostic(req: NextApiRequest, res: NextApiResponse, id: string, session: any) {
  try {
    // Check user permissions
    const userRole = session.user.role;
    const userId = session.user.id;

    // Find the diagnostic first to check permissions and get device info
    const existingDiagnostic = await prisma.diagnostic.findUnique({
      where: { id },
      select: {
        performedById: true,
        medicalDeviceId: true,
        status: true
      }
    });

    if (!existingDiagnostic) {
      return res.status(404).json({ error: 'Diagnostic non trouvé' });
    }

    // Only allow admins or the user who performed the diagnostic to update it
    if (userRole !== 'ADMIN' && existingDiagnostic.performedById !== userId) {
      return res.status(403).json({ error: 'Vous n\'avez pas la permission de modifier ce diagnostic' });
    }

    const {
      notes,
      followUpRequired,
      followUpDate,
      result,
      status,
      medicalDeviceId,
      patientId,
      diagnosticDate,
      performedById
    } = req.body;

    // Prepare update data
    const updateData: any = {
      notes,
      followUpRequired: followUpRequired ?? false,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
    };

    // Handle status update
    if (status) {
      updateData.status = status;
    }

    // Handle diagnostic date update
    if (diagnosticDate) {
      updateData.diagnosticDate = new Date(diagnosticDate);
    }

    // Handle medicalDevice change
    if (medicalDeviceId && medicalDeviceId !== existingDiagnostic.medicalDeviceId) {
      // Release the old device (set back to ACTIVE)
      if (existingDiagnostic.medicalDeviceId) {
        await prisma.medicalDevice.update({
          where: { id: existingDiagnostic.medicalDeviceId },
          data: { status: 'ACTIVE' }
        });
      }
      // Reserve the new device
      await prisma.medicalDevice.update({
        where: { id: medicalDeviceId },
        data: { status: 'RESERVED' }
      });
      updateData.medicalDevice = { connect: { id: medicalDeviceId } };
    }

    // Handle patient change
    if (patientId) {
      updateData.patient = { connect: { id: patientId } };
    }

    // Handle performedBy change
    if (performedById) {
      updateData.performedBy = { connect: { id: performedById } };
    }

    // Handle device status based on diagnostic status changes
    if (status && existingDiagnostic.status !== status) {
      const deviceId = medicalDeviceId || existingDiagnostic.medicalDeviceId;

      if (deviceId) {
        // When diagnostic is COMPLETED or CANCELLED, release the device
        if (status === 'COMPLETED' || status === 'CANCELLED') {
          await prisma.medicalDevice.update({
            where: { id: deviceId },
            data: { status: 'ACTIVE' }
          });
          console.log(`Device ${deviceId} status set to ACTIVE (diagnostic ${status})`);
        }
        // When diagnostic is back to PENDING, reserve the device again
        else if (status === 'PENDING' && existingDiagnostic.status !== 'PENDING') {
          await prisma.medicalDevice.update({
            where: { id: deviceId },
            data: { status: 'RESERVED' }
          });
          console.log(`Device ${deviceId} status set to RESERVED (diagnostic PENDING)`);
        }
      }
    }

    // Update or create the diagnostic result if provided
    if (result) {
      updateData.result = {
        upsert: {
          create: {
            iah: result.iah,
            idValue: result.idValue,
            remarque: result.remarque,
            status: result.status
          },
          update: {
            iah: result.iah,
            idValue: result.idValue,
            remarque: result.remarque,
            status: result.status
          }
        }
      };
    }

    // Update the diagnostic
    const updatedDiagnostic = await prisma.diagnostic.update({
      where: { id },
      data: updateData,
      include: {
        result: true,
        patient: true,
        medicalDevice: true,
        performedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      }
    });

    return res.status(200).json(updatedDiagnostic);
  } catch (error) {
    console.error('Error updating diagnostic:', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de la mise à jour du diagnostic' });
  }
}

// DELETE: Delete a diagnostic and its associated result
async function deleteDiagnostic(req: NextApiRequest, res: NextApiResponse, id: string, session: any) {
  try {
    // Only admins can delete diagnostics
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Seuls les administrateurs peuvent supprimer des diagnostics' });
    }

    // Get diagnostic info before deleting to release the device
    const diagnostic = await prisma.diagnostic.findUnique({
      where: { id },
      select: { medicalDeviceId: true }
    });

    if (!diagnostic) {
      return res.status(404).json({ error: 'Diagnostic non trouvé' });
    }

    // First delete the associated diagnostic result if it exists
    await prisma.diagnosticResult.deleteMany({
      where: { diagnosticId: id }
    });

    // Delete the diagnostic
    await prisma.diagnostic.delete({
      where: { id }
    });

    // Release the medical device (set back to ACTIVE)
    if (diagnostic.medicalDeviceId) {
      await prisma.medicalDevice.update({
        where: { id: diagnostic.medicalDeviceId },
        data: { status: 'ACTIVE' }
      });
      console.log(`Device ${diagnostic.medicalDeviceId} status set to ACTIVE (diagnostic deleted)`);
    }

    return res.status(200).json({ message: 'Diagnostic supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting diagnostic:', error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de la suppression du diagnostic' });
  }
}
