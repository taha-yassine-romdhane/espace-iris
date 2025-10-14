import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Role, Affiliation, BeneficiaryType } from '@/types';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to normalize Tunisian phone numbers
function normalizeTunisianPhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it starts with +216, keep it as is
  if (cleaned.startsWith('+216')) {
    return cleaned;
  }
  
  // If it starts with 216, add +
  if (cleaned.startsWith('216')) {
    return '+' + cleaned;
  }
  
  // If it's 8 digits starting with 2-9, add +216
  if (/^[2-9]\d{7}$/.test(cleaned)) {
    return '+216' + cleaned;
  }
  
  // Return as-is if doesn't match expected patterns
  return phone;
}

// Helper function to validate Tunisian CIN
function validateTunisianCIN(cin: string): boolean {
  if (!cin) return true; // CIN is optional
  return /^\d{8}$/.test(cin);
}

// Helper function to validate Tunisian tax ID
function validateTunisianTaxId(taxId: string): boolean {
  if (!taxId) return true; // Tax ID is optional
  return /^\d{7}[A-Z]{3}\d{3}$/.test(taxId);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (req.method === 'POST') {
    try {
      const form = formidable({});
      const [fields, files] = await form.parse(req);
      
      const data = Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      );

      const type = data.type as 'Patient' | 'Société';
      const names = data.nomComplet?.split(' ') || [];

      // Handle file upload if present
      let fileData = {};
      
      // Check for temporary files in the request data
      let tempFiles = [];
      if (data.existingFiles) {
        try {
          tempFiles = typeof data.existingFiles === 'string' 
            ? JSON.parse(data.existingFiles) 
            : data.existingFiles;
          console.log('Found temporary files:', tempFiles);
        } catch (error) {
          console.error('Error parsing existingFiles:', error);
        }
      }
      
      // Handle direct file upload if present (legacy support)
      if (files.files) {
        const filesToUpload = Array.isArray(files.files) ? files.files : [files.files];
        console.log('Processing files:', filesToUpload.length, 'files');
        
        const uploadPromises = filesToUpload.map(async (file) => {
          console.log('Processing file:', file.originalFilename);
          const bytes = await fs.readFile(file.filepath);
          const uploadDir = path.join(process.cwd(), 'public', 'uploads');
          await fs.mkdir(uploadDir, { recursive: true });
          const fileName = `${Date.now()}-${file.originalFilename}`;
          const filePath = path.join(uploadDir, fileName);
          await fs.writeFile(filePath, bytes);
          console.log('File saved to:', filePath);
          return {
            url: `/uploads/${fileName}`,
            type: 'IMAGE'
          };
        });

        const processedFiles = await Promise.all(uploadPromises);
        console.log('Uploaded files:', processedFiles);

        if (processedFiles.length > 0) {
          fileData = {
            files: {
              create: processedFiles
            }
          };
        }
      }

      if (type === 'Patient') {
        try {
          // Validate Tunisian-specific fields
          if (data.cin && !validateTunisianCIN(data.cin)) {
            res.status(400).json({ error: 'CIN invalide. Le CIN doit contenir exactement 8 chiffres.' });
            return;
          }

          // Normalize phone numbers
          const normalizedPhone = normalizeTunisianPhone(data.telephonePrincipale as string);
          const normalizedPhoneTwo = data.telephoneSecondaire ? normalizeTunisianPhone(data.telephoneSecondaire as string) : null;

          const doctor = await prisma.doctor.findFirst({
            where: {
              userId: data.medecin || undefined
            }
          });

          if (!doctor) {
            res.status(400).json({ error: 'Doctor not found' });
            return;
          }

          const patient = await prisma.patient.create({
            data: {
              firstName: names[0] || '',
              lastName: names.slice(1).join(' '),
              telephone: normalizedPhone,
              telephoneTwo: normalizedPhoneTwo, // Fixed: mapping telephoneSecondaire to telephoneTwo
              governorate: data.governorate || null,
              delegation: data.delegation || null,
              detailedAddress: data.detailedAddress || null,
              dateOfBirth: data.dateNaissance ? new Date(data.dateNaissance) : null,
              cin: data.cin || null,
              cnamId: data.identifiantCNAM || null,
              height: data.taille ? parseFloat(data.taille) : null,
              weight: data.poids ? parseFloat(data.poids) : null,
              medicalHistory: data.antecedant || null,
              generalNote: data.generalNote || null,
              affiliation: (data.caisseAffiliation as Affiliation) || null,
              beneficiaryType: data.beneficiaire as BeneficiaryType || null,
              doctorId: doctor.id,
              technicianId: data.technicienResponsable || null,
              supervisorId: data.superviseur || null,
              userId: session.user.id,
              ...fileData
            },
            include: {
              doctor: {
                include: {
                  user: true
                }
              },
              technician: true,
              supervisor: true,
              assignedTo: true,
              files: true
            }
          });

          res.status(201).json({
            id: patient.id,
            type: 'Patient',
            nom: `${patient.firstName} ${patient.lastName}`,
            adresse: `${patient.governorate || ''} ${patient.delegation || ''} ${patient.detailedAddress || ''}`.trim(),
            governorate: patient.governorate || '',
            delegation: patient.delegation || '',
            detailedAddress: patient.detailedAddress || '',
            telephone: patient.telephone,
            telephoneSecondaire: patient.telephoneTwo || '',
            doctor: patient.doctor?.user ? {
              id: patient.doctor.user.id,
              name: `${patient.doctor.user.firstName} ${patient.doctor.user.lastName}`,
              role: patient.doctor.user.role as Role
            } : null,
            technician: patient.technician ? {
              id: patient.technician.id,
              name: `${patient.technician.firstName} ${patient.technician.lastName}`,
              role: patient.technician.role
            } : null,
            supervisor: patient.supervisor ? {
              id: patient.supervisor.id,
              name: `${patient.supervisor.firstName} ${patient.supervisor.lastName}`,
              role: patient.supervisor.role
            } : null,
            dateNaissance: patient.dateOfBirth ? formatDateForInput(patient.dateOfBirth) : null,
            cin: patient.cin,
            identifiantCNAM: patient.cnamId,
            cnam: !!patient.cnamId,
            taille: patient.height,
            poids: patient.weight,
            imc: patient.height && patient.weight
              ? (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1)
              : null,
            antecedant: patient.medicalHistory,
            generalNote: patient.generalNote || '',
            caisseAffiliation: patient.affiliation,
            beneficiaire: patient.beneficiaryType,
            files: patient.files.map((file) => ({
              id: file.id,
              url: file.url,
              type: file.type,
              createdAt: file.createdAt
            })),
            createdAt: patient.createdAt
          });
          
          // Handle temporary files if any
          if (tempFiles.length > 0) {
            try {
              const moveResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/files/move-temp`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Cookie': req.headers.cookie || '' // Pass cookies for authentication
                },
                body: JSON.stringify({
                  tempFiles,
                  patientId: patient.id
                })
              });
              
              if (!moveResponse.ok) {
                console.error('Failed to move temporary files:', await moveResponse.text());
              } else {
                console.log('Successfully moved temporary files for patient:', patient.id);
              }
            } catch (error) {
              console.error('Error moving temporary files:', error);
              // Don't fail the patient creation if file moving fails
            }
          }
          
          return;
        } catch (error) {
          console.error('Error creating patient:', error);
          res.status(400).json({ error: 'Failed to create patient: ' + (error instanceof Error ? error.message : 'Unknown error') });
          return;
        }
      } else if (type === 'Société') {
        try {
          // Validate Tunisian-specific fields
          if (data.matriculeFiscale && !validateTunisianTaxId(data.matriculeFiscale)) {
            res.status(400).json({ error: 'Matricule fiscal invalide. Format attendu: 1234567ABC123' });
            return;
          }

          // Normalize phone numbers
          const normalizedPhone = normalizeTunisianPhone(data.telephonePrincipale as string);
          const normalizedPhoneTwo = data.telephoneSecondaire ? normalizeTunisianPhone(data.telephoneSecondaire as string) : null;

          const company = await prisma.company.create({
            data: {
              companyName: data.nomSociete || '',
              telephone: normalizedPhone,
              telephoneSecondaire: normalizedPhoneTwo,
              governorate: data.governorate || null,
              delegation: data.delegation || null,
              detailedAddress: data.detailedAddress || null,
              taxId: data.matriculeFiscale || null,
              generalNote: data.generalNote || null,
              userId: session.user.id,
              technicianId: data.technicienResponsable || null,
              ...(fileData)
            },
            include: {
              technician: true,
              assignedTo: true,
              files: true
            }
          });

          res.status(201).json({
            id: company.id,
            type: 'Société',
            nom: company.companyName,
            adresse: `${company.governorate || ''} ${company.delegation || ''} ${company.detailedAddress || ''}`.trim(),
            governorate: company.governorate || '',
            delegation: company.delegation || '',
            detailedAddress: company.detailedAddress || '',
            telephone: company.telephone,
            telephoneSecondaire: company.telephoneSecondaire || '',
            matriculeFiscale: company.taxId || '',
            technician: company.technician ? {
              id: company.technician.id,
              name: `${company.technician.firstName} ${company.technician.lastName}`,
              role: company.technician.role
            } : null,
            generalNote: company.generalNote || '',
            files: company.files.map((file) => ({
              id: file.id,
              url: file.url,
              type: file.type,
              createdAt: file.createdAt
            })),
            createdAt: company.createdAt
          });
          
          // Handle temporary files if any
          if (tempFiles.length > 0) {
            try {
              const moveResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/files/move-temp`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Cookie': req.headers.cookie || '' // Pass cookies for authentication
                },
                body: JSON.stringify({
                  tempFiles,
                  companyId: company.id
                })
              });
              
              if (!moveResponse.ok) {
                console.error('Failed to move temporary files:', await moveResponse.text());
              } else {
                console.log('Successfully moved temporary files for company:', company.id);
              }
            } catch (error) {
              console.error('Error moving temporary files:', error);
              // Don't fail the company creation if file moving fails
            }
          }
          
          return;
        } catch (error) {
          console.error('Error creating company:', error);
          res.status(400).json({ error: 'Failed to create company: ' + (error instanceof Error ? error.message : 'Unknown error') });
          return;
        }
      }

      res.status(400).json({ error: 'Invalid type' });
      return;
    } catch (error) {
      console.error('Error handling form data:', error);
      res.status(400).json({ error: 'Failed to handle form data: ' + (error instanceof Error ? error.message : 'Unknown error') });
      return;
    }
  } else if (req.method === 'PUT') {
    try {
      const form = formidable({});
      const [fields, files] = await form.parse(req);
      
      const data = Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      );

      const type = data.type as 'Patient' | 'Société';
      const id = data.id;

      if (!id) {
        res.status(400).json({ error: 'ID is required for updates' });
        return;
      }

      if (type === 'Patient') {
        try {
          const names = data.nomComplet?.split(' ') || [];

          // Validate Tunisian-specific fields
          if (data.cin && !validateTunisianCIN(data.cin)) {
            res.status(400).json({ error: 'CIN invalide. Le CIN doit contenir exactement 8 chiffres.' });
            return;
          }

          // Normalize phone numbers
          const normalizedPhone = normalizeTunisianPhone(data.telephonePrincipale as string);
          const normalizedPhoneTwo = data.telephoneSecondaire ? normalizeTunisianPhone(data.telephoneSecondaire) : null;

          // First verify the doctor exists if one is specified
          let doctorId = null;
          if (data.medecin) {
            const doctor = await prisma.doctor.findFirst({
              where: {
                userId: data.medecin
              }
            });
            if (!doctor) {
              res.status(400).json({ error: 'Doctor not found' });
              return;
            }
            doctorId = doctor.id;
          }

          // Get existing files if this is an update
          let existingFiles = [];
          if (data.id) {
            const currentPatient = await prisma.patient.findUnique({
              where: { id: data.id },
              include: { files: true }
            });
            existingFiles = currentPatient?.files || [];
          }

          const patient = await prisma.patient.update({
            where: { id: data.id },
            data: {
              firstName: names[0] || '',
              lastName: names.slice(1).join(' '),
              telephone: normalizedPhone,
              telephoneTwo: normalizedPhoneTwo, // Fixed: consistent field mapping
              governorate: data.governorate || null,
              delegation: data.delegation || null,
              detailedAddress: data.detailedAddress || null,
              dateOfBirth: data.dateNaissance ? new Date(data.dateNaissance) : null,
              cin: data.cin || null,
              cnamId: data.identifiantCNAM || null,
              height: data.taille ? parseFloat(data.taille) : null,
              weight: data.poids ? parseFloat(data.poids) : null,
              medicalHistory: data.antecedant || null,
              generalNote: data.generalNote || null,
              affiliation: (data.caisseAffiliation as Affiliation) || null,
              beneficiaryType: data.beneficiaire as BeneficiaryType || null,
              doctorId: doctorId,
              technicianId: data.technicienResponsable || null,
              supervisorId: data.superviseur || null,
              ...(files.files ? {
                files: {
                  // Don't delete existing files, just add new ones
                  create: await Promise.all(
                    (Array.isArray(files.files) ? files.files : [files.files]).map(async (file) => {
                      const bytes = await fs.readFile(file.filepath);
                      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
                      await fs.mkdir(uploadDir, { recursive: true });
                      const fileName = `${Date.now()}-${file.originalFilename}`;
                      const filePath = path.join(uploadDir, fileName);
                      await fs.writeFile(filePath, bytes);
                      return {
                        url: `/uploads/${fileName}`,
                        type: 'IMAGE'
                      };
                    })
                  )
                }
              } : {})
            },
            include: {
              doctor: {
                include: {
                  user: true
                }
              },
              technician: true,
              supervisor: true,
              assignedTo: true,
              files: true
            }
          });

          res.status(200).json({
            id: patient.id,
            type: 'Patient',
            nom: `${patient.firstName} ${patient.lastName}`,
            adresse: `${patient.governorate || ''} ${patient.delegation || ''} ${patient.detailedAddress || ''}`.trim(),
            governorate: patient.governorate || '',
            delegation: patient.delegation || '',
            detailedAddress: patient.detailedAddress || '',
            telephone: patient.telephone,
            telephoneSecondaire: patient.telephoneTwo || '',
            doctor: patient.doctor?.user ? {
              id: patient.doctor.user.id,
              name: `${patient.doctor.user.firstName} ${patient.doctor.user.lastName}`,
              role: patient.doctor.user.role as Role
            } : null,
            technician: patient.technician ? {
              id: patient.technician.id,
              name: `${patient.technician.firstName} ${patient.technician.lastName}`,
              role: patient.technician.role
            } : null,
            supervisor: patient.supervisor ? {
              id: patient.supervisor.id,
              name: `${patient.supervisor.firstName} ${patient.supervisor.lastName}`,
              role: patient.supervisor.role
            } : null,
            dateNaissance: patient.dateOfBirth ? formatDateForInput(patient.dateOfBirth) : null,
            cin: patient.cin,
            identifiantCNAM: patient.cnamId,
            antecedant: patient.medicalHistory || '',
            taille: patient.height,
            poids: patient.weight,
            imc: patient.height && patient.weight
              ? (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1)
              : null,
            generalNote: patient.generalNote || '',
            caisseAffiliation: patient.affiliation || '',
            beneficiaire: patient.beneficiaryType || '',
            files: patient.files.map((file) => ({
              id: file.id,
              url: file.url,
              type: file.type,
              createdAt: file.createdAt
            })),
            createdAt: patient.createdAt
          });
          return;
        } catch (error) {
          console.error('Error updating patient:', error);
          res.status(400).json({ error: 'Failed to update patient: ' + (error instanceof Error ? error.message : 'Unknown error') });
          return;
        }
      } else if (type === 'Société') {
        try {
          // Validate Tunisian-specific fields
          if (data.matriculeFiscale && !validateTunisianTaxId(data.matriculeFiscale)) {
            res.status(400).json({ error: 'Matricule fiscal invalide. Format attendu: 1234567ABC123' });
            return;
          }

          // Normalize phone numbers
          const normalizedPhone = normalizeTunisianPhone(data.telephonePrincipale as string);
          const normalizedPhoneTwo = data.telephoneSecondaire ? normalizeTunisianPhone(data.telephoneSecondaire) : null;

          // Get existing files if this is an update
          let existingFiles: any[] = [];
          if (id) {
            const currentCompany = await prisma.company.findUnique({
              where: { id },
              include: { files: true }
            });
            existingFiles = currentCompany?.files || [];
          }

          const company = await prisma.company.update({
            where: { id },
            data: {
              companyName: data.nomSociete || '',
              telephone: normalizedPhone,
              telephoneSecondaire: normalizedPhoneTwo,
              governorate: data.governorate || null,
              delegation: data.delegation || null,
              detailedAddress: data.detailedAddress || null,
              taxId: data.matriculeFiscale || null,
              generalNote: data.generalNote || null,
              technicianId: data.technicienResponsable || null,
              ...(files.files ? {
                files: {
                  // Don't delete existing files, just add new ones
                  create: await Promise.all(
                    (Array.isArray(files.files) ? files.files : [files.files]).map(async (file) => {
                      const bytes = await fs.readFile(file.filepath);
                      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
                      await fs.mkdir(uploadDir, { recursive: true });
                      const fileName = `${Date.now()}-${file.originalFilename}`;
                      const filePath = path.join(uploadDir, fileName);
                      await fs.writeFile(filePath, bytes);
                      return {
                        url: `/uploads/${fileName}`,
                        type: 'IMAGE'
                      };
                    })
                  )
                }
              } : {})
            },
            include: {
              technician: true,
              assignedTo: true,
              files: true
            }
          });

          res.status(200).json({
            id: company.id,
            type: 'Société',
            nom: company.companyName,
            adresse: `${company.governorate || ''} ${company.delegation || ''} ${company.detailedAddress || ''}`.trim(),
            governorate: company.governorate || '',
            delegation: company.delegation || '',
            detailedAddress: company.detailedAddress || '',
            telephone: company.telephone,
            telephoneSecondaire: company.telephoneSecondaire || '',
            matriculeFiscale: company.taxId || '',
            technician: company.technician ? {
              id: company.technician.id,
              name: `${company.technician.firstName} ${company.technician.lastName}`,
              role: company.technician.role
            } : null,
            generalNote: company.generalNote || '',
            files: company.files.map((file) => ({
              id: file.id,
              url: file.url,
              type: file.type,
              createdAt: file.createdAt
            })),
            createdAt: company.createdAt
          });
          return;
        } catch (error) {
          console.error('Error updating company:', error);
          res.status(400).json({ error: 'Failed to update company: ' + (error instanceof Error ? error.message : 'Unknown error') });
          return;
        }
      }

      res.status(400).json({ error: 'Invalid type' });
      return;
    } catch (error) {
      console.error('Error handling form data:', error);
      res.status(400).json({ error: 'Failed to handle form data: ' + (error instanceof Error ? error.message : 'Unknown error') });
      return;
    }
  } else if (req.method === 'GET') {
    try {
      const [patients, companies] = await Promise.all([
        prisma.patient.findMany({
          include: {
            doctor: {
              include: {
                user: true
              }
            },
            technician: true,
            supervisor: true,
            assignedTo: true,
            files: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.company.findMany({
          include: {
            technician: true,
            assignedTo: true,
            files: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        })
      ]);

      const transformedPatients = patients.map((patient) => ({
        id: patient.id,
        patientCode: patient.patientCode,
        type: 'Patient' as const,
        nom: `${patient.firstName} ${patient.lastName}`,
        adresse: `${patient.governorate || ''} ${patient.delegation || ''} ${patient.detailedAddress || ''}`.trim(),
        governorate: patient.governorate || '',
        delegation: patient.delegation || '',
        detailedAddress: patient.detailedAddress || '',
        telephone: patient.telephone,
        telephoneSecondaire: patient.telephoneTwo || '',
        doctor: patient.doctor?.user ? {
          id: patient.doctor.user.id,
          name: `${patient.doctor.user.firstName} ${patient.doctor.user.lastName}`,
          role: patient.doctor.user.role as Role
        } : null,
        technician: patient.technician ? {
          id: patient.technician.id,
          name: `${patient.technician.firstName} ${patient.technician.lastName}`,
          role: patient.technician.role
        } : null,
        supervisor: patient.supervisor ? {
          id: patient.supervisor.id,
          name: `${patient.supervisor.firstName} ${patient.supervisor.lastName}`,
          role: patient.supervisor.role
        } : null,
        dateNaissance: patient.dateOfBirth ? formatDateForInput(patient.dateOfBirth) : null,
        cin: patient.cin,
        identifiantCNAM: patient.cnamId,
        cnam: !!patient.cnamId,
        antecedant: patient.medicalHistory || '',
        taille: patient.height,
        poids: patient.weight,
        imc: patient.height && patient.weight
          ? (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1)
          : null,
        generalNote: patient.generalNote || '',
        caisseAffiliation: patient.affiliation as Affiliation,
        beneficiaire: patient.beneficiaryType as BeneficiaryType,
        files: patient.files?.map((file: { id: string; url: string; type: string; createdAt: Date; }) => ({
          id: file.id,
          url: file.url,
          type: file.type,
          createdAt: file.createdAt
        })) || [],
        createdAt: patient.createdAt
      }));

      const transformedCompanies = companies.map((company ) => ({
        id: company.id,
        companyCode: company.companyCode,
        type: 'Société' as const,
        nom: company.companyName,
        adresse: `${company.governorate || ''} ${company.delegation || ''} ${company.detailedAddress || ''}`.trim(),
        governorate: company.governorate || '',
        delegation: company.delegation || '',
        detailedAddress: company.detailedAddress || '',
        telephone: company.telephone,
        telephoneSecondaire: company.telephoneSecondaire || '',
        matriculeFiscale: company.taxId || '',
        technician: company.technician ? {
          id: company.technician.id,
          name: `${company.technician.firstName} ${company.technician.lastName}`,
          role: company.technician.role as Role
        } : null,
        generalNote: company.generalNote || '',
        files: company.files?.map((file: { id: string; url: string; type: string; createdAt: Date; }) => ({
          id: file.id,
          url: file.url,
          type: file.type,
          createdAt: file.createdAt
        })) || [],
        createdAt: company.createdAt
      }));

      // Sort all items by creation date
      const allItems = [...transformedPatients, ...transformedCompanies]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      res.status(200).json(allItems);
      return;
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ error: 'Failed to fetch data: ' + (error instanceof Error ? error.message : 'Unknown error') });
      return;
    }
  } else if (req.method === 'DELETE') {
    try {
      const id = req.query.id as string;
      const type = req.query.type as string;

      if (!id) {
        res.status(400).json({ error: 'ID is required for deletion' });
        return;
      }

      if (type === 'Patient') {
        await prisma.patient.delete({
          where: { id }
        });
      } else if (type === 'Société') {
        await prisma.company.delete({
          where: { id }
        });
      } else {
        res.status(400).json({ error: 'Invalid type' });
        return;
      }

      res.status(200).json({ message: 'Deleted successfully' });
      return;
    } catch (error) {
      console.error('Error deleting:', error);
      res.status(400).json({ error: 'Failed to delete: ' + (error instanceof Error ? error.message : 'Unknown error') });
      return;
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}