import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import * as XLSX from 'xlsx';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all users
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        telephone: true,
        address: true,
        speciality: true,
        role: true,
        isActive: true,
      },
    });

    // Transform users data for Excel export
    const exportData = users.map(user => ({
      'Prénom': user.firstName,
      'Nom': user.lastName,
      'Email': user.email,
      'Rôle': user.role,
      'Téléphone': user.telephone || '',
      'Adresse': user.address || '',
      'Spécialité': user.speciality || '',
      'Actif': user.isActive ? 'Oui' : 'Non'
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Utilisateurs');

    // Generate Excel buffer
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // Set response headers for Excel file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=utilisateurs_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    return res.status(200).send(excelBuffer);
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: 'Failed to export users' });
  }
}