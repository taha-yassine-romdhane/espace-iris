import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// API handler for restoring a JSON backup
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get backup ID from URL
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Backup ID is required' });
    }

    // Find the backup record
    let backup;
    
    // Check if it's a filesystem-based backup
    if (id.startsWith('file-')) {
      // Extract filename from the ID
      const fileName = id.replace('file-', '');
      const backupDir = path.join(process.cwd(), 'backups');
      const filePath = path.join(backupDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Backup file not found' });
      }
      
      backup = {
        fileName,
        filePath,
      };
    } else {
      // Get from database
      backup = await prisma.databaseBackup.findUnique({
        where: { id }
      });
      
      if (!backup) {
        return res.status(404).json({ error: 'Backup not found' });
      }
    }

    // Verify it's a JSON backup
    if (!backup.fileName.endsWith('.json')) {
      return res.status(400).json({ error: 'Not a JSON backup' });
    }

    // Read and parse the JSON backup file
    const backupData = JSON.parse(fs.readFileSync(backup.filePath, 'utf-8'));

    // Start a transaction to restore data
    await prisma.$transaction(async (tx) => {
      // Restore patients if they exist in the backup
      if (backupData.patients && Array.isArray(backupData.patients)) {
        // Delete existing patients first (optional, depends on your restore strategy)
        // await tx.patient.deleteMany({});
        
        // Insert patients from backup
        for (const patient of backupData.patients) {
          // Remove id to avoid conflicts
          const { id, ...patientData } = patient;
          
          // Check if patient already exists
          const existingPatient = await tx.patient.findFirst({
            where: { 
              // Use a unique identifier that makes sense for your data model
              // This is just an example - adjust based on your schema
              userId: patientData.userId
            }
          });
          
          if (!existingPatient) {
            // Create new patient
            await tx.patient.create({
              data: {
                ...patientData,
                // Ensure dates are properly formatted
                createdAt: new Date(patientData.createdAt),
                updatedAt: new Date(patientData.updatedAt)
              }
            });
          }
        }
      }

      // Restore companies if they exist in the backup
      if (backupData.companies && Array.isArray(backupData.companies)) {
        for (const company of backupData.companies) {
          const { id, ...companyData } = company;
          
          const existingCompany = await tx.company.findFirst({
            where: { 
              companyName: companyData.companyName 
            }
          });
          
          if (!existingCompany) {
            await tx.company.create({
              data: {
                ...companyData,
                createdAt: new Date(companyData.createdAt),
                updatedAt: new Date(companyData.updatedAt)
              }
            });
          }
        }
      }

      // Restore medical devices if they exist in the backup
      if (backupData.medicalDevices && Array.isArray(backupData.medicalDevices)) {
        for (const device of backupData.medicalDevices) {
          const { id, ...deviceData } = device;
          
          const existingDevice = await tx.medicalDevice.findFirst({
            where: { 
              // Use appropriate unique identifier
              serialNumber: deviceData.serialNumber || ''
            }
          });
          
          if (!existingDevice) {
            await tx.medicalDevice.create({
              data: {
                ...deviceData,
                createdAt: new Date(deviceData.createdAt),
                updatedAt: new Date(deviceData.updatedAt)
              }
            });
          }
        }
      }

      // Restore app settings if they exist in the backup
      if (backupData.settings) {
        const { id, ...settingsData } = backupData.settings;
        
        // Update existing settings or create new ones
        await tx.appSettings.upsert({
          where: { id: '1' }, // Assuming there's only one settings record
          update: {
            ...settingsData,
            updatedAt: new Date()
          },
          create: {
            ...settingsData,
            id: '1', // Provide a default ID if needed
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
    });

    // Update the backup record to mark it as restored
    if (!id.startsWith('file-')) {
      await prisma.databaseBackup.update({
        where: { id },
        data: {
          restoredAt: new Date()
        }
      });
    }

    return res.status(200).json({ success: true, message: 'Backup restored successfully' });
  } catch (error) {
    console.error('Error restoring backup:', error);
    return res.status(500).json({ 
      error: 'Failed to restore backup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
