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
        'Nom Complet': 'Mohamed Ben Salah',
        'Téléphone Principal': '+21698765432',
        'Téléphone Secondaire': '+21695123456',
        'Gouvernorat': 'Tunis',
        'Délégation': 'La Marsa',
        'Adresse Détaillée': '15 Avenue Habib Bourguiba, Résidence El Yasmine, Apt 3A',
        'CIN': '12345678',
        'Date de Naissance': '15/03/1985',
        'CNAM ID': '123456789012',
        'Type Bénéficiaire': 'ASSURE_SOCIAL',
        'Caisse Affiliation': 'CNSS',
        'Taille (cm)': '175',
        'Poids (kg)': '78',
        'IMC': '', // Calculé automatiquement
        'Antécédents': 'Diabète type 2 diagnostiqué en 2018, Hypertension artérielle sous traitement',
        'Médecin Responsable': 'Dr Sliman Labiadh',
        'Technicien Responsable': 'Ahmed Gazzeh',
        'Assigné à': '', // Sera automatiquement assigné à l'utilisateur qui importe
        'Note Générale': 'Patient suivi régulièrement pour diabète. Préfère les RDV matinaux.',
        'Date Création': '', // Sera automatiquement remplie
        'Date Modification': '' // Sera automatiquement remplie
      },
      {
        'Nom Complet': 'Fatma Khlifi',
        'Téléphone Principal': '25789456',
        'Téléphone Secondaire': '',
        'Gouvernorat': 'Sfax',
        'Délégation': 'Sfax Ville',
        'Adresse Détaillée': 'Rue Hedi Chaker, Immeuble Nour, Étage 2',
        'CIN': '09876543',
        'Date de Naissance': '22/07/1992',
        'CNAM ID': '',
        'Type Bénéficiaire': 'CONJOINT',
        'Caisse Affiliation': 'CNRPS',
        'Taille (cm)': '165',
        'Poids (kg)': '58',
        'IMC': '',
        'Antécédents': 'Allergie aux pénicillines, Migraines fréquentes',
        'Médecin Responsable': '',
        'Technicien Responsable': 'Ahmed Gazzeh',
        'Assigné à': '',
        'Note Générale': 'Patiente jeune maman, disponible après 14h. Allergie importante à noter.',
        'Date Création': '',
        'Date Modification': ''
      },
      {
        'Nom Complet': 'Ali Trabelsi',
        'Téléphone Principal': '98765432',
        'Téléphone Secondaire': '71456789',
        'Gouvernorat': 'Sousse',
        'Délégation': 'Msaken',
        'Adresse Détaillée': 'Cité El Riadh, Rue des Jasmins, Maison N°42',
        'CIN': '11223344',
        'Date de Naissance': '10/12/1978',
        'CNAM ID': '987654321098',
        'Type Bénéficiaire': 'ASSURE_SOCIAL',
        'Caisse Affiliation': 'CNSS',
        'Taille (cm)': '172',
        'Poids (kg)': '82',
        'IMC': '',
        'Antécédents': 'Asthme depuis l\'enfance, Opération appendicite en 2015',
        'Médecin Responsable': 'Dr Sliman Labiadh',
        'Technicien Responsable': '',
        'Assigné à': '',
        'Note Générale': 'Travailleur en usine, disponible uniquement le weekend et après 18h en semaine.',
        'Date Création': '',
        'Date Modification': ''
      },
      {
        'Nom Complet': 'Leila Bouazzi',
        'Téléphone Principal': '+21622334455',
        'Téléphone Secondaire': '',
        'Gouvernorat': 'Ariana',
        'Délégation': 'Ariana Ville',
        'Adresse Détaillée': 'Cité Ennasr 2, Rue du 20 Mars, Villa N°15',
        'CIN': '55667788',
        'Date de Naissance': '03/09/1967',
        'CNAM ID': '456789123456',
        'Type Bénéficiaire': 'ASSANDANT',
        'Caisse Affiliation': 'CNRPS',
        'Taille (cm)': '158',
        'Poids (kg)': '65',
        'IMC': '',
        'Antécédents': 'Arthrose cervicale, Cholestérol élevé, Ménopause',
        'Médecin Responsable': 'Dr Sliman Labiadh',
        'Technicien Responsable': 'Ahmed Gazzeh',
        'Assigné à': '',
        'Note Générale': 'Retraitée, très disponible. Préfère être contactée le matin avant 11h.',
        'Date Création': '',
        'Date Modification': ''
      },
      {
        'Nom Complet': 'Youssef Mejri',
        'Téléphone Principal': '29876543',
        'Téléphone Secondaire': '+21697112233',
        'Gouvernorat': 'Monastir',
        'Délégation': 'Monastir',
        'Adresse Détaillée': 'Avenue de la République, près de la pharmacie centrale',
        'CIN': '33445566',
        'Date de Naissance': '28/11/1990',
        'CNAM ID': '',
        'Type Bénéficiaire': 'CONJOINT',
        'Caisse Affiliation': 'CNSS',
        'Taille (cm)': '180',
        'Poids (kg)': '75',
        'IMC': '',
        'Antécédents': 'Fracture jambe droite en 2019, Aucune allergie connue',
        'Médecin Responsable': '',
        'Technicien Responsable': '',
        'Assigné à': '',
        'Note Générale': 'Étudiant en médecine, très coopératif. Famille nombreuse (6 enfants couverts).',
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
    
    // Add instructions sheet
    const instructionsData = [
      { 'Instructions pour l\'import des patients': '' },
      { 'Instructions pour l\'import des patients': 'CHAMPS OBLIGATOIRES:' },
      { 'Instructions pour l\'import des patients': '• Nom Complet: Nom et prénom du patient' },
      { 'Instructions pour l\'import des patients': '• Téléphone Principal: Format +216XXXXXXXX ou 8 chiffres' },
      { 'Instructions pour l\'import des patients': '' },
      { 'Instructions pour l\'import des patients': 'FORMATS SPÉCIAUX:' },
      { 'Instructions pour l\'import des patients': '• Date de Naissance: JJ/MM/AAAA ou AAAA-MM-JJ' },
      { 'Instructions pour l\'import des patients': '• CIN: Exactement 8 chiffres' },
      { 'Instructions pour l\'import des patients': '• Téléphone: +216XXXXXXXX ou XXXXXXXX (8 chiffres)' },
      { 'Instructions pour l\'import des patients': '' },
      { 'Instructions pour l\'import des patients': 'VALEURS AUTORISÉES:' },
      { 'Instructions pour l\'import des patients': '• Type Bénéficiaire: ASSURE_SOCIAL, CONJOINT, ENFANT, ASSANDANT' },
      { 'Instructions pour l\'import des patients': '• Caisse Affiliation: CNSS, CNRPS' },
      { 'Instructions pour l\'import des patients': '' },
      { 'Instructions pour l\'import des patients': 'GOUVERNORATS/DÉLÉGATIONS:' },
      { 'Instructions pour l\'import des patients': '• Utilisez les noms lisibles: Tunis, Sfax, Sousse, Ariana, etc.' },
      { 'Instructions pour l\'import des patients': '• Délégations: La Marsa, Sfax Ville, Msaken, Monastir, etc.' },
      { 'Instructions pour l\'import des patients': '' },
      { 'Instructions pour l\'import des patients': 'MÉDECINS/TECHNICIENS:' },
      { 'Instructions pour l\'import des patients': '• Utilisez les noms exacts existants dans la base' },
      { 'Instructions pour l\'import des patients': '• Format médecin: "Dr Prénom Nom" ou "Prénom Nom"' },
      { 'Instructions pour l\'import des patients': '• Si non trouvé, le champ sera ignoré' },
      { 'Instructions pour l\'import des patients': '' },
      { 'Instructions pour l\'import des patients': 'NOTES:' },
      { 'Instructions pour l\'import des patients': '• Les champs vides sont autorisés sauf Nom Complet' },
      { 'Instructions pour l\'import des patients': '• IMC sera calculé automatiquement si Taille et Poids fournis' },
      { 'Instructions pour l\'import des patients': '• Dates de création/modification seront automatiques' },
      { 'Instructions pour l\'import des patients': '• Assigné à sera automatiquement défini' }
    ];
    
    const instructionsWs = XLSX.utils.json_to_sheet(instructionsData);
    instructionsWs['!cols'] = [{ wch: 60 }];
    
    // Add worksheets to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Patients - Exemples');
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');
    
    // Generate buffer
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    
    // Set response headers
    const fileName = `template_patients_import.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Send the file
    res.send(buffer);
    
  } catch (error) {
    console.error('Error generating patient template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
}