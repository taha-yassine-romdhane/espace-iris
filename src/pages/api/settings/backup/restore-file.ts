import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/db';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if user is admin
  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    const allowedExtensions = ['.json', '.sql'];
    const fileExtension = path.extname(file.originalFilename || '').toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only JSON and SQL backup files are allowed.' 
      });
    }

    // Read file content
    const fileContent = fs.readFileSync(file.filepath, 'utf-8');
    
    if (fileExtension === '.json') {
      // Handle JSON backup restoration
      try {
        const backupData = JSON.parse(fileContent);
        
        // Validate backup structure
        if (!backupData.timestamp) {
          return res.status(400).json({ 
            error: 'Invalid backup file format. Missing timestamp.' 
          });
        }

        // Begin transaction for restoration
        await prisma.$transaction(async (tx) => {
          // Clear existing data (be very careful with this!)
          // Only clear if we have valid backup data
          if (backupData.patients && Array.isArray(backupData.patients)) {
            await tx.patient.deleteMany({});
            
            // Restore patients
            for (const patient of backupData.patients) {
              await tx.patient.create({
                data: {
                  ...patient,
                  createdAt: new Date(patient.createdAt),
                  updatedAt: new Date(patient.updatedAt),
                  dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth) : null,
                }
              });
            }
          }

          if (backupData.companies && Array.isArray(backupData.companies)) {
            await tx.company.deleteMany({});
            
            // Restore companies
            for (const company of backupData.companies) {
              await tx.company.create({
                data: {
                  ...company,
                  createdAt: new Date(company.createdAt),
                  updatedAt: new Date(company.updatedAt),
                }
              });
            }
          }

          if (backupData.medicalDevices && Array.isArray(backupData.medicalDevices)) {
            await tx.medicalDevice.deleteMany({});
            
            // Restore medical devices
            for (const device of backupData.medicalDevices) {
              await tx.medicalDevice.create({
                data: {
                  ...device,
                  createdAt: new Date(device.createdAt),
                  updatedAt: new Date(device.updatedAt),
                }
              });
            }
          }

          // Restore settings if present
          if (backupData.settings) {
            await tx.appSettings.deleteMany({});
            await tx.appSettings.create({
              data: {
                ...backupData.settings,
                createdAt: new Date(backupData.settings.createdAt),
                updatedAt: new Date(backupData.settings.updatedAt),
              }
            });
          }
        });

        // Save backup file for record keeping
        const backupDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `restore-${timestamp}.json`;
        const backupPath = path.join(backupDir, backupFileName);
        fs.copyFileSync(file.filepath, backupPath);

        // Record the restoration in database
        await prisma.databaseBackup.create({
          data: {
            fileName: backupFileName,
            filePath: backupPath,
            fileSize: file.size,
            format: 'json',
            source: 'upload',
            description: `Database restored from uploaded file: ${file.originalFilename}`,
            createdBy: session.user.id,
            restoredAt: new Date()
          }
        });

        return res.status(200).json({
          message: 'Database successfully restored from JSON backup',
          restoredData: {
            patients: backupData.patients?.length || 0,
            companies: backupData.companies?.length || 0,
            medicalDevices: backupData.medicalDevices?.length || 0,
            settings: backupData.settings ? 1 : 0
          }
        });

      } catch (parseError) {
        return res.status(400).json({
          error: 'Invalid JSON backup file',
          details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
        });
      }
    } else if (fileExtension === '.sql') {
      // Handle SQL backup restoration
      return res.status(501).json({
        error: 'SQL backup restoration not yet implemented',
        message: 'Please use JSON backup files for now or restore SQL backups manually'
      });
    }

    return res.status(400).json({ error: 'Unsupported file format' });

  } catch (error) {
    console.error('Error restoring from file:', error);
    return res.status(500).json({
      error: 'Failed to restore database from file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}