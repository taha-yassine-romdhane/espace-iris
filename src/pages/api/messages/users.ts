import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { search } = req.query;
    const userRole = session.user.role;

    let users: any[] = [];

    // Role-based filtering
    if (userRole === 'DOCTOR') {
      // Doctors can only message:
      // 1. Employees assigned to their patients
      // 2. Admins

      // Get all patients assigned to this doctor
      const doctorPatients = await prisma.patient.findMany({
        where: {
          doctorId: session.user.id
        },
        select: {
          id: true
        }
      });

      const patientIds = doctorPatients.map(p => p.id);

      // Get employees assigned to these patients via rentals or appointments
      const employeesFromRentals = await prisma.rental.findMany({
        where: {
          patientId: { in: patientIds },
          createdById: { not: null }
        },
        select: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              telephone: true
            }
          }
        },
        distinct: ['createdById']
      });

      const employeesFromAppointments = await prisma.appointment.findMany({
        where: {
          patientId: { in: patientIds },
          assignedToId: { not: null }
        },
        select: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              telephone: true
            }
          }
        },
        distinct: ['assignedToId']
      });

      // Get all admins
      const admins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
          id: { not: session.user.id }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          telephone: true
        }
      });

      // Combine and deduplicate
      const employeesList = [
        ...employeesFromRentals.map(r => r.createdBy).filter(Boolean),
        ...employeesFromAppointments.map(a => a.assignedTo).filter(Boolean)
      ];

      const uniqueUsers = new Map();
      [...employeesList, ...admins].forEach(user => {
        if (user && !uniqueUsers.has(user.id)) {
          uniqueUsers.set(user.id, user);
        }
      });

      users = Array.from(uniqueUsers.values());

      // Apply search filter if provided
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        users = users.filter(user =>
          user.firstName?.toLowerCase().includes(searchLower) ||
          user.lastName?.toLowerCase().includes(searchLower)
        );
      }
    } else if (userRole === 'EMPLOYEE') {
      // Employees can message:
      // 1. Doctors whose patients they are assigned to
      // 2. Other employees
      // 3. Admins

      // Get patients assigned to this employee
      const employeeRentals = await prisma.rental.findMany({
        where: {
          createdById: session.user.id
        },
        select: {
          patient: {
            select: {
              doctor: {
                select: {
                  id: true,
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      role: true,
                      telephone: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      const employeeAppointments = await prisma.appointment.findMany({
        where: {
          assignedToId: session.user.id
        },
        select: {
          patient: {
            select: {
              doctor: {
                select: {
                  id: true,
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      role: true,
                      telephone: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Get all other employees and admins
      const otherUsers = await prisma.user.findMany({
        where: {
          role: { in: ['EMPLOYEE', 'ADMIN', 'MANAGER'] },
          isActive: true,
          id: { not: session.user.id }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          telephone: true
        }
      });

      // Combine doctors from rentals and appointments
      const doctorsList = [
        ...employeeRentals.map(r => r.patient?.doctor?.user).filter(Boolean),
        ...employeeAppointments.map(a => a.patient?.doctor?.user).filter(Boolean)
      ];

      const uniqueUsers = new Map();
      [...doctorsList, ...otherUsers].forEach(user => {
        if (user && !uniqueUsers.has(user.id)) {
          uniqueUsers.set(user.id, user);
        }
      });

      users = Array.from(uniqueUsers.values());

      // Apply search filter
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        users = users.filter(user =>
          user.firstName?.toLowerCase().includes(searchLower) ||
          user.lastName?.toLowerCase().includes(searchLower)
        );
      }
    } else {
      // Admins and Managers can message everyone
      const whereClause: any = {
        id: {
          not: session.user.id
        },
        isActive: true
      };

      if (search && typeof search === 'string') {
        whereClause.OR = [
          {
            firstName: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            lastName: {
              contains: search,
              mode: 'insensitive'
            }
          }
        ];
      }

      users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          telephone: true
        },
        orderBy: [
          { firstName: 'asc' },
          { lastName: 'asc' }
        ]
      });
    }

    // Sort users
    users.sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}