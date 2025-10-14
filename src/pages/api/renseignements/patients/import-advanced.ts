import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

interface ImportPatient {
  _rowIndex?: number;
  firstName?: string;
  lastName?: string;
  telephone?: string;
  telephoneTwo?: string;
  dateOfBirth?: string;
  cin?: string;
  cnamId?: string;
  generalNote?: string;
  governorate?: string;
  delegation?: string;
  detailedAddress?: string;
  weight?: string | number;
  height?: string | number;
  medicalHistory?: string;
  antecedant?: string;
  [key: string]: any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const { patients, mapping } = req.body;

    if (!Array.isArray(patients) || patients.length === 0) {
      return res.status(400).json({ error: 'Aucun patient à importer' });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
      duplicates: [] as Array<{ row: number; phone: string }>
    };

    // Process patients in batches
    for (const patient of patients) {
      try {
        const rowIndex = patient._rowIndex || 0;

        // Validate required fields
        if (!patient.firstName || !patient.lastName || !patient.telephone) {
          results.failed++;
          results.errors.push({
            row: rowIndex,
            error: 'Prénom, nom et téléphone sont requis'
          });
          continue;
        }

        // Format phone number
        let formattedPhone = patient.telephone.toString().trim();
        formattedPhone = formattedPhone.replace(/\s+/g, '');
        if (!formattedPhone.startsWith('+216') && formattedPhone.length === 8) {
          formattedPhone = '+216' + formattedPhone;
        }

        // Check for duplicates
        const existingPatient = await prisma.patient.findFirst({
          where: { telephone: formattedPhone }
        });

        if (existingPatient) {
          results.failed++;
          results.duplicates.push({
            row: rowIndex,
            phone: formattedPhone
          });
          continue;
        }

        // Parse dates
        let dateOfBirth = null;
        if (patient.dateOfBirth) {
          try {
            // Handle different date formats
            const dateStr = patient.dateOfBirth.toString();
            if (dateStr.includes('/')) {
              const [day, month, year] = dateStr.split('/');
              dateOfBirth = new Date(`${year}-${month}-${day}`);
            } else if (dateStr.includes('-')) {
              dateOfBirth = new Date(dateStr);
            }
          } catch (e) {
            console.error('Date parsing error:', e);
          }
        }

        // Parse numbers
        let weight = null;
        let height = null;
        let imc = null;

        if (patient.weight) {
          weight = parseFloat(patient.weight.toString());
        }
        if (patient.height) {
          height = parseFloat(patient.height.toString());
        }

        // Calculate BMI if both weight and height are provided
        if (weight && height) {
          const heightInMeters = height / 100;
          imc = weight / (heightInMeters * heightInMeters);
        }

        // Create patient
        await prisma.patient.create({
          data: {
            firstName: patient.firstName.trim(),
            lastName: patient.lastName.trim(),
            telephone: formattedPhone,
            telephoneTwo: patient.telephoneTwo?.toString().trim() || null,
            dateOfBirth,
            cin: patient.cin?.toString().trim() || null,
            cnamId: patient.cnamId?.toString().trim() || null,
            generalNote: patient.generalNote?.toString().trim() || null,
            governorate: patient.governorate?.toString().trim() || null,
            delegation: patient.delegation?.toString().trim() || null,
            detailedAddress: patient.detailedAddress?.toString().trim() || null,
            weight,
            height,
            imc,
            medicalHistory: patient.medicalHistory?.toString().trim() || null,
            antecedant: patient.antecedant?.toString().trim() || null,
            userId: session.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        results.success++;
      } catch (error) {
        console.error('Error importing patient:', error);
        results.failed++;
        results.errors.push({
          row: patient._rowIndex || 0,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Import terminé: ${results.success} réussis, ${results.failed} échoués`,
      results
    });

  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de l\'import des patients' 
    });
  }
}