import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';

// Base storage path outside the project
const STORAGE_BASE_PATH = '/home/taha/Desktop/projects/espace-elite-files';
const TEMP_PATH = path.join(STORAGE_BASE_PATH, 'temp');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileName } = req.query;

  if (!fileName || typeof fileName !== 'string') {
    return res.status(400).json({ error: 'Invalid file name' });
  }

  try {
    // Construct file path
    const filePath = path.join(TEMP_PATH, fileName);

    // Security check: ensure the resolved path is within our temp directory
    const resolvedPath = path.resolve(filePath);
    const resolvedBasePath = path.resolve(TEMP_PATH);
    
    if (!resolvedPath.startsWith(resolvedBasePath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Determine MIME type
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';

    // Set headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour

    // For images, set inline disposition; for documents, set attachment
    if (mimeType.startsWith('image/')) {
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    }

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('File serving error:', error);
    return res.status(500).json({ error: 'Failed to serve file' });
  }
}