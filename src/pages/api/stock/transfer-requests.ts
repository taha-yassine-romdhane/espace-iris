import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';
import { generateTransferCode } from '@/utils/idGenerator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { status, urgency, search, page = '1', limit = '10' } = req.query;
      
      // Parse pagination parameters
      const pageNumber = parseInt(page as string, 10) || 1;
      const itemsPerPage = parseInt(limit as string, 10) || 10;
      const skip = (pageNumber - 1) * itemsPerPage;
      
      // Get the user's information
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          stockLocation: true
        }
      });

      if (!user) {
        return res.status(404).json({ 
          error: 'User not found'
        });
      }

      // Build where condition based on user role
      let whereCondition: any = {};
      
      if (user.role === 'ADMIN') {
        // Admin can see all transfer requests
        whereCondition = {};
      } else if (user.role === 'EMPLOYEE') {
        // Employee can only see requests they created or requests to their location
        if (!user.stockLocation) {
          return res.status(404).json({ 
            error: 'No stock location assigned',
            message: 'User does not have an assigned stock location'
          });
        }
        whereCondition = {
          OR: [
            { requestedById: user.id },
            { toLocationId: user.stockLocation.id }
          ]
        };
      } else {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

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
      
      // Get transfer requests
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
      const summaryWhereCondition = user.role === 'ADMIN' 
        ? {} 
        : user.stockLocation 
        ? { toLocationId: user.stockLocation.id }
        : { id: 'non-existent-id' }; // This will match no records
      
      const summary = await prisma.stockTransferRequest.groupBy({
        by: ['status'],
        where: summaryWhereCondition,
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
      console.error('Error fetching transfer requests:', error);
      return res.status(500).json({ error: 'Failed to fetch transfer requests' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { fromLocationId, productId, requestedQuantity, reason, urgency } = req.body;

      // Validate required fields
      if (!fromLocationId || !productId || !requestedQuantity || !reason || !urgency) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['fromLocationId', 'productId', 'requestedQuantity', 'reason', 'urgency']
        });
      }

      // Get the user's stock location (destination)
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          stockLocation: true
        }
      });

      if (!user || !user.stockLocation) {
        return res.status(400).json({ 
          error: 'No stock location assigned',
          message: 'User does not have an assigned stock location'
        });
      }

      // Validate that fromLocation and toLocation are different
      if (fromLocationId === user.stockLocation.id) {
        return res.status(400).json({ 
          error: 'Invalid transfer request',
          message: 'Cannot transfer to the same location'
        });
      }

      // Verify the fromLocation exists
      const fromLocation = await prisma.stockLocation.findUnique({
        where: { id: fromLocationId }
      });
      
      if (!fromLocation) {
        return res.status(400).json({
          error: 'Invalid source location',
          message: 'Source location does not exist'
        });
      }

      // Check if it's a regular product or medical device
      let productName: string;
      let productType: string;
      let isDevice = false;
      
      // First check if it's a regular product
      const sourceStock = await prisma.stock.findFirst({
        where: {
          locationId: fromLocationId,
          productId: productId
        },
        include: {
          product: true,
          location: true
        }
      });

      if (sourceStock) {
        // It's a regular product (accessory or spare part)
        if (sourceStock.quantity < requestedQuantity) {
          return res.status(400).json({ 
            error: 'Insufficient quantity',
            message: `Only ${sourceStock.quantity} units available at source location`
          });
        }
        productName = sourceStock.product.name;
        productType = sourceStock.product.type;
      } else {
        // Check if it's a medical device
        const medicalDevice = await prisma.medicalDevice.findFirst({
          where: {
            id: productId,
            stockLocationId: fromLocationId,
            status: { not: 'SOLD' } // Can't transfer sold devices
          }
        });

        if (!medicalDevice) {
          return res.status(400).json({ 
            error: 'Product not found',
            message: 'Product not found at source location or not available for transfer'
          });
        }

        // Medical devices always have quantity 1
        if (requestedQuantity !== 1) {
          return res.status(400).json({ 
            error: 'Invalid quantity',
            message: 'Medical devices can only be transferred one at a time'
          });
        }

        productName = medicalDevice.name;
        productType = medicalDevice.type === 'DIAGNOSTIC_DEVICE' ? 'DIAGNOSTIC_DEVICE' : 'MEDICAL_DEVICE';
        isDevice = true;
      }

      // Create the transfer request data with proper types
      const baseRequestData = {
        fromLocationId: fromLocationId as string,
        toLocationId: user.stockLocation.id as string,
        requestedQuantity: parseInt(requestedQuantity) as number,
        reason: reason.trim() as string,
        urgency: urgency as 'LOW' | 'MEDIUM' | 'HIGH',
        status: 'PENDING' as const,
        requestedById: session.user.id as string
      };

      // Add either productId or medicalDeviceId based on the type
      const requestData = isDevice 
        ? { ...baseRequestData, medicalDeviceId: productId as string }
        : { ...baseRequestData, productId: productId as string };


      // Generate transfer code and create the transfer request
      const transferCode = await generateTransferCode(prisma);
      const transferRequest = await prisma.stockTransferRequest.create({
        data: {
          ...requestData,
          transferCode: transferCode
        }
      });

      // Then fetch it with includes to return to client
      const transferRequestWithIncludes = await prisma.stockTransferRequest.findUnique({
        where: { id: transferRequest.id },
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
          }
        }
      });

      return res.status(201).json(transferRequestWithIncludes);
    } catch (error) {
      console.error('Error creating transfer request:', error);
      return res.status(500).json({ error: 'Failed to create transfer request' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}