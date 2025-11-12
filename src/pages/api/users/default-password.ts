import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(req, res, authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Return the default password from environment variable
    const defaultPassword = process.env.DEFAULT_IMPORT_PASSWORD || '12345';

    return res.status(200).json({ defaultPassword });
  } catch (error) {
    console.error('Error fetching default password:', error);
    return res.status(500).json({ error: 'Failed to fetch default password' });
  }
}
