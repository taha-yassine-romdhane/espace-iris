import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userWithCounts = await prisma.user.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            technician: true,
            assignedPatients: true,
            assignedCompanies: true,
            technicianPatients: true,
            technicianCompanies: true,
            tasks: true,
            stockTransfers: true,
            sentTransfers: true,
            receivedTransfers: true,
            patientHistories: true,
            userActions: true,
            performedDiagnostics: true,
            completedTasks: true,
            verifiedTransfers: true,
            notifications: true,
            processedSales: true,
          },
        },
        doctor: { select: { id: true } },
        stockLocation: { select: { id: true } },
      },
    });

    if (!userWithCounts) {
      return res.status(404).json({ error: 'User not found' });
    }

    const relations = {
      Technicians: userWithCounts._count.technician,
      'Assigned Patients': userWithCounts._count.assignedPatients,
      'Assigned Companies': userWithCounts._count.assignedCompanies,
      'Technician Patients': userWithCounts._count.technicianPatients,
      'Technician Companies': userWithCounts._count.technicianCompanies,
      Tasks: userWithCounts._count.tasks,
      'Stock Transfers': userWithCounts._count.stockTransfers,
      'Sent Transfers': userWithCounts._count.sentTransfers,
      'Received Transfers': userWithCounts._count.receivedTransfers,
      'Patient Histories': userWithCounts._count.patientHistories,
      'User Actions': userWithCounts._count.userActions,
      'Performed Diagnostics': userWithCounts._count.performedDiagnostics,
      'Completed Tasks': userWithCounts._count.completedTasks,
      'Verified Transfers': userWithCounts._count.verifiedTransfers,
      Notifications: userWithCounts._count.notifications,
      'Processed Sales': userWithCounts._count.processedSales,
      Doctor: userWithCounts.doctor ? 1 : 0,
      'Stock Location': userWithCounts.stockLocation ? 1 : 0,
    };

    // Filter out relations with a count of 0
    const activeRelations = Object.fromEntries(
      Object.entries(relations).filter(([, value]) => value > 0)
    );

    const hasRelations = Object.keys(activeRelations).length > 0;

    return res.status(200).json({ hasRelations, relations: activeRelations });

  } catch (error) {
    console.error('Error fetching user relations:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
