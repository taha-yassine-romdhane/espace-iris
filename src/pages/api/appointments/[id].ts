import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }

    switch (req.method) {
      case 'GET':
        return handleGetAppointment(req, res, id);
      case 'PUT':
        return handleUpdateAppointment(req, res, id, session);
      case 'PATCH':
        return handleUpdateAppointment(req, res, id, session);
      case 'DELETE':
        return handleDeleteAppointment(req, res, id);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleGetAppointment(
  req: NextApiRequest, 
  res: NextApiResponse, 
  id: string
) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            telephone: true,
            telephoneTwo: true,
            cin: true,
            cnamId: true,
            detailedAddress: true,
            affiliation: true,
            beneficiaryType: true,
          },
        },
        company: {
          select: {
            id: true,
            companyName: true,
            telephone: true,
            taxId: true,
            detailedAddress: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Transform the appointment data
    const transformedAppointment = {
      id: appointment.id,
      appointmentType: appointment.appointmentType,
      scheduledDate: appointment.scheduledDate,
      location: appointment.location,
      notes: appointment.notes,
      priority: appointment.priority || 'NORMAL',
      status: appointment.status || 'SCHEDULED',
      
      // Client information
      patient: appointment.patient ? {
        ...appointment.patient,
        fullName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        detailedAddress: appointment.patient.detailedAddress,
      } : null,
      
      company: appointment.company ? {
        ...appointment.company,
      } : null,
      
      // Staff information
      assignedTo: appointment.assignedTo ? {
        ...appointment.assignedTo,
        fullName: `${appointment.assignedTo.firstName} ${appointment.assignedTo.lastName}`,
      } : null,
      
      createdBy: appointment.createdBy ? {
        ...appointment.createdBy,
        fullName: `${appointment.createdBy.firstName} ${appointment.createdBy.lastName}`,
      } : null,
      
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };

    return res.status(200).json({ appointment: transformedAppointment });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return res.status(500).json({ error: 'Failed to fetch appointment' });
  }
}

async function handleUpdateAppointment(
  req: NextApiRequest, 
  res: NextApiResponse, 
  id: string,
  session: any
) {
  try {
    const {
      appointmentType,
      scheduledDate,
      location,
      notes,
      priority,
      status,
      assignedToId,
    } = req.body;

    // Check if appointment exists
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!existingAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check if assigned user exists (if provided)
    if (assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId }
      });
      if (!assignedUser) {
        return res.status(404).json({ error: 'Assigned user not found' });
      }
    }

    // Update the appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(appointmentType && { appointmentType }),
        ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
        ...(location && { location }),
        ...(notes !== undefined && { notes }),
        ...(priority && { priority }),
        ...(status && { status }),
        ...(assignedToId !== undefined && { assignedToId }),
        updatedAt: new Date(),
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            telephone: true,
          },
        },
        company: {
          select: {
            id: true,
            companyName: true,
            telephone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return res.status(200).json({ 
      appointment: updatedAppointment,
      message: 'Appointment updated successfully' 
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return res.status(500).json({ error: 'Failed to update appointment' });
  }
}

async function handleDeleteAppointment(
  req: NextApiRequest, 
  res: NextApiResponse, 
  id: string
) {
  try {
    // Check if appointment exists
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!existingAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Delete the appointment
    await prisma.appointment.delete({
      where: { id }
    });

    return res.status(200).json({ 
      message: 'Appointment deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return res.status(500).json({ error: 'Failed to delete appointment' });
  }
}