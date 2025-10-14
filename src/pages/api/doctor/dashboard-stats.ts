import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    if (session.user.role !== 'DOCTOR') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Get doctor record
    const doctor = await prisma.doctor.findUnique({
      where: { userId: session.user.id }
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Docteur non trouvé' });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch statistics
    const [
      totalPatients,
      appointmentsToday,
      pendingDiagnostics,
      activeDevices,
      recentActivity,
      upcomingAppointments,
      pendingFollowUps
    ] = await Promise.all([
      // Total patients assigned to this doctor
      prisma.patient.count({
        where: { doctorId: doctor.id }
      }),

      // Appointments today
      prisma.appointment.count({
        where: {
          scheduledDate: {
            gte: today,
            lt: tomorrow
          },
          patient: {
            doctorId: doctor.id
          }
        }
      }),

      // Pending diagnostics for doctor's patients
      prisma.diagnostic.count({
        where: {
          status: 'PENDING',
          patient: {
            doctorId: doctor.id
          }
        }
      }),

      // Active medical devices for doctor's patients
      prisma.medicalDevice.count({
        where: {
          status: 'ACTIVE',
          Patient: {
            doctorId: doctor.id
          }
        }
      }),

      // Recent activity (last 10 activities)
      Promise.all([
        prisma.diagnostic.findMany({
          take: 3,
          orderBy: { createdAt: 'desc' },
          where: {
            patient: { doctorId: doctor.id }
          },
          include: {
            patient: true,
            medicalDevice: true
          }
        }),
        prisma.appointment.findMany({
          take: 3,
          orderBy: { createdAt: 'desc' },
          where: {
            patient: { doctorId: doctor.id }
          },
          include: {
            patient: true
          }
        }),
        prisma.rental.findMany({
          take: 2,
          orderBy: { createdAt: 'desc' },
          where: {
            patient: { doctorId: doctor.id }
          },
          include: {
            patient: true,
            medicalDevice: true
          }
        })
      ]).then(([diagnostics, appointments, rentals]) => {
        const activities: any[] = [];
        
        diagnostics.forEach(diagnostic => {
          activities.push({
            id: diagnostic.id,
            type: 'diagnostic',
            patientName: `${diagnostic.patient.firstName} ${diagnostic.patient.lastName}`,
            description: `Diagnostic ${diagnostic.status.toLowerCase()} - ${diagnostic.medicalDevice.name}`,
            createdAt: diagnostic.createdAt.toISOString()
          });
        });

        appointments.forEach(appointment => {
          activities.push({
            id: appointment.id,
            type: 'appointment',
            patientName: appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'Patient',
            description: `RDV ${appointment.appointmentType} - ${appointment.status.toLowerCase()}`,
            createdAt: appointment.createdAt.toISOString()
          });
        });

        rentals.forEach(rental => {
          activities.push({
            id: rental.id,
            type: 'device_assignment',
            patientName: `${rental.patient.firstName} ${rental.patient.lastName}`,
            description: `Location ${rental.medicalDevice.name} - ${rental.status.toLowerCase()}`,
            createdAt: rental.createdAt.toISOString()
          });
        });

        return activities
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
      }),

      // Upcoming appointments (next 5)
      prisma.appointment.findMany({
        take: 5,
        orderBy: { scheduledDate: 'asc' },
        where: {
          scheduledDate: { gte: new Date() },
          patient: { doctorId: doctor.id },
          status: { in: ['SCHEDULED', 'CONFIRMED'] }
        },
        include: {
          patient: true
        }
      }).then(appointments => 
        appointments.map(appointment => ({
          id: appointment.id,
          patientName: appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'Patient',
          appointmentType: appointment.appointmentType,
          scheduledDate: appointment.scheduledDate.toISOString(),
          location: appointment.location,
          status: appointment.status
        }))
      ),

      // Pending follow-ups (patients needing follow-up)
      prisma.patient.findMany({
        take: 6,
        where: {
          doctorId: doctor.id,
          OR: [
            {
              diagnostics: {
                some: {
                  followUpRequired: true,
                  followUpDate: {
                    lte: new Date()
                  }
                }
              }
            },
            {
              appointments: {
                some: {
                  status: 'COMPLETED',
                  scheduledDate: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                  }
                }
              }
            }
          ]
        },
        include: {
          diagnostics: {
            where: {
              followUpRequired: true,
              followUpDate: { lte: new Date() }
            },
            orderBy: { followUpDate: 'asc' }
          }
        }
      }).then(patients =>
        patients.map(patient => {
          const urgentDiagnostic = patient.diagnostics.find(d => 
            d.followUpDate && new Date(d.followUpDate) < new Date()
          );
          
          return {
            id: patient.id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            reason: urgentDiagnostic ? 'Suivi diagnostic requis' : 'Suivi post-consultation',
            dueDate: urgentDiagnostic?.followUpDate?.toISOString() || new Date().toISOString(),
            priority: urgentDiagnostic ? 'high' : 'medium' as 'high' | 'medium' | 'low'
          };
        })
      )
    ]);

    const dashboardStats = {
      totalPatients,
      appointmentsToday,
      pendingDiagnostics,
      activeDevices,
      recentActivity,
      upcomingAppointments,
      pendingFollowUps
    };

    return res.status(200).json(dashboardStats);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ 
      error: 'Erreur lors du chargement des statistiques' 
    });
  }
}