import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Fetch all data in parallel
    const [
      employees,
      patients,
      medicalDevices,
      rentals,
      sales,
      payments,
      diagnostics,
      cnamBons,
      appointments
    ] = await Promise.all([
      // Employees with their statistics (ADMIN and EMPLOYEE roles only)
      prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: ['ADMIN', 'EMPLOYEE'] }
        },
        include: {
          assignedPatients: { select: { id: true } },
          assignedRentals: {
            select: {
              id: true,
              status: true,
              payments: {
                select: { amount: true, status: true }
              }
            }
          },
          processedSales: {
            select: {
              id: true,
              finalAmount: true,
              status: true
            }
          },
          assignedAppointments: {
            select: { id: true, status: true }
          },
          performedDiagnostics: {
            select: { id: true, status: true }
          },
          stockLocation: {
            select: {
              id: true,
              name: true,
              medicalDevices: {
                select: { id: true, status: true }
              }
            }
          }
        }
      }),

      // Patients with their statistics
      prisma.patient.findMany({
        include: {
          rentals: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              medicalDevice: {
                select: { name: true, type: true }
              }
            }
          },
          sales: {
            select: {
              id: true,
              finalAmount: true,
              status: true
            }
          },
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
              method: true
            }
          },
          diagnostics: {
            select: {
              id: true,
              status: true,
              diagnosticDate: true
            }
          },
          cnamBonRentals: {
            select: {
              id: true,
              bonAmount: true,
              status: true
            }
          },
          appointments: {
            select: {
              id: true,
              status: true,
              scheduledDate: true
            }
          }
        }
      }),

      // Medical Devices with their statistics
      prisma.medicalDevice.findMany({
        include: {
          Rental: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              payments: {
                select: { amount: true }
              }
            }
          },
          saleItems: {
            select: {
              id: true,
              itemTotal: true,
              sale: {
                select: { status: true, saleDate: true }
              }
            }
          },
          RepairLog: {
            select: {
              id: true,
              repairCost: true,
              repairDate: true
            }
          },
          stockLocation: {
            select: {
              name: true
            }
          }
        }
      }),

      // Additional aggregate data
      prisma.rental.findMany({
        select: {
          status: true,
          startDate: true,
          endDate: true
        }
      }),

      prisma.sale.findMany({
        select: {
          status: true,
          finalAmount: true,
          saleDate: true
        }
      }),

      prisma.payment.findMany({
        select: {
          status: true,
          amount: true,
          method: true,
          paymentDate: true
        }
      }),

      prisma.diagnostic.findMany({
        select: {
          status: true,
          diagnosticDate: true
        }
      }),

      prisma.cNAMBonRental.findMany({
        select: {
          status: true,
          bonAmount: true,
          endDate: true
        }
      }),

      prisma.appointment.findMany({
        select: {
          status: true,
          scheduledDate: true
        }
      })
    ]);

    // Calculate Employee Statistics
    const employeesData = employees.map(emp => {
      const activeRentals = emp.assignedRentals.filter(r => r.status === 'ACTIVE').length;
      const completedRentals = emp.assignedRentals.filter(r => r.status === 'COMPLETED').length;
      const totalRentals = emp.assignedRentals.length;

      const rentalRevenue = emp.assignedRentals.reduce((sum, rental) => {
        const rentalTotal = rental.payments.reduce((pSum, p) =>
          p.status === 'PAID' ? pSum + Number(p.amount) : pSum, 0
        );
        return sum + rentalTotal;
      }, 0);

      const salesRevenue = emp.processedSales.reduce((sum, sale) =>
        sum + Number(sale.finalAmount), 0
      );

      const totalRevenue = rentalRevenue + salesRevenue;

      const completedAppointments = emp.assignedAppointments.filter(a => a.status === 'COMPLETED').length;
      const completedDiagnostics = emp.performedDiagnostics.filter(d => d.status === 'COMPLETED').length;

      const devicesInStock = emp.stockLocation?.medicalDevices.length || 0;
      const activeDevices = emp.stockLocation?.medicalDevices.filter(d => d.status === 'ACTIVE').length || 0;

      return {
        id: emp.id,
        employeeCode: emp.id.slice(0, 8),
        fullName: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
        role: emp.role,
        telephone: emp.telephone || 'N/A',
        totalPatients: emp.assignedPatients.length,
        totalRentals,
        activeRentals,
        completedRentals,
        totalSales: emp.processedSales.length,
        rentalRevenue: rentalRevenue.toFixed(2),
        salesRevenue: salesRevenue.toFixed(2),
        totalRevenue: totalRevenue.toFixed(2),
        completedAppointments,
        totalAppointments: emp.assignedAppointments.length,
        completedDiagnostics,
        totalDiagnostics: emp.performedDiagnostics.length,
        stockLocation: emp.stockLocation?.name || 'N/A',
        devicesInStock,
        activeDevices,
        performanceScore: ((completedRentals / Math.max(totalRentals, 1)) * 50 +
                          (completedAppointments / Math.max(emp.assignedAppointments.length, 1)) * 30 +
                          (completedDiagnostics / Math.max(emp.performedDiagnostics.length, 1)) * 20).toFixed(1),
        createdAt: emp.createdAt.toISOString().split('T')[0]
      };
    });

    // Calculate Patient Statistics
    const patientsData = patients.map(patient => {
      const activeRentals = patient.rentals.filter(r => r.status === 'ACTIVE').length;
      const completedRentals = patient.rentals.filter(r => r.status === 'COMPLETED').length;

      const totalPaid = patient.payments
        .filter(p => p.status === 'PAID')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const totalPending = patient.payments
        .filter(p => p.status === 'PENDING')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const salesTotal = patient.sales.reduce((sum, s) => sum + Number(s.finalAmount), 0);

      const cnamTotal = patient.cnamBonRentals
        .filter(b => b.status === 'APPROUVE')
        .reduce((sum, b) => sum + Number(b.bonAmount), 0);

      const completedDiagnostics = patient.diagnostics.filter(d => d.status === 'COMPLETED').length;
      const pendingDiagnostics = patient.diagnostics.filter(d => d.status === 'PENDING').length;

      const completedAppointments = patient.appointments.filter(a => a.status === 'COMPLETED').length;
      const upcomingAppointments = patient.appointments.filter(a =>
        a.status === 'SCHEDULED' || a.status === 'CONFIRMED'
      ).length;

      // Calculate patient activity score
      const monthsSinceCreation = Math.max(1,
        (new Date().getTime() - new Date(patient.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      const activityScore = ((patient.rentals.length + patient.sales.length + patient.payments.length) / monthsSinceCreation).toFixed(2);

      return {
        id: patient.id,
        patientCode: patient.patientCode || 'N/A',
        fullName: `${patient.firstName} ${patient.lastName}`,
        telephone: patient.telephone,
        affiliation: patient.affiliation || 'N/A',
        beneficiaryType: patient.beneficiaryType || 'N/A',
        cnamId: patient.cnamId || 'N/A',
        age: patient.dateOfBirth ?
          Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365)) :
          'N/A',
        totalRentals: patient.rentals.length,
        activeRentals,
        completedRentals,
        totalSales: patient.sales.length,
        totalPayments: patient.payments.length,
        totalPaid: totalPaid.toFixed(2),
        totalPending: totalPending.toFixed(2),
        salesTotal: salesTotal.toFixed(2),
        cnamBons: patient.cnamBonRentals.length,
        cnamTotal: cnamTotal.toFixed(2),
        totalDiagnostics: patient.diagnostics.length,
        completedDiagnostics,
        pendingDiagnostics,
        totalAppointments: patient.appointments.length,
        completedAppointments,
        upcomingAppointments,
        activityScore,
        governorate: patient.governorate || 'N/A',
        delegation: patient.delegation || 'N/A',
        createdAt: patient.createdAt.toISOString().split('T')[0],
        lastActivity: patient.rentals.length > 0 ?
          new Date(Math.max(...patient.rentals.map(r => r.startDate.getTime()))).toISOString().split('T')[0] :
          'N/A'
      };
    });

    // Calculate Medical Device Statistics
    const devicesData = medicalDevices.map(device => {
      const activeRentals = device.Rental.filter(r => r.status === 'ACTIVE').length;
      const completedRentals = device.Rental.filter(r => r.status === 'COMPLETED').length;
      const totalRentals = device.Rental.length;

      const rentalRevenue = device.Rental.reduce((sum, rental) => {
        const rentalTotal = rental.payments.reduce((pSum, p) => pSum + Number(p.amount), 0);
        return sum + rentalTotal;
      }, 0);

      const salesCount = device.saleItems.filter(si =>
        si.sale.status === 'COMPLETED' || si.sale.status === 'PENDING'
      ).length;

      const salesRevenue = device.saleItems.reduce((sum, si) =>
        sum + Number(si.itemTotal), 0
      );

      const totalRevenue = rentalRevenue + salesRevenue;

      const repairCount = device.RepairLog.length;
      const repairCost = device.RepairLog.reduce((sum, r) =>
        sum + Number(r.repairCost), 0
      );

      const lastRepairDate = device.RepairLog.length > 0 ?
        new Date(Math.max(...device.RepairLog.map(r => r.repairDate.getTime()))).toISOString().split('T')[0] :
        'N/A';

      const utilizationRate = totalRentals > 0 ?
        ((completedRentals / totalRentals) * 100).toFixed(1) :
        '0.0';

      const profitability = (totalRevenue - repairCost).toFixed(2);

      return {
        id: device.id,
        deviceCode: device.deviceCode || 'N/A',
        name: device.name,
        type: device.type,
        brand: device.brand || 'N/A',
        model: device.model || 'N/A',
        serialNumber: device.serialNumber || 'N/A',
        status: device.status,
        destination: device.destination,
        stockLocation: device.stockLocation?.name || 'N/A',
        purchasePrice: device.purchasePrice ? Number(device.purchasePrice).toFixed(2) : 'N/A',
        sellingPrice: device.sellingPrice ? Number(device.sellingPrice).toFixed(2) : 'N/A',
        rentalPrice: device.rentalPrice ? Number(device.rentalPrice).toFixed(2) : 'N/A',
        totalRentals,
        activeRentals,
        completedRentals,
        rentalRevenue: rentalRevenue.toFixed(2),
        salesCount,
        salesRevenue: salesRevenue.toFixed(2),
        totalRevenue: totalRevenue.toFixed(2),
        repairCount,
        repairCost: repairCost.toFixed(2),
        lastRepairDate,
        utilizationRate: `${utilizationRate}%`,
        profitability,
        roi: device.purchasePrice && Number(device.purchasePrice) > 0 ?
          ((totalRevenue / Number(device.purchasePrice)) * 100).toFixed(1) + '%' :
          'N/A',
        createdAt: device.createdAt.toISOString().split('T')[0]
      };
    });

    // Calculate summary statistics
    const summary = {
      employees: {
        total: employees.length,
        totalRevenue: employeesData.reduce((sum, e) => sum + Number(e.totalRevenue), 0).toFixed(2),
        avgRevenuePerEmployee: (employeesData.reduce((sum, e) => sum + Number(e.totalRevenue), 0) / Math.max(employees.length, 1)).toFixed(2),
        totalPatients: employeesData.reduce((sum, e) => sum + e.totalPatients, 0),
        totalRentals: employeesData.reduce((sum, e) => sum + e.totalRentals, 0),
        totalSales: employeesData.reduce((sum, e) => sum + e.totalSales, 0)
      },
      patients: {
        total: patients.length,
        totalRevenue: patientsData.reduce((sum, p) => sum + Number(p.totalPaid), 0).toFixed(2),
        avgRevenuePerPatient: (patientsData.reduce((sum, p) => sum + Number(p.totalPaid), 0) / Math.max(patients.length, 1)).toFixed(2),
        activeRentals: patientsData.reduce((sum, p) => sum + p.activeRentals, 0),
        totalCnamBons: patientsData.reduce((sum, p) => sum + p.cnamBons, 0),
        totalCnamAmount: patientsData.reduce((sum, p) => sum + Number(p.cnamTotal), 0).toFixed(2)
      },
      devices: {
        total: medicalDevices.length,
        totalRevenue: devicesData.reduce((sum, d) => sum + Number(d.totalRevenue), 0).toFixed(2),
        avgRevenuePerDevice: (devicesData.reduce((sum, d) => sum + Number(d.totalRevenue), 0) / Math.max(medicalDevices.length, 1)).toFixed(2),
        activeRentals: devicesData.reduce((sum, d) => sum + d.activeRentals, 0),
        totalRepairCost: devicesData.reduce((sum, d) => sum + Number(d.repairCost), 0).toFixed(2),
        totalProfitability: devicesData.reduce((sum, d) => sum + Number(d.profitability), 0).toFixed(2)
      }
    };

    res.status(200).json({
      employees: employeesData,
      patients: patientsData,
      devices: devicesData,
      summary
    });

  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
}
