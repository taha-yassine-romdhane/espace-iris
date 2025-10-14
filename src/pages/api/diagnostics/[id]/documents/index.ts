import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const diagnosticId = String(id);

  // Verify the diagnostic exists
  const diagnostic = await prisma.diagnostic.findUnique({
    where: { id: diagnosticId },
    include: { patient: true }
  });

  if (!diagnostic) {
    return res.status(404).json({ error: 'Diagnostic not found' });
  }

  // GET - Retrieve documents for this diagnostic
  if (req.method === 'GET') {
    try {
      const files = await prisma.file.findMany({
        where: {
          type: 'DIAGNOSTIC_DOCUMENT',
          patientId: diagnostic.patientId,
          // We don't have a direct relation to diagnostic in the File model,
          // so we'll use metadata to filter
          OR: [
            { url: { contains: diagnosticId } }, // Simple heuristic to find files related to this diagnostic
            { type: { contains: `DIAGNOSTIC_${diagnosticId}` } } // Alternative way to identify diagnostic files
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json({ files });
    } catch (error) {
      console.error('Error fetching diagnostic documents:', error);
      return res.status(500).json({ error: 'Error fetching diagnostic documents' });
    }
  }

  // POST - Add a new document to this diagnostic
  if (req.method === 'POST') {
    try {
      const { fileUrl, fileName, fileType, fileSize } = req.body;

      if (!fileUrl) {
        return res.status(400).json({ error: 'File URL is required' });
      }

      // Create a new file record
      const file = await prisma.file.create({
        data: {
          url: fileUrl,
          type: `DIAGNOSTIC_DOCUMENT_${diagnosticId}`, // Tag with diagnostic ID for easier querying
          patientId: diagnostic.patientId, // Link to patient
          // We don't have a direct relation to diagnostic in the File model
        }
      });

      return res.status(201).json({ file });
    } catch (error) {
      console.error('Error adding diagnostic document:', error);
      return res.status(500).json({ error: 'Error adding diagnostic document' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
