import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const EXCEL_FILE_PATH = './public/excell/Medical_System_ELITE_V11_WITH_EXAMPLES.xlsx';
const OUTPUT_DIR = './public/excell/json-data';

interface Patient {
  id?: number;
  nom?: string;
  prenom?: string;
  dateNaissance?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  numeroSecuriteSociale?: string;
  mutuelle?: string;
  dateInscription?: string;
  notes?: string;
  [key: string]: any;
}

interface MedicalDevice {
  id?: number;
  nom?: string;
  type?: string;
  marque?: string;
  modele?: string;
  numeroSerie?: string;
  dateAchat?: string;
  prixAchat?: number;
  etat?: string;
  disponible?: boolean;
  prixLocationJour?: number;
  notes?: string;
  [key: string]: any;
}

interface Rental {
  id?: number;
  patientId?: number;
  deviceId?: number;
  dateDebut?: string;
  dateFin?: string;
  prixTotal?: number;
  statut?: string;
  notes?: string;
  [key: string]: any;
}

interface RentalPayment {
  id?: number;
  rentalId?: number;
  montant?: number;
  datePaiement?: string;
  methodePaiement?: string;
  reference?: string;
  notes?: string;
  [key: string]: any;
}

function convertExcelDateToJS(excelDate: number): string {
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

function processValue(value: any): any {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  if (typeof value === 'number' && value > 40000 && value < 50000) {
    return convertExcelDateToJS(value);
  }
  
  return value;
}

function extractSheetData(worksheet: XLSX.WorkSheet): any[] {
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    raw: false,
    dateNF: 'yyyy-mm-dd',
    defval: null
  });
  
  return jsonData.map(row => {
    const processedRow: any = {};
    for (const [key, value] of Object.entries(row)) {
      processedRow[key] = processValue(value);
    }
    return processedRow;
  });
}

async function extractExcelToJson() {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log('📖 Reading Excel file...');
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    
    console.log('\n📊 Available sheets:');
    workbook.SheetNames.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });

    const dataMapping: { [key: string]: string } = {
      'Patients': 'patients.json',
      'Patient': 'patients.json',
      'Dispositifs': 'medical-devices.json',
      'Devices': 'medical-devices.json',
      'Medical_Devices': 'medical-devices.json',
      'Locations': 'rentals.json',
      'Rentals': 'rentals.json',
      'Location': 'rentals.json',
      'Paiements': 'rental-payments.json',
      'Payments': 'rental-payments.json',
      'Paiement': 'rental-payments.json'
    };

    const extractedData: { [key: string]: any[] } = {
      'patients.json': [],
      'medical-devices.json': [],
      'rentals.json': [],
      'rental-payments.json': []
    };

    console.log('\n🔄 Processing sheets...');
    
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n  Processing: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      const data = extractSheetData(worksheet);
      
      console.log(`    Found ${data.length} rows`);
      
      let fileName: string | undefined;
      for (const [key, file] of Object.entries(dataMapping)) {
        if (sheetName.toLowerCase().includes(key.toLowerCase())) {
          fileName = file;
          break;
        }
      }
      
      if (!fileName) {
        fileName = `${sheetName.toLowerCase().replace(/\s+/g, '-')}.json`;
        console.log(`    ⚠️  No mapping found, saving as: ${fileName}`);
      }
      
      if (extractedData[fileName]) {
        extractedData[fileName] = extractedData[fileName].concat(data);
      } else {
        extractedData[fileName] = data;
      }
      
      if (data.length > 0) {
        console.log(`    Sample row:`, JSON.stringify(data[0], null, 2).substring(0, 200) + '...');
      }
    }

    console.log('\n💾 Saving JSON files...');
    for (const [fileName, data] of Object.entries(extractedData)) {
      if (data.length > 0) {
        const filePath = path.join(OUTPUT_DIR, fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`  ✅ ${fileName} - ${data.length} records saved`);
      }
    }

    console.log('\n📁 Creating index file...');
    const indexData = {
      generatedAt: new Date().toISOString(),
      files: Object.entries(extractedData)
        .filter(([_, data]) => data.length > 0)
        .map(([fileName, data]) => ({
          name: fileName,
          records: data.length,
          path: `./${fileName}`
        }))
    };
    
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'index.json'),
      JSON.stringify(indexData, null, 2),
      'utf-8'
    );

    console.log('\n✨ Extraction complete!');
    console.log(`📂 Files saved to: ${OUTPUT_DIR}`);
    
    return extractedData;

  } catch (error) {
    console.error('❌ Error extracting Excel data:', error);
    throw error;
  }
}

if (require.main === module) {
  extractExcelToJson()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { extractExcelToJson };