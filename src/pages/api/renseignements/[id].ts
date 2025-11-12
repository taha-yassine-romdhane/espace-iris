import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'You must be logged in to access this resource' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID parameter' });
  }

  try {
    if (req.method === 'GET') {
      // First, try to find a patient with this ID - fetch ALL related data
      const patient = await prisma.patient.findUnique({
        where: { id },
        select: {
          id: true,
          patientCode: true,
          firstName: true,
          lastName: true,
          telephone: true,
          telephoneTwo: true,
          governorate: true,
          delegation: true,
          detailedAddress: true,
          addressCoordinates: true,
          cin: true,
          cnamId: true,
          antecedant: true,
          height: true,
          weight: true,
          dateOfBirth: true,
          beneficiaryType: true,
          affiliation: true,
          generalNote: true,
          doctorId: true,
          technicianId: true,
          supervisorId: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
          doctor: {
            include: {
              user: true
            }
          },
          technician: true,
          supervisor: true,
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          },
          files: true,
          // Include ALL related data for complete patient CV
          diagnostics: {
            include: {
              performedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              },
              medicalDevice: {
                select: {
                  id: true,
                  name: true,
                  serialNumber: true,
                  brand: true,
                }
              },
              result: {
                select: {
                  iah: true,
                  idValue: true,
                  status: true,
                  remarque: true,
                }
              }
            },
            orderBy: {
              diagnosticDate: 'desc'
            }
          },
          payments: {
            include: {
              sale: {
                select: {
                  id: true,
                  saleCode: true,
                  totalAmount: true,
                  saleDate: true,
                }
              },
              rental: {
                select: {
                  id: true,
                  rentalCode: true,
                }
              },
              paymentDetails: {
                select: {
                  method: true,
                  amount: true,
                }
              }
            },
            orderBy: {
              paymentDate: 'desc'
            }
          },
          rentals: {
            select: {
              id: true,
              rentalCode: true,
              startDate: true,
              endDate: true,
              status: true,
              alertDate: true,
              titrationReminderDate: true,
              appointmentDate: true,
              notes: true,
              medicalDevice: {
                select: {
                  id: true,
                  name: true,
                  serialNumber: true,
                  type: true,
                  deviceCode: true,
                  brand: true,
                  model: true,
                }
              },
              cnamBons: {
                select: {
                  id: true,
                  bonNumber: true,
                  dossierNumber: true,
                  bonType: true,
                  bonAmount: true,
                  devicePrice: true,
                  complementAmount: true,
                  status: true,
                  category: true,
                  currentStep: true,
                  coveredMonths: true,
                  createdAt: true,
                }
              },
              configuration: {
                select: {
                  rentalRate: true,
                  billingCycle: true,
                  isGlobalOpenEnded: true,
                  cnamEligible: true,
                  totalPaymentAmount: true,
                  deliveryNotes: true,
                  internalNotes: true,
                }
              },
              accessories: {
                select: {
                  id: true,
                  quantity: true,
                  unitPrice: true,
                  product: {
                    select: {
                      name: true,
                      productCode: true,
                    }
                  }
                }
              },
              createdBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              },
              assignedTo: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              },
              payments: {
                select: {
                  id: true,
                  paymentCode: true,
                  amount: true,
                  paymentDate: true,
                  status: true,
                  method: true,
                  paymentType: true,
                },
                orderBy: {
                  paymentDate: 'desc'
                },
                take: 1
              }
            }
          },
          sales: {
            include: {
              items: {
                select: {
                  id: true,
                  unitPrice: true,
                  quantity: true,
                  discount: true,
                  itemTotal: true,
                  serialNumber: true,
                  product: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                    }
                  },
                  medicalDevice: {
                    select: {
                      id: true,
                      name: true,
                      serialNumber: true,
                      type: true,
                      deviceCode: true,
                    }
                  }
                }
              },
              payments: {
                select: {
                  id: true,
                  paymentCode: true,
                  method: true,
                  amount: true,
                  paymentDate: true,
                  status: true,
                }
              },
              cnamBons: {
                select: {
                  id: true,
                  bonNumber: true,
                  dossierNumber: true,
                  bonType: true,
                  bonAmount: true,
                  devicePrice: true,
                  complementAmount: true,
                  status: true,
                  category: true,
                  currentStep: true,
                  coveredMonths: true,
                  createdAt: true,
                }
              },
              processedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              },
              assignedTo: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              }
            },
            orderBy: {
              saleDate: 'desc'
            }
          },
          PatientHistory: {
            include: {
              performedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          manualTasks: {
            include: {
              assignedTo: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              },
              createdBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        },
      });

      if (patient) {
        try {
          // Get doctor name if available
          let doctorName = 'Non assigné';
          let doctorId = null;
          if (patient.doctor && patient.doctor.user) {
            doctorId = patient.doctor.user.id; // Use the user ID, not the doctor record ID
            doctorName = `${patient.doctor.user.firstName} ${patient.doctor.user.lastName}`;
          }
          
          // Get technician name if available
          let technicianName = 'Non assigné';
          let technicianId = null;
          if (patient.technician) {
            technicianId = patient.technician.id;
            technicianName = `${patient.technician.firstName || ''} ${patient.technician.lastName || ''}`;
          }
          
          // Get supervisor name if available
          let supervisorName = 'Non assigné';
          let supervisorId = null;
          if (patient.supervisor) {
            supervisorId = patient.supervisor.id;
            supervisorName = `${patient.supervisor.firstName || ''} ${patient.supervisor.lastName || ''}`;
          } 
          
          // Get assigned user name if available
          let assignedToName = 'Non assigné';
          let assignedToId = patient.userId;
          if (patient.assignedTo) {
            assignedToId = patient.assignedTo.id;
            assignedToName = `${patient.assignedTo.firstName} ${patient.assignedTo.lastName}`;
          }
          
          // Transform the patient data to match the expected format - COMPLETE PATIENT CV
          const formattedPatient = {
            id: patient.id,
            type: 'Patient',
            patientCode: patient.patientCode,
            nom: `${patient.firstName} ${patient.lastName}`,
            firstName: patient.firstName,
            lastName: patient.lastName,
            telephone: patient.telephone,
            telephoneSecondaire: patient.telephoneTwo,
            adresse: `${patient.governorate || ''} ${patient.delegation || ''} ${patient.detailedAddress || ''}`.trim(),
            governorate: patient.governorate,
            delegation: patient.delegation,
            detailedAddress: patient.detailedAddress,
            addressCoordinates: patient.addressCoordinates,
            cin: patient.cin,
            dateNaissance: patient.dateOfBirth,
            taille: patient.height,
            poids: patient.weight,
            antecedant: patient.antecedant,
            identifiantCNAM: patient.cnamId,
            beneficiaire: patient.beneficiaryType,
            caisseAffiliation: patient.affiliation,
            generalNote: patient.generalNote,
            // Include relationship IDs for form population
            doctorId: doctorId,
            technicianId: technicianId,
            supervisorId: supervisorId,
            doctor: doctorId ? {
              id: doctorId,
              name: doctorName
            } : null,
            technician: technicianId ? {
              id: technicianId,
              name: technicianName
            } : null,
            supervisor: supervisorId ? {
              id: supervisorId,
              name: supervisorName
            } : null,
            assignedTo: {
              id: assignedToId,
              name: assignedToName
            },
            files: patient.files || [],
            // Include ALL related data for complete patient CV
            diagnostics: patient.diagnostics || [],
            // Get all devices from both sales and rentals
            devices: [
              ...(patient.sales?.flatMap(sale =>
                (sale.items || [])
                  .filter(item => item.medicalDevice)
                  .map(item => ({
                    ...item.medicalDevice,
                    source: 'sale',
                    saleCode: sale.saleCode,
                    saleDate: sale.saleDate
                  }))
              ) || []),
              ...(patient.rentals?.map(rental => ({
                ...rental.medicalDevice,
                source: 'rental',
                rentalCode: rental.rentalCode,
                startDate: rental.startDate
              })) || [])
            ],
            payments: patient.payments || [],
            rentals: patient.rentals || [],
            sales: patient.sales || [],
            // Flatten sale items for easy access
            saleItems: patient.sales?.flatMap(sale =>
              (sale.items || []).map(item => ({
                ...item,
                saleCode: sale.saleCode,
                saleDate: sale.saleDate
              }))
            ) || [],
            history: patient.PatientHistory || [],
            manualTasks: patient.manualTasks || [],
            createdAt: patient.createdAt,
            updatedAt: patient.updatedAt,
          };
          return res.status(200).json(formattedPatient);
        } catch (error) {
          console.error('Error processing patient data:', error);
          return res.status(500).json({ error: 'Error processing patient data' });
        }
      }

      // If not found as patient, try to find as company
      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          technician: true,
          files: true,
          assignedTo: true
        },
      });

      if (company) {
        try {
          // Get technician name if available
          let technicianName = 'Non assigné';
          let technicianId = null;
          if (company.technician) {
            technicianId = company.technician.id;
            technicianName = `${company.technician.firstName} ${company.technician.lastName}`;
          } 
          
          // Get assigned user name if available
          let assignedToName = 'Non assigné';
          let assignedToId = company.userId;
          if (company.assignedTo) {
            assignedToId = company.assignedTo.id;
            assignedToName = `${company.assignedTo.firstName} ${company.assignedTo.lastName}`;
          }
          
          // Transform the company data to match the expected format
          const formattedCompany = {
            id: company.id,
            type: 'Société',
            nom: company.companyName,
            nomSociete: company.companyName,
            telephone: company.telephone,
            telephoneSecondaire: company.telephoneSecondaire,
            adresse: company.detailedAddress,
            matriculeFiscale: company.taxId,
            generalNote: company.generalNote || '',
            technician: company.technician ? {
              id: technicianId,
              name: technicianName
            } : null,
            assignedTo: {
              id: assignedToId,
              name: assignedToName
            },
            files: company.files || [],
            createdAt: company.createdAt,
            updatedAt: company.updatedAt,
          };
          return res.status(200).json(formattedCompany);
        } catch (error) {
          console.error('Error processing company data:', error);
          return res.status(500).json({ error: 'Error processing company data' });
        }
      }

      // If not found in either table
      return res.status(404).json({ error: 'Renseignement not found' });
    } 
    else if (req.method === 'PATCH') {
      const data = req.body;
      
      // First, try to determine if we're updating a patient or company
      const patient = await prisma.patient.findUnique({ where: { id } });
      
      if (patient) {
        // If it's a patient, prepare the data for patient update
        const patientUpdateData: any = {};
        
        // Map the data from the request to the correct patient schema fields
        if (data.nom) {
          // Split full name into first and last name, assuming format is "First Last"
          const nameParts = data.nom.split(' ');
          if (nameParts.length > 1) {
            patientUpdateData.firstName = nameParts[0];
            patientUpdateData.lastName = nameParts.slice(1).join(' ');
          } else {
            patientUpdateData.firstName = data.nom;
          }
        }
        
        if (data.telephone) patientUpdateData.telephone = data.telephone;
        if (data.telephoneSecondaire) patientUpdateData.telephoneTwo = data.telephoneSecondaire;
        if (data.adresse) patientUpdateData.address = data.adresse;
        if (data.cin) patientUpdateData.cin = data.cin;
        if (data.dateNaissance) patientUpdateData.dateOfBirth = new Date(data.dateNaissance);
        if (data.taille) patientUpdateData.height = parseFloat(data.taille);
        if (data.poids) patientUpdateData.weight = parseFloat(data.poids);
        if (data.antecedant) patientUpdateData.antecedant = data.antecedant;
        if (data.identifiantCNAM) patientUpdateData.cnamId = data.identifiantCNAM;
        if (data.beneficiaire) patientUpdateData.beneficiaryType = data.beneficiaire;
        if (data.caisseAffiliation) patientUpdateData.affiliation = data.caisseAffiliation;
        if (data.doctorId) patientUpdateData.doctorId = data.doctorId;
        if (data.technicianId) patientUpdateData.technicianId = data.technicianId;
        if (data.assignedToId) patientUpdateData.userId = data.assignedToId;

        const result = await prisma.$transaction(async (tx) => {
          const existingPatient = await tx.patient.findUnique({
            where: { id: id as string },
            select: {
              doctorId: true,
              technicianId: true,
              userId: true,
            }
          });

          if (!existingPatient) {
            throw new Error('Patient not found');
          }

          const updatedPatient = await tx.patient.update({
          where: { id },
          data: patientUpdateData,
          include: {
            doctor: {
              select: {
                id: true,
              },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            },
            technician: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            files: true,
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          },
        });

          const historyRecords = [];

          const getUserName = async (userId: string | null) => {
            if (!userId) return 'None';
            const user = await tx.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
            return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
          };

          if (existingPatient.doctorId !== updatedPatient.doctorId) {
            historyRecords.push({
              patientId: id as string,
              actionType: 'TRANSFER' as const,
              performedById: session.user.id,
              details: {
                changeType: 'Doctor Assignment',
                from: await getUserName(existingPatient.doctorId),
                to: await getUserName(updatedPatient.doctorId),
                fromId: existingPatient.doctorId,
                toId: updatedPatient.doctorId
              }
            });
          }

          if (existingPatient.technicianId !== updatedPatient.technicianId) {
            historyRecords.push({
              patientId: id as string,
              actionType: 'TRANSFER' as const,
              performedById: session.user.id,
              details: {
                changeType: 'Technician Assignment',
                from: await getUserName(existingPatient.technicianId),
                to: await getUserName(updatedPatient.technicianId),
                fromId: existingPatient.technicianId,
                toId: updatedPatient.technicianId
              }
            });
          }

          if (existingPatient.userId !== updatedPatient.userId) {
            historyRecords.push({
              patientId: id as string,
              actionType: 'TRANSFER' as const,
              performedById: session.user.id,
              details: {
                changeType: 'User Assignment',
                from: await getUserName(existingPatient.userId),
                to: await getUserName(updatedPatient.userId),
                fromId: existingPatient.userId,
                toId: updatedPatient.userId
              }
            });
          }

          if (historyRecords.length > 0) {
            await tx.patientHistory.createMany({
              data: historyRecords,
            });
          }

          return updatedPatient;
        });

        // Format the response to match the expected format
        const formattedPatient = {
          id: result.id,
          type: 'Patient',
          nom: `${result.firstName} ${result.lastName}`,
          telephone: result.telephone,
          telephoneSecondaire: result.telephoneTwo,
          adresse: result.detailedAddress,
          cin: result.cin,
          dateNaissance: result.dateOfBirth,
          taille: result.height,
          poids: result.weight,
          antecedant: result.antecedant,
          identifiantCNAM: result.cnamId,
          beneficiaire: result.beneficiaryType,
          caisseAffiliation: result.affiliation,
          doctor: result.doctor ? {
            id: result.doctor.id,
            name: result.doctor.user ? `${result.doctor.user.firstName} ${result.doctor.user.lastName}` : 'Unknown',
          } : null,
          technician: result.technician ? {
            id: result.technician.id,
            name: `${result.technician.firstName} ${result.technician.lastName}`,
          } : null,
          files: result.files,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        };

        return res.status(200).json(formattedPatient);
      } else {
        // Try to find and update a company
        const company = await prisma.company.findUnique({ where: { id } });
        
        if (company) {
          // Prepare the data for company update
          const companyUpdateData: any = {};
          
          if (data.nomSociete) companyUpdateData.companyName = data.nomSociete;
          if (data.nom) companyUpdateData.companyName = data.nom;
          if (data.telephone) companyUpdateData.telephone = data.telephone;
          if (data.telephoneSecondaire) companyUpdateData.telephoneSecondaire = data.telephoneSecondaire;
          if (data.adresse) companyUpdateData.address = data.adresse;
          if (data.matriculeFiscale) companyUpdateData.taxId = data.matriculeFiscale;
          if (data.generalNote !== undefined) companyUpdateData.generalNote = data.generalNote;
          
          // Update the company
          const updatedCompany = await prisma.company.update({
            where: { id },
            data: companyUpdateData,
            include: {
              technician: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              files: true,
              assignedTo: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              }
            },
          });

          // Format the response
          const formattedCompany = {
            id: updatedCompany.id,
            type: 'Société',
            nom: updatedCompany.companyName,
            nomSociete: updatedCompany.companyName,
            telephone: updatedCompany.telephone,
            telephoneSecondaire: updatedCompany.telephoneSecondaire,
            adresse: updatedCompany.detailedAddress,
            matriculeFiscale: updatedCompany.taxId,
            generalNote: updatedCompany.generalNote || '',
            technician: updatedCompany.technician ? {
              id: updatedCompany.technician.id,
              name: `${updatedCompany.technician.firstName} ${updatedCompany.technician.lastName}`,
            } : null,
            files: updatedCompany.files,
            createdAt: updatedCompany.createdAt,
            updatedAt: updatedCompany.updatedAt,
          };

          return res.status(200).json(formattedCompany);
        } else {
          return res.status(404).json({ error: 'Renseignement not found' });
        }
      }
    }
    else if (req.method === 'DELETE') {
      // Try to find and delete a patient first
      const patient = await prisma.patient.findUnique({ where: { id } });
      
      if (patient) {
        // First, delete any associated files
        await prisma.file.deleteMany({
          where: { patientId: id }
        });
        
        // Then, delete the patient record
        await prisma.patient.delete({
          where: { id },
        });
        
        return res.status(200).json({ message: 'Patient deleted successfully' });
      }
      
      // If not a patient, try to find and delete a company
      const company = await prisma.company.findUnique({ where: { id } });
      
      if (company) {
        // First, delete any associated files
        await prisma.file.deleteMany({
          where: { companyId: id }
        });
        
        // Then, delete the company record
        await prisma.company.delete({
          where: { id },
        });
        
        return res.status(200).json({ message: 'Company deleted successfully' });
      }
      
      // If we got here, the ID doesn't exist in either table
      return res.status(404).json({ error: 'Renseignement not found' });
    }
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'An error occurred while processing your request' });
  }
}
