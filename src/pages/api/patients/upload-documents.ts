import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import formidable, { File as FormidableFile } from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to parse form data
const parseForm = (req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
  return new Promise((resolve, reject) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'patient-documents');

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      filename: (name, ext, part) => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        return `doc-${timestamp}-${random}${ext}`;
      },
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      // Parse form data
      const { fields, files } = await parseForm(req);

      // Get patient ID
      const patientId = Array.isArray(fields.patientId) ? fields.patientId[0] : fields.patientId;

      if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required' });
      }

      // Check if patient exists
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { files: true },
      });

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Process uploaded files
      const uploadedFiles: { url: string; type: string }[] = [];
      const filesArray = Array.isArray(files.files) ? files.files : files.files ? [files.files] : [];

      for (const file of filesArray) {
        const formFile = file as FormidableFile;
        const fileUrl = `/uploads/patient-documents/${path.basename(formFile.filepath)}`;

        // Determine file type
        let fileType = 'document';
        if (formFile.mimetype?.startsWith('image/')) {
          fileType = 'image';
        } else if (formFile.mimetype === 'application/pdf') {
          fileType = 'pdf';
        }

        uploadedFiles.push({
          url: fileUrl,
          type: fileType,
        });
      }

      // Merge with existing files
      const existingFiles = (patient.files as any) || [];
      const updatedFiles = [...existingFiles, ...uploadedFiles];

      // Update patient with new files
      const updatedPatient = await prisma.patient.update({
        where: { id: patientId },
        data: {
          files: updatedFiles as any,
        },
      });

      return res.status(200).json({
        message: 'Documents uploaded successfully',
        files: uploadedFiles,
        totalFiles: updatedFiles.length,
      });

    } catch (error) {
      console.error('Error uploading documents:', error);
      return res.status(500).json({
        error: 'Failed to upload documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
