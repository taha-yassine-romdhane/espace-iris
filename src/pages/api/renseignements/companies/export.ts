import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/db';
import * as XLSX from 'xlsx';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all companies with their related data
    const companies = await prisma.company.findMany({
      include: {
        technician: true,
        assignedTo: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the data for Excel export
    const excelData = companies.map(company => ({
      'Nom Société': company.companyName || '',
      'Téléphone Principal': company.telephone || '',
      'Téléphone Secondaire': company.telephoneSecondaire || '',
      'Gouvernorat': company.governorate || '',
      'Délégation': company.delegation || '',
      'Adresse Détaillée': company.detailedAddress || '',
      'Matricule Fiscal': company.taxId || '',
      'Technicien Responsable': company.technician ? `${company.technician.firstName} ${company.technician.lastName}` : '',
      'Assigné à': company.assignedTo ? `${company.assignedTo.firstName} ${company.assignedTo.lastName}` : '',
      'Notes Générales': company.generalNote || '',
      'Date Création': company.createdAt ? new Date(company.createdAt).toLocaleDateString('fr-FR') : '',
      'Date Modification': company.updatedAt ? new Date(company.updatedAt).toLocaleDateString('fr-FR') : ''
    }));

    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const columnWidths = [
      { wch: 30 }, // Nom Société
      { wch: 15 }, // Téléphone Principal
      { wch: 15 }, // Téléphone Secondaire
      { wch: 15 }, // Gouvernorat
      { wch: 20 }, // Délégation
      { wch: 30 }, // Adresse Détaillée
      { wch: 20 }, // Matricule Fiscal
      { wch: 25 }, // Technicien Responsable
      { wch: 25 }, // Assigné à
      { wch: 25 }, // Description Nom
      { wch: 25 }, // Description Téléphone
      { wch: 25 }, // Description Adresse
      { wch: 15 }, // Date Création
      { wch: 15 }  // Date Modification
    ];
    ws['!cols'] = columnWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sociétés');
    
    // Generate buffer
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    
    // Set response headers
    const fileName = `societes_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Send the file
    res.send(buffer);
    
  } catch (error) {
    console.error('Error exporting companies:', error);
    res.status(500).json({ error: 'Failed to export companies' });
  }
}