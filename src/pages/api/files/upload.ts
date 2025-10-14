import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/db';

// Base storage path outside the project
const STORAGE_BASE_PATH = '/home/taha/Desktop/projects/espace-elite-files';

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
      // Images
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Text files
      'text/plain',
      'text/csv',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé') as any, false);
    }
  },
});

// Helper function to ensure directory exists
const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Helper function to get file extension from mimetype
const getFileExtension = (mimetype: string): string => {
  const extensions: { [key: string]: string } = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/plain': '.txt',
    'text/csv': '.csv',
  };
  return extensions[mimetype] || '.bin';
};

// Promisify multer
const uploadHandler = upload.array('files', 10); // Max 10 files

const runMiddleware = (req: NextApiRequest, res: NextApiResponse, fn: any) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
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
    // Run multer middleware
    await runMiddleware(req, res, uploadHandler);

    const files = (req as any).files as Express.Multer.File[];
    const { patientId, companyId } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
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

    const uploadedFiles = [];

    for (const file of files) {
      try {
        // Generate unique filename
        const fileId = uuidv4();
        const fileExtension = getFileExtension(file.mimetype);
        const fileName = `${fileId}${fileExtension}`;
        const filePath = path.join(entityDir, fileName);

        // Write file to disk
        fs.writeFileSync(filePath, file.buffer);

        // Create relative URL for serving the file
        const fileUrl = `/api/files/serve/${entityType}/${entityId}/${fileName}`;

        // Save file metadata to database
        const savedFile = await prisma.file.create({
          data: {
            url: fileUrl,
            type: file.mimetype.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
            fileName: file.originalname,
            fileSize: file.size,
            filePath: filePath,
            ...(patientId ? { patientId } : { companyId }),
          },
        });

        uploadedFiles.push({
          id: savedFile.id,
          url: fileUrl,
          name: file.originalname,
          type: file.mimetype,
          size: file.size,
          key: fileId,
        });

        console.log(`File uploaded successfully: ${file.originalname} -> ${filePath}`);
      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        // Continue with other files
      }
    }

    if (uploadedFiles.length === 0) {
      return res.status(500).json({ error: 'Failed to upload any files' });
    }

    console.log(`Successfully uploaded ${uploadedFiles.length} files`);
    return res.status(200).json(uploadedFiles);

  } catch (error) {
    console.error('Upload error:', error);
    if (error instanceof Error && error.message === 'Type de fichier non autorisé') {
      return res.status(400).json({ error: 'Type de fichier non autorisé' });
    }
    return res.status(500).json({ error: 'Failed to upload files' });
  }
}

// Disable default body parser for multer
export const config = {
  api: {
    bodyParser: false,
  },
};