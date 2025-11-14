import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const { 
        patientId, 
        status, 
        saleId,
        search,
        page = '1',
        limit = '10'
      } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const offset = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {};
      
      if (patientId) {
        where.patientId = patientId;
      }
      
      if (status) {
        where.status = status;
      }
      
      if (saleId) {
        where.saleId = saleId;
      }
      
      if (search) {
        where.OR = [
          { dossierNumber: { contains: search as string, mode: 'insensitive' } },
          { patient: { firstName: { contains: search as string, mode: 'insensitive' } } },
          { patient: { lastName: { contains: search as string, mode: 'insensitive' } } },
          { notes: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      // If user is EMPLOYEE, only show dossiers for sales assigned to them or processed by them
      if (session.user.role === 'EMPLOYEE') {
        where.sale = {
          OR: [
            { assignedToId: session.user.id },
            { processedById: session.user.id }
          ]
        };
      }
      // ADMIN and DOCTOR can see all dossiers (no additional filter)

      // Get dossiers with pagination
      const [dossiers, totalCount] = await Promise.all([
        prisma.cNAMDossier.findMany({
          where,
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                telephone: true,
                cnamId: true
              }
            },
            sale: {
              select: {
                id: true,
                invoiceNumber: true,
                saleDate: true,
                totalAmount: true,
                finalAmount: true
              }
            },
            paymentDetail: {
              select: {
                id: true,
                amount: true,
                reference: true
              }
            }
          },
          orderBy: [
            { status: 'asc' }, // Pending ones first
            { createdAt: 'desc' }
          ],
          skip: offset,
          take: limitNum
        }),
        prisma.cNAMDossier.count({ where })
      ]);

      // Add computed fields
      const dossiersWithComputed = dossiers.map(dossier => ({
        ...dossier,
        patientName: `${dossier.patient.firstName} ${dossier.patient.lastName}`,
        isCompleted: dossier.status === 'TERMINE',
        isPending: dossier.status === 'EN_ATTENTE_APPROBATION',
        isRefused: dossier.status === 'REFUSE',
        progressPercentage: Math.round((dossier.currentStep / dossier.totalSteps) * 100)
      }));

      return res.status(200).json({
        dossiers: dossiersWithComputed,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('CNAM dossiers API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}