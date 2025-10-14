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

  const { id, documentId } = req.query;
  const diagnosticId = String(id);
  const fileId = String(documentId);

  // Verify the diagnostic exists
  const diagnostic = await prisma.diagnostic.findUnique({
    where: { id: diagnosticId }
  });

  if (!diagnostic) {
    return res.status(404).json({ error: 'Diagnostic not found' });
  }

  // Verify the file exists
  const file = await prisma.file.findUnique({
    where: { id: fileId }
  });

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  // DELETE - Delete a document
  if (req.method === 'DELETE') {
    try {
      await prisma.file.delete({
        where: { id: fileId }
      });

      return res.status(200).json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Error deleting document:', error);
      return res.status(500).json({ error: 'Error deleting document' });
    }
  }

  // GET - Download a document
  if (req.method === 'GET') {
    try {
      // Just redirect to the file URL for download
      return res.redirect(file.url);
    } catch (error) {
      console.error('Error downloading document:', error);
      return res.status(500).json({ error: 'Error downloading document' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
