import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/db';
import fs from 'fs';
import path from 'path';

// Base storage path outside the project
const STORAGE_BASE_PATH = '/home/taha/Desktop/projects/espace-elite-files';
const TEMP_PATH = path.join(STORAGE_BASE_PATH, 'temp');

// Helper function to ensure directory exists
const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tempFiles, patientId, companyId } = req.body;

    if (!tempFiles || !Array.isArray(tempFiles) || tempFiles.length === 0) {
      return res.status(400).json({ error: 'No temporary files to move' });
    }

    if (!patientId && !companyId) {
      return res.status(400).json({ error: 'Either patientId or companyId is required' });
    }

    // Determine storage directory
    const entityType = patientId ? 'patients' : 'companies';
    const entityId = patientId || companyId;
    const entityDir = path.join(STORAGE_BASE_PATH, entityType, entityId);
    
    // Ensure directory exists
    ensureDirectoryExists(entityDir);

    const movedFiles = [];

    for (const tempFile of tempFiles) {
      try {
        // Extract filename from temp URL
        const tempFileName = tempFile.url.split('/').pop();
        const tempFilePath = path.join(TEMP_PATH, tempFileName);

        // Check if temp file exists
        if (!fs.existsSync(tempFilePath)) {
          console.warn(`Temporary file not found: ${tempFilePath}`);
          continue;
        }

        // Move file to permanent location
        const permanentFileName = tempFileName;
        const permanentFilePath = path.join(entityDir, permanentFileName);
        
        // Move the file
        fs.renameSync(tempFilePath, permanentFilePath);

        // Create new URL for permanent location
        const permanentUrl = `/api/files/serve/${entityType}/${entityId}/${permanentFileName}`;

        // Save file metadata to database
        const savedFile = await prisma.file.create({
          data: {
            url: permanentUrl,
            type: tempFile.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
            fileName: tempFile.name,
            fileSize: tempFile.size,
            filePath: permanentFilePath,
            ...(patientId ? { patientId } : { companyId }),
          },
        });

        movedFiles.push({
          id: savedFile.id,
          url: permanentUrl,
          name: tempFile.name,
          type: tempFile.type,
          size: tempFile.size,
          key: tempFile.key,
        });

        console.log(`File moved successfully: ${tempFileName} -> ${permanentFilePath}`);
      } catch (fileError) {
        console.error(`Error moving file:`, fileError);
        // Continue with other files
      }
    }

    console.log(`Successfully moved ${movedFiles.length} files from temp to permanent storage`);
    return res.status(200).json(movedFiles);

  } catch (error) {
    console.error('Error moving temporary files:', error);
    return res.status(500).json({ error: 'Failed to move temporary files' });
  }
}