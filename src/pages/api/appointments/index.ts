import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { createAppointmentReminderNotification } from '@/lib/notifications';
import { generateAppointmentCode } from '@/utils/idGenerator';

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

    switch (req.method) {
      case 'GET':
        return handleGetAppointments(req, res);
      case 'POST':
        return handleCreateAppointment(req, res, session);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleGetAppointments(req: NextApiRequest, res: NextApiResponse) {
  try {
    const appointments = await prisma.appointment.findMany({
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
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    // Transform the data for frontend consumption
    const transformedAppointments = appointments.map(appointment => ({
      id: appointment.id,
      appointmentCode: appointment.appointmentCode,
      appointmentType: appointment.appointmentType,
      scheduledDate: appointment.scheduledDate,
      location: appointment.location,
      notes: appointment.notes,
      priority: appointment.priority || 'NORMAL',
      status: appointment.status || 'SCHEDULED',
      
      // Client information
      patient: appointment.patient ? {
        id: appointment.patient.id,
        firstName: appointment.patient.firstName,
        lastName: appointment.patient.lastName,
        telephone: appointment.patient.telephone,
      } : null,
      
      company: appointment.company ? {
        id: appointment.company.id,
        companyName: appointment.company.companyName,
        telephone: appointment.company.telephone,
      } : null,
      
      // Staff information
      assignedTo: appointment.assignedTo ? {
        id: appointment.assignedTo.id,
        firstName: appointment.assignedTo.firstName,
        lastName: appointment.assignedTo.lastName,
        fullName: `${appointment.assignedTo.firstName} ${appointment.assignedTo.lastName}`,
      } : null,
      
      createdBy: appointment.createdBy ? {
        id: appointment.createdBy.id,
        firstName: appointment.createdBy.firstName,
        lastName: appointment.createdBy.lastName,
        fullName: `${appointment.createdBy.firstName} ${appointment.createdBy.lastName}`,
      } : null,
      
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    }));

    return res.status(200).json({ 
      appointments: transformedAppointments,
      total: transformedAppointments.length 
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return res.status(500).json({ error: 'Failed to fetch appointments' });
  }
}

async function handleCreateAppointment(
  req: NextApiRequest, 
  res: NextApiResponse, 
  session: any
) {
  try {
    const {
      patientId,
      companyId,
      appointmentType,
      scheduledDate,
      location,
      notes,
      priority,
      status,
      assignedToId,
      createDiagnosticTask,
    } = req.body;

    // Validation
    if (!appointmentType || !scheduledDate || !location) {
      return res.status(400).json({ 
        error: 'Missing required fields: appointmentType, scheduledDate, location' 
      });
    }

    if (!patientId && !companyId) {
      return res.status(400).json({ 
        error: 'Either patientId or companyId must be provided' 
      });
    }

    // Check if patient or company exists
    if (patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      });
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }
    }

    if (companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId }
      });
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }
    }

    // Check if assigned user exists
    if (assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId }
      });
      if (!assignedUser) {
        return res.status(404).json({ error: 'Assigned user not found' });
      }
    }

    // Generate appointment code
    const appointmentCode = await generateAppointmentCode(prisma);
    
    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        appointmentCode: appointmentCode,
        appointmentType,
        scheduledDate: new Date(scheduledDate),
        location,
        notes: notes || null,
        priority: priority || 'NORMAL',
        status: status || 'SCHEDULED',
        patientId: patientId || null,
        companyId: companyId || null,
        assignedToId: assignedToId || null,
        createdById: session.user.id,
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

    // Create notification for appointment reminder if it's for a patient and assigned to someone
    if (appointment.patientId && appointment.assignedToId) {
      try {
        await createAppointmentReminderNotification(
          appointment.id,
          appointment.patientId,
          `${appointment.patient!.firstName} ${appointment.patient!.lastName}`,
          appointment.scheduledDate,
          appointment.assignedToId
        );
      } catch (notificationError) {
        console.error('Failed to create appointment notification:', notificationError);
        // Don't fail the appointment creation if notification fails
      }
    }

    // Create diagnostic task if this is a diagnostic visit
    if (createDiagnosticTask && appointmentType === 'DIAGNOSTIC_VISIT' && appointment.patientId && appointment.assignedToId) {
      try {
        const patientName = `${appointment.patient!.firstName} ${appointment.patient!.lastName}`;
        const taskTitle = `Diagnostic polygraphie - ${patientName}`;
        const taskDescription = `Effectuer un diagnostic polygraphie chez le patient ${patientName} à l'adresse: ${appointment.location}`;
        
        const task = await prisma.task.create({
          data: {
            title: taskTitle,
            description: taskDescription,
            userId: appointment.assignedToId,
            status: 'TODO',
            priority: appointment.priority === 'URGENT' ? 'HIGH' : 
                     appointment.priority === 'HIGH' ? 'MEDIUM' : 'LOW',
            startDate: appointment.scheduledDate,
            endDate: new Date(appointment.scheduledDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours duration
          },
        });

        console.log('Diagnostic task created:', task.id);
      } catch (taskError) {
        console.error('Failed to create diagnostic task:', taskError);
        // Don't fail the appointment creation if task creation fails
      }
    }

    return res.status(201).json({ 
      appointment,
      message: 'Appointment created successfully' 
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return res.status(500).json({ error: 'Failed to create appointment' });
  }
}