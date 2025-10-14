import * as fs from 'fs';
import * as path from 'path';

const INPUT_FILE = './public/excell/json-data/patients.json';
const OUTPUT_FILE = './public/excell/json-data/patients-cleaned.json';

interface RawPatient {
  "Patient ID": string;
  "Nom Complet": string;
  "CIN": string;
  "Date Naissance": string | null;
  "Région": string;
  "Délégation": string;
  "Adresse": string;
  "Tel1": string;
  "DescTel1": string;
  "Tel2": string;
  "DescTel2": string;
  "Médecin": string;
  "Assurance": string;
  "Affiliation": string;
  "Statut": string;
  "TECHNICIEN": string;
  "Notes": string | null;
  [key: string]: any;
}

interface CleanedPatient {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  cin: string;
  dateOfBirth: string | null;
  age: number | null;
  gender: 'M' | 'F' | null;
  email: string | null;
  address: {
    street: string;
    region: string;
    delegation: string;
    postalCode: string | null;
  };
  phones: Array<{
    number: string;
    type: 'primary' | 'secondary' | 'emergency';
    description: string;
    isWhatsapp: boolean;
  }>;
  emergencyContact: {
    name: string | null;
    phone: string | null;
    relationship: string | null;
  };
  medical: {
    doctor: string;
    conditions: string[];
    allergies: string[];
    bloodType: string | null;
  };
  insurance: {
    type: string;
    number: string;
    expiryDate: string | null;
  };
  assignedTechnician: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  notes: string | null;
  metadata: {
    createdAt: string;
    updatedAt: string;
    lastVisit: string | null;
    totalRentals: number;
    currentRentals: number;
  };
}

function cleanPhoneNumber(phone: string | null): string | null {
  if (!phone || phone === 'null' || phone === '') return null;
  
  // Remove commas, spaces, dots
  let cleaned = phone.replace(/[,.\s]/g, '');
  
  // Remove any non-digit characters
  cleaned = cleaned.replace(/\D/g, '');
  
  // Format Tunisian phone numbers (8 digits)
  if (cleaned.length === 8) {
    return cleaned;
  } else if (cleaned.length === 9 && cleaned.startsWith('0')) {
    // Remove leading 0
    return cleaned.substring(1);
  } else if (cleaned.length === 11 && cleaned.startsWith('216')) {
    // Remove country code
    return cleaned.substring(3);
  }
  
  return cleaned || null;
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

function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age > 0 && age < 120 ? age : null;
}

function inferGenderFromName(fullName: string): 'M' | 'F' | null {
  const femaleIndicators = ['FATMA', 'AICHA', 'KHADIJA', 'MARIEM', 'SALMA', 'AMIRA', 'SONIA', 'LEILA', 'NAJLA'];
  const maleIndicators = ['MOHAMED', 'AHMED', 'ALI', 'HASSAN', 'FRADJ', 'OMAR', 'BILEL', 'KARIM', 'WALID'];
  
  const upperName = fullName.toUpperCase();
  
  for (const indicator of femaleIndicators) {
    if (upperName.includes(indicator)) return 'F';
  }
  
  for (const indicator of maleIndicators) {
    if (upperName.includes(indicator)) return 'M';
  }
  
  return null;
}

function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return { firstName: '', lastName: parts[0] };
  } else if (parts.length === 2) {
    return { firstName: parts[1], lastName: parts[0] };
  } else {
    // Assume last part is first name, rest is last name
    const firstName = parts[parts.length - 1];
    const lastName = parts.slice(0, -1).join(' ');
    return { firstName, lastName };
  }
}

function normalizeStatus(status: string): 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED' {
  const upperStatus = status?.toUpperCase() || '';
  
  if (upperStatus.includes('ACTIF') || upperStatus.includes('ACTIVE')) {
    return 'ACTIVE';
  } else if (upperStatus.includes('INACTIF') || upperStatus.includes('INACTIVE')) {
    return 'INACTIVE';
  } else if (upperStatus.includes('SUSPENDU') || upperStatus.includes('SUSPENDED')) {
    return 'SUSPENDED';
  } else if (upperStatus.includes('ARCHIVE')) {
    return 'ARCHIVED';
  }
  
  return 'ACTIVE'; // Default
}

