import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';

// Base storage path outside the project
const STORAGE_BASE_PATH = '/home/taha/Desktop/projects/espace-elite-files';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { path: requestPath } = req.query;

  if (!requestPath || !Array.isArray(requestPath) || requestPath.length < 3) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  try {
    // Extract path components: [entityType, entityId, fileName]
    const [entityType, entityId, fileName] = requestPath;

    // Validate entity type
    if (entityType !== 'patients' && entityType !== 'companies') {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    // Construct file path
    const filePath = path.join(STORAGE_BASE_PATH, entityType, entityId, fileName);

    // Security check: ensure the resolved path is within our storage directory
    const resolvedPath = path.resolve(filePath);
    const resolvedBasePath = path.resolve(STORAGE_BASE_PATH);
    
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
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

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