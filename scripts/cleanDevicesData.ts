import * as fs from 'fs';
import * as path from 'path';

const DEVICES_INPUT_FILE = './public/excell/json-data/db_appareils.json';
const PATIENTS_CLEANED_FILE = './public/excell/json-data/patients-cleaned.json';
const DEVICES_OUTPUT_FILE = './public/excell/json-data/devices-cleaned.json';

interface RawDevice {
  "Appareil ID": string;
  "Type": string;
  "Modèle": string;
  "Numéro Série": string;
  "Statut": string;
  "Localisation": string;
  "Compteur": string;
  "TECHNICIEN RESPONSABLE": string | null;
  "note": string | null;
  "NOM PATIENT": string | null;
  "DATE ENTREE ": string | null;
  "DATE  SORTIE": string | null;
  [key: string]: any;
}

interface CleanedPatient {
  id: string;
  fullName: string;
  [key: string]: any;
}

interface CleanedDevice {
  id: string;
  type: 'CPAP' | 'VNI' | 'OXYGEN' | 'OTHER';
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'RETIRED' | 'LOST';
  currentLocation: string;
  currentPatientId: string | null;
  currentPatientName: string | null;
  assignedTechnician: string | null;
  usage: {
    hours: number;
    lastReading: string;
    unit: 'hours' | 'days';
  };
  maintenance: {
    lastServiceDate: string | null;
    nextServiceDate: string | null;
    serviceHistory: any[];
  };
  acquisition: {
    purchaseDate: string | null;
    purchasePrice: number | null;
    supplier: string | null;
    warrantyExpiry: string | null;
  };
  rental: {
    dailyRate: number | null;
    monthlyRate: number | null;
    depositAmount: number | null;
    currentRentalStart: string | null;
    currentRentalEnd: string | null;
  };
  notes: string | null;
  metadata: {
    createdAt: string;
    updatedAt: string;
    lastCheckIn: string | null;
    lastCheckOut: string | null;
  };
}

function parseUsageCounter(counter: string | null): { hours: number; unit: 'hours' | 'days' } {
  if (!counter) return { hours: 0, unit: 'hours' };
  
  // Remove spaces and convert comma to dot for decimal
  let cleaned = counter.replace(/\s/g, '').replace(',', '.');
  
  // Extract number and unit
  const match = cleaned.match(/([\d.]+)\s*(\w*)/);
  if (match) {
    const value = parseFloat(match[1]) || 0;
    const unitStr = match[2]?.toLowerCase() || 'h';
    const unit = unitStr.includes('j') || unitStr.includes('day') ? 'days' : 'hours';
    
    // Convert days to hours if needed
    const hours = unit === 'days' ? value * 24 : value;
    
    return { hours: Math.round(hours * 10) / 10, unit: 'hours' };
  }
  
  return { hours: 0, unit: 'hours' };
}

function normalizeDeviceType(type: string | null): CleanedDevice['type'] {
  if (!type) return 'OTHER';
  
  const upperType = type.toUpperCase();
  
  if (upperType.includes('CPAP')) return 'CPAP';
  if (upperType.includes('VNI') || upperType.includes('VENTIL')) return 'VNI';
  if (upperType.includes('OXYGEN') || upperType.includes('O2')) return 'OXYGEN';
  
  return 'OTHER';
}

function normalizeDeviceStatus(status: string | null, hasPatient: boolean): CleanedDevice['status'] {
  if (!status) return hasPatient ? 'RENTED' : 'AVAILABLE';
  
  const upperStatus = status.toUpperCase();
  
  if (upperStatus.includes('DISPONIBLE') || upperStatus.includes('AVAILABLE')) {
    return 'AVAILABLE';
  }
  if (upperStatus.includes('LOUÉ') || upperStatus.includes('RENTED') || upperStatus.includes('LOC')) {
    return 'RENTED';
  }
  if (upperStatus.includes('MAINTENANCE') || upperStatus.includes('REPARATION')) {
    return 'MAINTENANCE';
  }
  if (upperStatus.includes('RETRAITE') || upperStatus.includes('RETIRED')) {
    return 'RETIRED';
  }
  if (upperStatus.includes('PERDU') || upperStatus.includes('LOST')) {
    return 'LOST';
  }
  
  return hasPatient ? 'RENTED' : 'AVAILABLE';
}

function extractBrandAndModel(model: string): { brand: string; model: string } {
  if (!model) return { brand: 'UNKNOWN', model: 'UNKNOWN' };
  
  // Common brands in the data
  const brands = ['DEVILBISS', 'RESMED', 'PHILIPS', 'WEINMANN', 'BREAS', 'LOWENSTEIN', 'AIRSEP', 'BMC'];
  
  const upperModel = model.toUpperCase();
  let foundBrand = 'UNKNOWN';
  let cleanModel = model;
  
  for (const brand of brands) {
    if (upperModel.includes(brand)) {
      foundBrand = brand;
      // Remove brand from model name
      cleanModel = model.replace(new RegExp(brand, 'gi'), '').trim();
      break;
    }
  }
  
  return { brand: foundBrand, model: cleanModel || model };
}