function cleanPatientRecord(raw: RawPatient, index: number): CleanedPatient {
  const { firstName, lastName } = parseFullName(raw["Nom Complet"] || '');
  const dateOfBirth = parseDate(raw["Date Naissance"]);
  const age = calculateAge(dateOfBirth);
  const gender = inferGenderFromName(raw["Nom Complet"] || '');
  
  const phones: CleanedPatient['phones'] = [];
  
  // Add primary phone
  const tel1 = cleanPhoneNumber(raw["Tel1"]);
  if (tel1) {
    phones.push({
      number: tel1,
      type: 'primary',
      description: raw["DescTel1"] || 'Principal',
      isWhatsapp: false
    });
  }
  
  // Add secondary phone
  const tel2 = cleanPhoneNumber(raw["Tel2"]);
  if (tel2) {
    phones.push({
      number: tel2,
      type: 'secondary',
      description: raw["DescTel2"] || 'Secondaire',
      isWhatsapp: false
    });
  }
  
  // If tel2 description mentions a person, use as emergency contact
  const emergencyContact: CleanedPatient['emergencyContact'] = {
    name: null,
    phone: null,
    relationship: null
  };
  
  if (raw["DescTel2"] && !['SECONDAIRE', 'AUTRE'].includes(raw["DescTel2"].toUpperCase())) {
    emergencyContact.name = raw["DescTel2"];
    emergencyContact.phone = tel2;
    if (raw["DescTel2"].toUpperCase().includes('FILS')) {
      emergencyContact.relationship = 'Son';
    } else if (raw["DescTel2"].toUpperCase().includes('FILLE')) {
      emergencyContact.relationship = 'Daughter';
    } else if (raw["DescTel2"].toUpperCase().includes('EPOUSE') || raw["DescTel2"].toUpperCase().includes('FEMME')) {
      emergencyContact.relationship = 'Spouse';
    }
  }
  
  // Clean CIN
  let cin = raw["CIN"] || '';
  cin = cin.replace(/[^0-9]/g, ''); // Keep only numbers
  if (cin.length > 8) cin = cin.substring(0, 8);
  cin = cin.padStart(8, '0'); // Ensure 8 digits
  
  return {
    id: raw["Patient ID"] || `PAT${String(index + 1).padStart(4, '0')}`,
    firstName,
    lastName,
    fullName: raw["Nom Complet"] || '',
    cin,
    dateOfBirth,
    age,
    gender,
    email: null, // Generate placeholder email
    address: {
      street: raw["Adresse"] || '',
      region: raw["Région"] || '',
      delegation: raw["Délégation"] || '',
      postalCode: null
    },
    phones,
    emergencyContact,
    medical: {
      doctor: raw["Médecin"] || '',
      conditions: [], // To be filled from notes or other sources
      allergies: [],
      bloodType: null
    },
    insurance: {
      type: raw["Assurance"] || 'NONE',
      number: raw["Affiliation"] || '',
      expiryDate: null
    },
    assignedTechnician: raw["TECHNICIEN"] || '',
    status: normalizeStatus(raw["Statut"]),
    notes: raw["Notes"],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastVisit: null,
      totalRentals: 0,
      currentRentals: 0
    }
  };
}

async function cleanPatientsData() {
  try {
    console.log('📖 Reading raw patients data...');
    const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    
    console.log(`Found ${rawData.length} patient records`);
    
    // Filter out records that are obviously not patient data
    const validPatients = rawData.filter((patient: RawPatient) => {
      return patient["Patient ID"] && 
             patient["Nom Complet"] && 
             !patient["Patient ID"].includes('GUIDE') &&
             !patient["📋 GUIDE D'UTILISATION"];
    });
    
    console.log(`Filtering to ${validPatients.length} valid patient records`);
    
    console.log('🧹 Cleaning patient data...');
    const cleanedPatients = validPatients.map((patient: RawPatient, index: number) => {
      return cleanPatientRecord(patient, index);
    });
    
    // Sort by ID
    cleanedPatients.sort((a, b) => a.id.localeCompare(b.id));
    
    // Save cleaned data
    console.log('💾 Saving cleaned data...');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleanedPatients, null, 2), 'utf-8');
    
    // Generate statistics
    const stats = {
      totalRecords: cleanedPatients.length,
      withEmail: cleanedPatients.filter(p => p.email).length,
      withPhone: cleanedPatients.filter(p => p.phones.length > 0).length,
      withBirthDate: cleanedPatients.filter(p => p.dateOfBirth).length,
      withGender: cleanedPatients.filter(p => p.gender).length,
      activePatients: cleanedPatients.filter(p => p.status === 'ACTIVE').length,
      withInsurance: cleanedPatients.filter(p => p.insurance.type !== 'NONE').length
    };
    
    console.log('\n📊 Cleaning Statistics:');
    console.log(`  Total Records: ${stats.totalRecords}`);
    console.log(`  With Phone: ${stats.withPhone}`);
    console.log(`  With Birth Date: ${stats.withBirthDate}`);
    console.log(`  With Gender (inferred): ${stats.withGender}`);
    console.log(`  Active Status: ${stats.activePatients}`);
    console.log(`  With Insurance: ${stats.withInsurance}`);
    
    console.log('\n✅ Patient data cleaned successfully!');
    console.log(`📁 Cleaned file saved to: ${OUTPUT_FILE}`);
    
    // Show sample of cleaned data
    console.log('\n📋 Sample cleaned record:');
    console.log(JSON.stringify(cleanedPatients[0], null, 2));
    
    return cleanedPatients;
    
  } catch (error) {
    console.error('❌ Error cleaning patient data:', error);
    throw error;
  }
}

if (require.main === module) {
  cleanPatientsData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { cleanPatientsData, cleanPatientRecord };