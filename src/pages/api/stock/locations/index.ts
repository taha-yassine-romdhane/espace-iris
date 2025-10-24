import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // Get all stock locations with basic counts
      const locations = await prisma.stockLocation.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          },
          _count: {
            select: {
              stocks: true,
              medicalDevices: true,
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });
      
      // For each location, get detailed inventory information
      const locationsWithInventory = await Promise.all(locations.map(async (location) => {
        // Get all stocks for this location
        const stocks = await prisma.stock.findMany({
          where: { locationId: location.id },
          include: {
            product: true
          }
        });
        
        // Get all medical devices for this location
        const medicalDevices = await prisma.medicalDevice.findMany({
          where: { stockLocationId: location.id }
        });
        
        // Count accessories and spare parts
        let accessoryCount = 0;
        let sparePartCount = 0;
        let accessoryQuantity = 0;
        let sparePartQuantity = 0;
        
        // Count unique product types and their quantities
        stocks.forEach(stock => {
          if (stock.product.type === 'ACCESSORY') {
            accessoryCount++;
            accessoryQuantity += stock.quantity;
          } else if (stock.product.type === 'SPARE_PART') {
            sparePartCount++;
            sparePartQuantity += stock.quantity;
          }
        });
        
        // Count medical devices by type
        const medicalDeviceCount = medicalDevices.filter(device => 
          device.type !== 'DIAGNOSTIC_DEVICE'
        ).length;
        
        const diagnosticDeviceCount = medicalDevices.filter(device => 
          device.type === 'DIAGNOSTIC_DEVICE'
        ).length;
        
        return {
          ...location,
          accessoryCount,
          sparePartCount,
          accessoryQuantity,
          sparePartQuantity,
          medicalDeviceCount,
          diagnosticDeviceCount,
          totalDeviceCount: medicalDeviceCount + diagnosticDeviceCount
        };
      }));

      return res.status(200).json(locationsWithInventory);
    } catch (error) {
      console.error('Error fetching locations:', error);
      return res.status(500).json({ error: 'Failed to fetch locations' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description } = req.body;

      const location = await prisma.stockLocation.create({
        data: {
          name,
          description,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          },
          _count: {
            select: {
              stocks: true,
              medicalDevices: true,
            }
          }
        }
      });
      
      // Add the additional count fields with default values of 0 for a new location
      const locationWithCounts = {
        ...location,
        accessoryCount: 0,
        sparePartCount: 0,
        accessoryQuantity: 0,
        sparePartQuantity: 0,
        medicalDeviceCount: 0,
        diagnosticDeviceCount: 0,
        totalDeviceCount: 0
      };

      return res.status(201).json(locationWithCounts);
    } catch (error) {
      console.error('Error creating location:', error);
      return res.status(500).json({ error: 'Failed to create location' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
