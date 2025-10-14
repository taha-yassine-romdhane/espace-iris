import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const locations = await prisma.repairLocation.findMany({
        orderBy: { 
          name: 'asc' 
        },
        include: {
          repairs: {
            select: {
              id: true
            }
          }
        }
      });
      
      return res.status(200).json(locations);
    } catch (error) {
      console.error('Error fetching repair locations:', error);
      return res.status(500).json({ error: 'Failed to fetch repair locations' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, address, type } = req.body;
      const location = await prisma.repairLocation.create({
        data: {
          name,
          address,
          type
        },
      });
      return res.status(201).json(location);
    } catch (error) {
      console.error('Error creating repair location:', error);
      return res.status(500).json({ error: 'Failed to create repair location' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, name, address, type } = req.body;
      const location = await prisma.repairLocation.update({
        where: { id },
        data: {
          name,
          address,
          type
        },
      });
      return res.status(200).json(location);
    } catch (error) {
      console.error('Error updating repair location:', error);
      return res.status(500).json({ error: 'Failed to update repair location' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      
      // First check if this location has any repairs
      const locationWithRepairs = await prisma.repairLocation.findUnique({
        where: { id: String(id) },
        include: { repairs: true }
      });
      
      if (locationWithRepairs?.repairs && locationWithRepairs.repairs.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete location that has associated repairs' 
        });
      }
      
      await prisma.repairLocation.delete({
        where: { id: String(id) },
      });
      
      return res.status(200).json({ message: 'Location deleted successfully' });
    } catch (error) {
      console.error('Error deleting repair location:', error);
      return res.status(500).json({ error: 'Failed to delete repair location' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