function parseDate(dateStr: string | null): string | null {
  if (!dateStr || dateStr === 'null' || dateStr === '') return null;
  
  try {
    // Handle various date formats
    const patterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,  // MM/DD/YY or MM/DD/YYYY
      /(\d{1,2})-(\d{1,2})-(\d{2,4})/,     // MM-DD-YY or MM-DD-YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/,       // YYYY-MM-DD
    ];
    
    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        let year, month, day;
        
        if (match[0].includes('/')) {
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = parseInt(match[3]);
          
          // Handle 2-digit years
          if (year < 100) {
            year = year > 50 ? 1900 + year : 2000 + year;
          }
        } else if (match[3] && match[3].length === 4) {
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        }
        
        if (year && month && day) {
          // Create date and format as ISO
          const date = new Date(year, month - 1, day);
          return date.toISOString().split('T')[0];
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to parse date: ${dateStr}`);
  }
  
  return null;
}

function createPatientNameMap(patients: CleanedPatient[]): Map<string, string> {
  const nameMap = new Map<string, string>();
  
  for (const patient of patients) {
    // Store multiple variations of the name for matching
    const fullName = patient.fullName.toUpperCase();
    nameMap.set(fullName, patient.id);
    
    // Also store without spaces for fuzzy matching
    const compactName = fullName.replace(/\s+/g, '');
    nameMap.set(compactName, patient.id);
    
    // Store last name + first name variations
    const parts = fullName.split(/\s+/);
    if (parts.length >= 2) {
      const reversed = `${parts[parts.length - 1]} ${parts.slice(0, -1).join(' ')}`;
      nameMap.set(reversed, patient.id);
    }
  }
  
  return nameMap;
}

function findPatientId(patientNameField: string | null, nameMap: Map<string, string>): string | null {
  if (!patientNameField) return null;
  
  // Clean the patient name field
  // Format is usually "PAT: NAME" or "PAT : NAME"
  let cleanName = patientNameField
    .replace(/^PAT\s*:\s*/i, '')  // Remove PAT: prefix
    .trim()
    .toUpperCase();
  
  // Direct match
  if (nameMap.has(cleanName)) {
    return nameMap.get(cleanName) || null;
  }
  
  // Try compact version (no spaces)
  const compactName = cleanName.replace(/\s+/g, '');
  if (nameMap.has(compactName)) {
    return nameMap.get(compactName) || null;
  }
  
  // Try fuzzy matching - find closest match
  let bestMatch: { id: string | null; score: number } = { id: null, score: 0 };
  
  for (const [storedName, patientId] of nameMap.entries()) {
    // Simple similarity check based on common characters
    const score = calculateSimilarity(cleanName, storedName);
    if (score > bestMatch.score && score > 0.7) { // 70% similarity threshold
      bestMatch = { id: patientId, score };
    }
  }
  
  return bestMatch.id;
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,  // substitution
          matrix[i][j - 1] + 1,       // insertion
          matrix[i - 1][j] + 1        // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

function estimateRentalRates(type: string): { daily: number; monthly: number; deposit: number } {
  const normalizedType = normalizeDeviceType(type);
  
  // Based on typical medical equipment rental rates in Tunisia (TND)
  const rates = {
    'CPAP': { daily: 15, monthly: 300, deposit: 500 },
    'VNI': { daily: 20, monthly: 400, deposit: 700 },
    'OXYGEN': { daily: 10, monthly: 200, deposit: 300 },
    'OTHER': { daily: 12, monthly: 250, deposit: 400 }
  };
  
  return rates[normalizedType];
}

async function cleanDevicesData() {
  try {
    console.log('📖 Reading raw devices data...');
    const rawDevices = JSON.parse(fs.readFileSync(DEVICES_INPUT_FILE, 'utf-8'));
    
    console.log('📖 Reading cleaned patients data...');
    const cleanedPatients = JSON.parse(fs.readFileSync(PATIENTS_CLEANED_FILE, 'utf-8'));
    
    console.log('🗺️  Creating patient name mapping...');
    const patientNameMap = createPatientNameMap(cleanedPatients);
    console.log(`  Created mapping for ${patientNameMap.size / 3} patients`); // Divided by 3 because we store 3 variations
    
    console.log(`Found ${rawDevices.length} device records`);
    
    // Filter valid device records
    const validDevices = rawDevices.filter((device: RawDevice) => {
      return device["Appareil ID"] && 
             device["Type"] && 
             !device["Appareil ID"].includes('GUIDE');
    });
    
    console.log(`Filtering to ${validDevices.length} valid device records`);
    
    console.log('🧹 Cleaning device data...');
    const cleanedDevices: CleanedDevice[] = [];
    const unmappedPatients: string[] = [];
    
    for (const device of validDevices) {
      const { brand, model } = extractBrandAndModel(device["Modèle"]);
      const usage = parseUsageCounter(device["Compteur"]);
      const patientId = findPatientId(device["NOM PATIENT"], patientNameMap);
      const hasPatient = !!device["NOM PATIENT"];
      const rates = estimateRentalRates(device["Type"]);
      
      // Track unmapped patients for debugging
      if (device["NOM PATIENT"] && !patientId) {
        unmappedPatients.push(device["NOM PATIENT"]);
      }
      
      const cleanedDevice: CleanedDevice = {
        id: device["Appareil ID"],
        type: normalizeDeviceType(device["Type"]),
        category: device["Type"] || 'UNKNOWN',
        brand,
        model,
        serialNumber: device["Numéro Série"] || '',
        status: normalizeDeviceStatus(device["Statut"], hasPatient),
        currentLocation: device["Localisation"] || 'UNKNOWN',
        currentPatientId: patientId,
        currentPatientName: device["NOM PATIENT"] ? device["NOM PATIENT"].replace(/^PAT\s*:\s*/i, '').trim() : null,
        assignedTechnician: device["TECHNICIEN RESPONSABLE"] || null,
        usage: {
          hours: usage.hours,
          lastReading: new Date().toISOString(),
          unit: usage.unit
        },
        maintenance: {
          lastServiceDate: null,
          nextServiceDate: null,
          serviceHistory: []
        },
        acquisition: {
          purchaseDate: null,
          purchasePrice: null,
          supplier: null,
          warrantyExpiry: null
        },
        rental: {
          dailyRate: rates.daily,
          monthlyRate: rates.monthly,
          depositAmount: rates.deposit,
          currentRentalStart: parseDate(device["DATE ENTREE "]),
          currentRentalEnd: parseDate(device["DATE  SORTIE"])
        },
        notes: device["note"],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastCheckIn: parseDate(device["DATE ENTREE "]),
          lastCheckOut: parseDate(device["DATE  SORTIE"])
        }
      };
      
      cleanedDevices.push(cleanedDevice);
    }
    
    // Sort by ID
    cleanedDevices.sort((a, b) => a.id.localeCompare(b.id));
    
    // Save cleaned data
    console.log('💾 Saving cleaned data...');
    fs.writeFileSync(DEVICES_OUTPUT_FILE, JSON.stringify(cleanedDevices, null, 2), 'utf-8');
    
    // Generate statistics
    const stats = {
      totalDevices: cleanedDevices.length,
      byType: {
        cpap: cleanedDevices.filter(d => d.type === 'CPAP').length,
        vni: cleanedDevices.filter(d => d.type === 'VNI').length,
        oxygen: cleanedDevices.filter(d => d.type === 'OXYGEN').length,
        other: cleanedDevices.filter(d => d.type === 'OTHER').length
      },
      byStatus: {
        available: cleanedDevices.filter(d => d.status === 'AVAILABLE').length,
        rented: cleanedDevices.filter(d => d.status === 'RENTED').length,
        maintenance: cleanedDevices.filter(d => d.status === 'MAINTENANCE').length,
        retired: cleanedDevices.filter(d => d.status === 'RETIRED').length
      },
      withPatient: cleanedDevices.filter(d => d.currentPatientId).length,
      unmappedPatients: unmappedPatients.length
    };
    
    console.log('\n📊 Cleaning Statistics:');
    console.log(`  Total Devices: ${stats.totalDevices}`);
    console.log(`  Device Types: CPAP(${stats.byType.cpap}), VNI(${stats.byType.vni}), O2(${stats.byType.oxygen}), Other(${stats.byType.other})`);
    console.log(`  Status: Available(${stats.byStatus.available}), Rented(${stats.byStatus.rented}), Maintenance(${stats.byStatus.maintenance})`);
    console.log(`  Devices with Mapped Patients: ${stats.withPatient}`);
    console.log(`  Unmapped Patient Names: ${stats.unmappedPatients}`);
    
    if (unmappedPatients.length > 0) {
      console.log('\n⚠️  Unmapped patient names (first 5):');
      unmappedPatients.slice(0, 5).forEach(name => {
        console.log(`    - ${name}`);
      });
    }
    
    console.log('\n✅ Device data cleaned successfully!');
    console.log(`📁 Cleaned file saved to: ${DEVICES_OUTPUT_FILE}`);
    
    // Show sample
    console.log('\n📋 Sample cleaned device:');
    const sampleDevice = cleanedDevices.find(d => d.currentPatientId) || cleanedDevices[0];
    console.log(JSON.stringify(sampleDevice, null, 2));
    
    return cleanedDevices;
    
  } catch (error) {
    console.error('❌ Error cleaning devices data:', error);
    throw error;
  }
}

if (require.main === module) {
  cleanDevicesData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { cleanDevicesData };