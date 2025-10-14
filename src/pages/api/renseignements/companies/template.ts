import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
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
    // Create sample data for the template
    const templateData = [
      {
        'Nom Société': 'Société Industrielle Tunisienne',
        'Téléphone Principal': '+21671234567',
        'Téléphone Secondaire': '+21695987654',
        'Gouvernorat': 'tunis',
        'Délégation': 'tunis_ville',
        'Adresse Détaillée': '10 Avenue de la République, Immeuble Business Center',
        'Matricule Fiscal': '1234567A',
        'Technicien Responsable': 'Ahmed Gazzeh',
        'Assigné à': '', // Sera automatiquement assigné à l'utilisateur qui importe
        'Description Nom': 'Société spécialisée dans l\'industrie',
        'Description Téléphone': 'Ligne directe du bureau principal',
        'Description Adresse': 'Siège social principal',
        'Date Création': '', // Sera automatiquement remplie
        'Date Modification': '' // Sera automatiquement remplie
      },
      {
        'Nom Société': 'Entreprise Services Médicaux',
        'Téléphone Principal': '72654321',
        'Téléphone Secondaire': '',
        'Gouvernorat': 'sfax',
        'Délégation': 'sfax_ville',
        'Adresse Détaillée': 'Zone industrielle Sud, Bloc B',
        'Matricule Fiscal': '9876543B',
        'Technicien Responsable': 'Ahmed Gazzeh',
        'Assigné à': '',
        'Description Nom': '',
        'Description Téléphone': '',
        'Description Adresse': '',
        'Date Création': '',
        'Date Modification': ''
      },
      {
        'Nom Société': 'Tech Solutions SARL',
        'Téléphone Principal': '98456123',
        'Téléphone Secondaire': '71321654',
        'Gouvernorat': 'bizerte',
        'Délégation': 'bizerte_nord',
        'Adresse Détaillée': 'Parc technologique, Bâtiment A',
        'Matricule Fiscal': '5555666C',
        'Technicien Responsable': '',
        'Assigné à': '',
        'Description Nom': 'Société de solutions technologiques',
        'Description Téléphone': 'Support technique disponible 24/7',
        'Description Adresse': 'Campus technologique moderne',
        'Date Création': '',
        'Date Modification': ''
      }
    ];

    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    const columnWidths = [
      { wch: 30 }, // Nom Société
      { wch: 15 }, // Téléphone Principal
      { wch: 15 }, // Téléphone Secondaire
      { wch: 15 }, // Gouvernorat
      { wch: 20 }, // Délégation
      { wch: 40 }, // Adresse Détaillée
      { wch: 15 }, // Matricule Fiscal
      { wch: 25 }, // Technicien Responsable
      { wch: 25 }, // Assigné à
      { wch: 30 }, // Description Nom
      { wch: 30 }, // Description Téléphone
      { wch: 30 }, // Description Adresse
      { wch: 15 }, // Date Création
      { wch: 15 }  // Date Modification
    ];
    ws['!cols'] = columnWidths;
    
    // Add instructions sheet
    const instructionsData = [
      { 'Instructions pour l\'import des sociétés': '' },
      { 'Instructions pour l\'import des sociétés': 'CHAMPS OBLIGATOIRES:' },
      { 'Instructions pour l\'import des sociétés': '• Nom Société: Nom de la société (doit être unique)' },
      { 'Instructions pour l\'import des sociétés': '• Téléphone Principal: Format +216XXXXXXXX ou 8 chiffres' },
      { 'Instructions pour l\'import des sociétés': '' },
      { 'Instructions pour l\'import des sociétés': 'FORMATS SPÉCIAUX:' },
      { 'Instructions pour l\'import des sociétés': '• Téléphone: +216XXXXXXXX ou XXXXXXXX (8 chiffres)' },
      { 'Instructions pour l\'import des sociétés': '• Matricule Fiscal: Format libre (recommandé: XXXXXXXL)' },
      { 'Instructions pour l\'import des sociétés': '' },
      { 'Instructions pour l\'import des sociétés': 'GOUVERNORATS/DÉLÉGATIONS:' },
      { 'Instructions pour l\'import des sociétés': '• Utilisez les codes exacts: tunis, sfax, bizerte, etc.' },
      { 'Instructions pour l\'import des sociétés': '• Délégations: tunis_ville, sfax_ville, bizerte_nord, etc.' },
      { 'Instructions pour l\'import des sociétés': '' },
      { 'Instructions pour l\'import des sociétés': 'TECHNICIENS:' },
      { 'Instructions pour l\'import des sociétés': '• Utilisez les noms exacts existants dans la base' },
      { 'Instructions pour l\'import des sociétés': '• Format: "Prénom Nom"' },
      { 'Instructions pour l\'import des sociétés': '• Si non trouvé, le champ sera ignoré' },
      { 'Instructions pour l\'import des sociétés': '' },
      { 'Instructions pour l\'import des sociétés': 'CONTRAINTES:' },
      { 'Instructions pour l\'import des sociétés': '• Le nom de société doit être unique' },
      { 'Instructions pour l\'import des sociétés': '• Si une société existe déjà, l\'import échouera pour cette ligne' },
      { 'Instructions pour l\'import des sociétés': '' },
      { 'Instructions pour l\'import des sociétés': 'NOTES:' },
      { 'Instructions pour l\'import des sociétés': '• Les champs vides sont autorisés sauf Nom Société' },
      { 'Instructions pour l\'import des sociétés': '• Dates de création/modification seront automatiques' },
      { 'Instructions pour l\'import des sociétés': '• Assigné à sera automatiquement défini' },
      { 'Instructions pour l\'import des sociétés': '• Les fichiers ne sont pas inclus dans l\'import' }
    ];
    
    const instructionsWs = XLSX.utils.json_to_sheet(instructionsData);
    instructionsWs['!cols'] = [{ wch: 60 }];
    
    // Add worksheets to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sociétés - Exemples');
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');
    
    // Generate buffer
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    
    // Set response headers
    const fileName = `template_societes_import.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Send the file
    res.send(buffer);
    
  } catch (error) {
    console.error('Error generating company template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
}