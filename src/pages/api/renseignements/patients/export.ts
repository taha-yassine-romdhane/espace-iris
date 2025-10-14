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
    // Fetch all patients with their related data
    const patients = await prisma.patient.findMany({
      include: {
        doctor: {
          include: {
            user: true
          }
        },
        technician: true,
        assignedTo: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the data for Excel export
    const excelData = patients.map(patient => ({
      'Nom Complet': `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
      'Téléphone Principal': patient.telephone || '',
      'Téléphone Secondaire': patient.telephoneTwo || '',
      'Gouvernorat': patient.governorate || '',
      'Délégation': patient.delegation || '',
      'Adresse Détaillée': patient.detailedAddress || '',
      'CIN': patient.cin || '',
      'Date de Naissance': patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('fr-FR') : '',
      'CNAM ID': patient.cnamId || '',
      'Type Bénéficiaire': patient.beneficiaryType || '',
      'Caisse Affiliation': patient.affiliation || '',
      'Taille (cm)': patient.height || '',
      'Poids (kg)': patient.weight || '',
      'IMC': patient.height && patient.weight ? (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1) : '',
      'Antécédents': patient.medicalHistory || '',
      'Médecin Responsable': patient.doctor?.user ? `Dr ${patient.doctor.user.firstName} ${patient.doctor.user.lastName}` : '',
      'Technicien Responsable': patient.technician ? `${patient.technician.firstName} ${patient.technician.lastName}` : '',
      'Assigné à': patient.assignedTo ? `${patient.assignedTo.firstName} ${patient.assignedTo.lastName}` : '',
      'Note Générale': (patient as any).generalNote || '',
      'Date Création': patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('fr-FR') : '',
      'Date Modification': patient.updatedAt ? new Date(patient.updatedAt).toLocaleDateString('fr-FR') : ''
    }));

    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const columnWidths = [
      { wch: 25 }, // Nom Complet
      { wch: 15 }, // Téléphone Principal
      { wch: 15 }, // Téléphone Secondaire
      { wch: 15 }, // Gouvernorat
      { wch: 20 }, // Délégation
      { wch: 30 }, // Adresse Détaillée
      { wch: 10 }, // CIN
      { wch: 15 }, // Date de Naissance
      { wch: 15 }, // CNAM ID
      { wch: 20 }, // Type Bénéficiaire
      { wch: 15 }, // Caisse Affiliation
      { wch: 10 }, // Taille
      { wch: 10 }, // Poids
      { wch: 8 },  // IMC
      { wch: 30 }, // Antécédents
      { wch: 25 }, // Médecin Responsable
      { wch: 25 }, // Technicien Responsable
      { wch: 25 }, // Assigné à
      { wch: 25 }, // Description Nom
      { wch: 25 }, // Description Téléphone
      { wch: 15 }, // Date Création
      { wch: 15 }  // Date Modification
    ];
    ws['!cols'] = columnWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Patients');
    
    // Generate buffer
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    
    // Set response headers
    const fileName = `patients_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Send the file
    res.send(buffer);
    
  } catch (error) {
    console.error('Error exporting patients:', error);
    res.status(500).json({ error: 'Failed to export patients' });
  }
}