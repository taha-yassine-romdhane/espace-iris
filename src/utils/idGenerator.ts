import { PrismaClient } from '@prisma/client';

/**
 * Generate a sequential patient code in format PAT-XXXX
 * @param prisma - Prisma client instance
 * @returns Promise<string> - The generated patient code
 */
export async function generatePatientCode(prisma: PrismaClient): Promise<string> {
  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // Get the highest existing patient code
      const lastPatient = await prisma.patient.findFirst({
        where: {
          patientCode: {
            not: null
          }
        },
        orderBy: {
          patientCode: 'desc'
        },
        select: {
          patientCode: true
        }
      });

      let nextNumber = 1;
      
      if (lastPatient?.patientCode) {
        // Extract the number from the last code (PAT-XXXX)
        const match = lastPatient.patientCode.match(/PAT-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Format with leading zeros (4 digits)
      const paddedNumber = nextNumber.toString().padStart(4, '0');
      const newCode = `PAT-${paddedNumber}`;

      // Verify uniqueness (in case of race condition)
      const exists = await prisma.patient.findUnique({
        where: { patientCode: newCode }
      });

      if (!exists) {
        return newCode;
      }

      // If exists (race condition), retry with next number
      retryCount++;
    } catch (error) {
      console.error('Error generating patient code:', error);
      retryCount++;
      if (retryCount >= maxRetries) {
        throw new Error('Failed to generate unique patient code after multiple attempts');
      }
    }
  }

  throw new Error('Failed to generate unique patient code');
}

/**
 * Generate a sequential company code in format COM-XXXX
 * @param prisma - Prisma client instance
 * @returns Promise<string> - The generated company code
 */
export async function generateCompanyCode(prisma: PrismaClient): Promise<string> {
  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // Get the highest existing company code
      const lastCompany = await prisma.company.findFirst({
        where: {
          companyCode: {
            not: null
          }
        },
        orderBy: {
          companyCode: 'desc'
        },
        select: {
          companyCode: true
        }
      });

      let nextNumber = 1;
      
      if (lastCompany?.companyCode) {
        // Extract the number from the last code (COM-XXXX)
        const match = lastCompany.companyCode.match(/COM-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Format with leading zeros (4 digits)
      const paddedNumber = nextNumber.toString().padStart(4, '0');
      const newCode = `COM-${paddedNumber}`;

      // Verify uniqueness (in case of race condition)
      const exists = await prisma.company.findUnique({
        where: { companyCode: newCode }
      });

      if (!exists) {
        return newCode;
      }

      // If exists (race condition), retry with next number
      retryCount++;
    } catch (error) {
      console.error('Error generating company code:', error);
      retryCount++;
      if (retryCount >= maxRetries) {
        throw new Error('Failed to generate unique company code after multiple attempts');
      }
    }
  }

  throw new Error('Failed to generate unique company code');
}

/**
 * Assign patient codes to existing patients without codes
 * Used for migration purposes
 * @param prisma - Prisma client instance
 */
