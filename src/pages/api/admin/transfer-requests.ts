import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow admin access
  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }

  if (req.method === 'GET') {
    try {
      const { status, urgency, search, page = '1', limit = '50' } = req.query;
      
      // Parse pagination parameters
      const pageNumber = parseInt(page as string, 10) || 1;
      const itemsPerPage = parseInt(limit as string, 10) || 50;
      const skip = (pageNumber - 1) * itemsPerPage;
      
      // Build where condition for filtering transfer requests
      const whereCondition: any = {};

      if (status && status !== 'all') {
        whereCondition.status = status;
      }

      if (urgency && urgency !== 'all') {
        whereCondition.urgency = urgency;
      }

      if (search) {
        whereCondition.OR = [
          {
            product: {
              name: { contains: search as string, mode: 'insensitive' }
            }
          },
          {
            product: {
              brand: { contains: search as string, mode: 'insensitive' }
            }
          },
          {
            product: {
              model: { contains: search as string, mode: 'insensitive' }
            }
          },
          {
            medicalDevice: {
              name: { contains: search as string, mode: 'insensitive' }
            }
          },
          {
            medicalDevice: {
              brand: { contains: search as string, mode: 'insensitive' }
            }
          },
          {
            medicalDevice: {
              model: { contains: search as string, mode: 'insensitive' }
            }
          },
          {
            reason: { contains: search as string, mode: 'insensitive' }
          }
        ];
      }
      
      // Get transfer requests (admin sees all)
      const transferRequests = await prisma.stockTransferRequest.findMany({
        where: whereCondition,
        include: {
          fromLocation: {
            select: {
              id: true,
              name: true
            }
          },
          toLocation: {
            select: {
              id: true,
              name: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              model: true,
              type: true
            }
          },
          medicalDevice: {
            select: {
              id: true,
              name: true,
              brand: true,
              model: true,
              type: true
            }
          },
          requestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          reviewedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: [
          { status: 'asc' }, // Pending first
          { createdAt: 'desc' }
        ],
        skip,
        take: itemsPerPage
      });

      // Get total count for pagination
      const totalCount = await prisma.stockTransferRequest.count({
        where: whereCondition
      });

      // Get summary statistics
      const summary = await prisma.stockTransferRequest.groupBy({
        by: ['status'],
        _count: {
          status: true
        }
      });

      // Transform summary to expected format
      const summaryData = {
        total: totalCount,
        pending: summary.find(s => s.status === 'PENDING')?._count.status || 0,
        approved: summary.find(s => s.status === 'APPROVED')?._count.status || 0,
        rejected: summary.find(s => s.status === 'REJECTED')?._count.status || 0,
        completed: summary.find(s => s.status === 'COMPLETED')?._count.status || 0
      };

      return res.status(200).json({
        items: transferRequests,
        pagination: {
          total: totalCount,
          page: pageNumber,
          limit: itemsPerPage,
          totalPages: Math.ceil(totalCount / itemsPerPage)
        },
        summary: summaryData
      });
    } catch (error) {
      console.error('Error fetching admin transfer requests:', error);
      return res.status(500).json({ error: 'Failed to fetch transfer requests' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}