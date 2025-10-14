import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/db';
import * as XLSX from 'xlsx';
import formidable from 'formidable';
import fs from 'fs/promises';
import { Prisma } from '@prisma/client';

// Helper function to normalize phone numbers
function normalizeTunisianPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.toString().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+216')) return cleaned;
  if (cleaned.startsWith('216')) return '+' + cleaned;
  if (/^[2-9]\d{7}$/.test(cleaned)) return '+216' + cleaned;
  return phone;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the Excel file
    const buffer = await fs.readFile(file.filepath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Process the data
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Create a cache for technicians
    const technicianCache = new Map<string, string>();

    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];
      
      try {
        const companyName = row['Nom Société'];
        
        if (!companyName) {
          results.failed++;
          results.errors.push(`Ligne ${i + 2}: Nom de société manquant`);
          continue;
        }

        // Find technician if specified
        let technicianId = null;
        const technicianName = row['Technicien Responsable'];
        if (technicianName) {
          // Check cache first
          if (technicianCache.has(technicianName)) {
            technicianId = technicianCache.get(technicianName);
          } else {
            const [techFirstName, ...techLastNameParts] = technicianName.split(' ');
            const techLastName = techLastNameParts.join(' ');
            
            const technician = await prisma.user.findFirst({
              where: {
                role: 'EMPLOYEE',
                firstName: {
                  contains: techFirstName,
                  mode: 'insensitive'
                },
                lastName: {
                  contains: techLastName,
                  mode: 'insensitive'
                }
              }
            });
            
            if (technician) {
              technicianId = technician.id;
              technicianCache.set(technicianName, technician.id);
            }
          }
        }

        // Normalize phone numbers
        const telephone = row['Téléphone Principal'] ? normalizeTunisianPhone(row['Téléphone Principal'].toString()) : '';
        const telephoneSecondaire = row['Téléphone Secondaire'] ? normalizeTunisianPhone(row['Téléphone Secondaire'].toString()) : null;

        // Check if company already exists by name
        const existingCompany = await prisma.company.findFirst({
          where: { 
            companyName: {
              equals: companyName,
              mode: 'insensitive'
            }
          }
        });
        
        if (existingCompany) {
          results.failed++;
          results.errors.push(`Ligne ${i + 2}: Une société avec ce nom existe déjà (${companyName})`);
          continue;
        }

        // Create company data
        const companyData: Prisma.CompanyCreateInput = {
          companyName,
          telephone,
          telephoneSecondaire,
          governorate: row['Gouvernorat'] || null,
          delegation: row['Délégation'] || null,
          detailedAddress: row['Adresse Détaillée'] || null,
          taxId: row['Matricule Fiscal'] || null,
          generalNote: row['Notes Générales'] || null,
          technician: technicianId ? { connect: { id: technicianId } } : undefined,
          assignedTo: { connect: { id: session.user.id } }
        };

        // Create the company
        await prisma.company.create({ data: companyData });
        results.success++;
        
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        results.errors.push(`Ligne ${i + 2}: ${errorMessage}`);
        console.error(`Error importing company at row ${i + 2}:`, error);
      }
    }

    // Clean up the uploaded file
    await fs.unlink(file.filepath);

    res.status(200).json({
      message: `Import terminé: ${results.success} sociétés importées, ${results.failed} échecs`,
      results
    });
    
  } catch (error) {
    console.error('Error importing companies:', error);
    res.status(500).json({ error: 'Failed to import companies' });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};