export async function migrateExistingPatientCodes(prisma: PrismaClient): Promise<void> {
  const patientsWithoutCode = await prisma.patient.findMany({
    where: {
      patientCode: null
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log(`Found ${patientsWithoutCode.length} patients without codes`);

  for (const patient of patientsWithoutCode) {
    try {
      const newCode = await generatePatientCode(prisma);
      await prisma.patient.update({
        where: { id: patient.id },
        data: { patientCode: newCode }
      });
      console.log(`Assigned code ${newCode} to patient ${patient.firstName} ${patient.lastName}`);
    } catch (error) {
      console.error(`Failed to assign code to patient ${patient.id}:`, error);
    }
  }
}

/**
 * Generate a sequential sale code in format SAL-XXXX
 * @param prisma - Prisma client instance
 * @returns Promise<string> - The generated sale code
 */
export async function generateSaleCode(prisma: PrismaClient): Promise<string> {
  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const lastSale = await prisma.sale.findFirst({
        where: {
          saleCode: {
            not: null
          }
        },
        orderBy: {
          saleCode: 'desc'
        },
        select: {
          saleCode: true
        }
      });

      let nextNumber = 1;
      
      if (lastSale?.saleCode) {
        const match = lastSale.saleCode.match(/SAL-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const paddedNumber = nextNumber.toString().padStart(4, '0');
      const newCode = `SAL-${paddedNumber}`;

      const exists = await prisma.sale.findUnique({
        where: { saleCode: newCode }
      });

      if (!exists) {
        return newCode;
      }

      retryCount++;
    } catch (error) {
      console.error('Error generating sale code:', error);
      retryCount++;
      if (retryCount >= maxRetries) {
        throw new Error('Failed to generate unique sale code after multiple attempts');
      }
    }
  }

  throw new Error('Failed to generate unique sale code');
}

/**
 * Generate a sequential rental code in format RNT-XXXX
 * @param prisma - Prisma client instance
 * @returns Promise<string> - The generated rental code
 */
export async function generateRentalCode(prisma: PrismaClient): Promise<string> {
  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const lastRental = await prisma.rental.findFirst({
        where: {
          rentalCode: {
            not: null
          }
        },
        orderBy: {
          rentalCode: 'desc'
        },
        select: {
          rentalCode: true
        }
      });

      let nextNumber = 1;
      
      if (lastRental?.rentalCode) {
        const match = lastRental.rentalCode.match(/RNT-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const paddedNumber = nextNumber.toString().padStart(4, '0');
      const newCode = `RNT-${paddedNumber}`;

      const exists = await prisma.rental.findUnique({
        where: { rentalCode: newCode }
      });

      if (!exists) {
        return newCode;
      }

      retryCount++;
    } catch (error) {
      console.error('Error generating rental code:', error);
      retryCount++;
      if (retryCount >= maxRetries) {
        throw new Error('Failed to generate unique rental code after multiple attempts');
      }
    }
  }

  throw new Error('Failed to generate unique rental code');
}

/**
 * Generate a sequential payment code in format PAY-XXXX
 * @param prisma - Prisma client instance
 * @returns Promise<string> - The generated payment code
 */
export async function generatePaymentCode(prisma: PrismaClient): Promise<string> {
  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const lastPayment = await prisma.payment.findFirst({
        where: {
          paymentCode: {
            not: null
          }
        },
        orderBy: {
          paymentCode: 'desc'
        },
        select: {
          paymentCode: true
        }
      });

      let nextNumber = 1;
      
      if (lastPayment?.paymentCode) {
        const match = lastPayment.paymentCode.match(/PAY-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const paddedNumber = nextNumber.toString().padStart(4, '0');
      const newCode = `PAY-${paddedNumber}`;

      const exists = await prisma.payment.findUnique({
        where: { paymentCode: newCode }
      });

      if (!exists) {
        return newCode;
      }

      retryCount++;
    } catch (error) {
      console.error('Error generating payment code:', error);
      retryCount++;
      if (retryCount >= maxRetries) {
        throw new Error('Failed to generate unique payment code after multiple attempts');
      }
    }
  }

  throw new Error('Failed to generate unique payment code');
}

/**
 * Generate a sequential diagnostic code in format DIAG-XXXX
 * @param prisma - Prisma client instance
 * @returns Promise<string> - The generated diagnostic code
 */
export async function generateDiagnosticCode(prisma: PrismaClient): Promise<string> {
  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const lastDiagnostic = await prisma.diagnostic.findFirst({
        where: {
          diagnosticCode: {
            not: null
          }
        },
        orderBy: {
          diagnosticCode: 'desc'
        },
        select: {
          diagnosticCode: true
        }
      });

      let nextNumber = 1;
      
      if (lastDiagnostic?.diagnosticCode) {
        const match = lastDiagnostic.diagnosticCode.match(/DIAG-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const paddedNumber = nextNumber.toString().padStart(4, '0');
      const newCode = `DIAG-${paddedNumber}`;

      const exists = await prisma.diagnostic.findUnique({
        where: { diagnosticCode: newCode }
      });

      if (!exists) {
        return newCode;
      }

      retryCount++;
    } catch (error) {
      console.error('Error generating diagnostic code:', error);
      retryCount++;
      if (retryCount >= maxRetries) {
        throw new Error('Failed to generate unique diagnostic code after multiple attempts');
      }
    }
  }

  throw new Error('Failed to generate unique diagnostic code');
}

/**
 * Generate a sequential appointment code in format RDV-XXXX
 * @param prisma - Prisma client instance
 * @returns Promise<string> - The generated appointment code
 */
export async function generateAppointmentCode(prisma: PrismaClient): Promise<string> {
  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const lastAppointment = await prisma.appointment.findFirst({
        where: {
          appointmentCode: {
            not: null
          }
        },
        orderBy: {
          appointmentCode: 'desc'
        },
        select: {
          appointmentCode: true
        }
      });

      let nextNumber = 1;
      
      if (lastAppointment?.appointmentCode) {
        const match = lastAppointment.appointmentCode.match(/RDV-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const paddedNumber = nextNumber.toString().padStart(4, '0');
      const newCode = `RDV-${paddedNumber}`;

      const exists = await prisma.appointment.findUnique({
        where: { appointmentCode: newCode }
      });

      if (!exists) {
        return newCode;
      }

      retryCount++;
    } catch (error) {
      console.error('Error generating appointment code:', error);
      retryCount++;
      if (retryCount >= maxRetries) {
        throw new Error('Failed to generate unique appointment code after multiple attempts');
      }
    }
  }

  throw new Error('Failed to generate unique appointment code');
}

/**
 * Generate a sequential CNAM dossier number in format CNAM-XXXX
 * @param prisma - Prisma client instance
 * @returns Promise<string> - The generated dossier number
 */
export async function generateCNAMDossierNumber(prisma: PrismaClient): Promise<string> {
  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const lastDossier = await prisma.cNAMDossier.findFirst({
        where: {
          dossierNumber: {
            not: undefined,
            startsWith: 'CNAM-'
          }
        },
        orderBy: {
          dossierNumber: 'desc'
        },
        select: {
          dossierNumber: true
        }
      });

      let nextNumber = 1;
      
      if (lastDossier?.dossierNumber) {
        const match = lastDossier.dossierNumber.match(/CNAM-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const paddedNumber = nextNumber.toString().padStart(4, '0');
      const newCode = `CNAM-${paddedNumber}`;

      const exists = await prisma.cNAMDossier.findUnique({
        where: { dossierNumber: newCode }
      });

      if (!exists) {
        return newCode;
      }

      retryCount++;
    } catch (error) {
      console.error('Error generating CNAM dossier number:', error);
      retryCount++;
      if (retryCount >= maxRetries) {
        throw new Error('Failed to generate unique CNAM dossier number after multiple attempts');
      }
    }
  }

  throw new Error('Failed to generate unique CNAM dossier number');
}

/**
 * Generate a sequential repair code in format REP-XXXX
 * @param prisma - Prisma client instance
 * @returns Promise<string> - The generated repair code
 */
export async function generateRepairCode(prisma: PrismaClient): Promise<string> {
  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const lastRepair = await prisma.repairLog.findFirst({
        where: {
          repairCode: {
            not: null
          }
        },
        orderBy: {
          repairCode: 'desc'
        },
        select: {
          repairCode: true
        }
      });

      let nextNumber = 1;
      
      if (lastRepair?.repairCode) {
        const match = lastRepair.repairCode.match(/REP-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const paddedNumber = nextNumber.toString().padStart(4, '0');
      const newCode = `REP-${paddedNumber}`;

      const exists = await prisma.repairLog.findUnique({
        where: { repairCode: newCode }
      });

      if (!exists) {
        return newCode;
      }

      retryCount++;
    } catch (error) {
      console.error('Error generating repair code:', error);
      retryCount++;
      if (retryCount >= maxRetries) {
        throw new Error('Failed to generate unique repair code after multiple attempts');
      }
    }
  }

  throw new Error('Failed to generate unique repair code');
}

/**
 * Generate a sequential transfer code in format STR-XXXX
 * @param prisma - Prisma client instance
 * @returns Promise<string> - The generated transfer code
 */
export async function generateTransferCode(prisma: PrismaClient): Promise<string> {
  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const lastTransfer = await prisma.stockTransferRequest.findFirst({
        where: {
          transferCode: {
            not: null
          }
        },
        orderBy: {
          transferCode: 'desc'
        },
        select: {
          transferCode: true
        }
      });

      let nextNumber = 1;
      
      if (lastTransfer?.transferCode) {
        const match = lastTransfer.transferCode.match(/STR-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const paddedNumber = nextNumber.toString().padStart(4, '0');
      const newCode = `STR-${paddedNumber}`;

      const exists = await prisma.stockTransferRequest.findUnique({
        where: { transferCode: newCode }
      });

      if (!exists) {
        return newCode;
      }

      retryCount++;
    } catch (error) {
      console.error('Error generating transfer code:', error);
      retryCount++;
      if (retryCount >= maxRetries) {
        throw new Error('Failed to generate unique transfer code after multiple attempts');
      }
    }
  }

  throw new Error('Failed to generate unique transfer code');
}

/**
 * Generate a sequential task code in format TASK-XXXX
 * @param prisma - Prisma client instance
 * @returns Promise<string> - The generated task code
 */
export async function generateTaskCode(prisma: PrismaClient): Promise<string> {
  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const lastTask = await prisma.task.findFirst({
        where: {
          taskCode: {
            not: null
          }
        },
        orderBy: {
          taskCode: 'desc'
        },
        select: {
          taskCode: true
        }
      });

      let nextNumber = 1;
      
      if (lastTask?.taskCode) {
        const match = lastTask.taskCode.match(/TASK-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const paddedNumber = nextNumber.toString().padStart(4, '0');
      const newCode = `TASK-${paddedNumber}`;

      const exists = await prisma.task.findUnique({
        where: { taskCode: newCode }
      });

      if (!exists) {
        return newCode;
      }

      retryCount++;
    } catch (error) {
      console.error('Error generating task code:', error);
      retryCount++;
      if (retryCount >= maxRetries) {
        throw new Error('Failed to generate unique task code after multiple attempts');
      }
    }
  }

  throw new Error('Failed to generate unique task code');
}

/**
 * Assign company codes to existing companies without codes
 * Used for migration purposes
 * @param prisma - Prisma client instance
 */
export async function migrateExistingCompanyCodes(prisma: PrismaClient): Promise<void> {
  const companiesWithoutCode = await prisma.company.findMany({
    where: {
      companyCode: null
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log(`Found ${companiesWithoutCode.length} companies without codes`);

  for (const company of companiesWithoutCode) {
    try {
      const newCode = await generateCompanyCode(prisma);
      await prisma.company.update({
        where: { id: company.id },
        data: { companyCode: newCode }
      });
      console.log(`Assigned code ${newCode} to company ${company.companyName}`);
    } catch (error) {
      console.error(`Failed to assign code to company ${company.id}:`, error);
    }
  }
}