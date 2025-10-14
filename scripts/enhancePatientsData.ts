import * as fs from 'fs';
import * as path from 'path';

interface PatientOriginal {
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

interface PatientEnhanced {
  patientCode: string;
  firstName: string;
  lastName: string;
  cin: string | null;
  dateOfBirth: string | null;
  telephone: string;
  telephoneTwo: string | null;
  governorate: string;
  delegation: string;
  detailedAddress: string;
  affiliation: "CNSS" | "CNRPS";
  beneficiaryType: "ASSURE_SOCIAL" | "CONJOINT" | "ENFANT" | "ASSANDANT";
  medicalHistory: string | null;
  generalNote: string | null;
  doctorName: string | null;
  technicianName: string | null;
  supervisorName: string | null;
  status: string;
  // Required for Prisma
  userId: string; // Who assigned this patient
  doctorId: string | null;
  technicianId: string | null;
  supervisorId: string | null;
  originalData?: PatientOriginal;
}

const INPUT_PATH = path.join(__dirname, '../public/excell/json-data/patients-enhanced.json');
const MAPPINGS_PATH = path.join(__dirname, '../public/excell/json-data/technician-mappings.json');
const OUTPUT_PATH = path.join(__dirname, '../public/excell/json-data/patients-prisma-ready.json');

// User IDs from database
const AHMED_GAZZEH_ID = "cme43uuw40003oamthleh171m"; // Default supervisor for all patients

// Governorate mapping based on regions
const GOVERNORATE_MAP: { [key: string]: string } = {
  "SOUSSE": "SOUSSE",
  "KAIROUAN": "KAIROUAN",
  "MONASTIR": "MONASTIR",
  "MAHDIA": "MAHDIA",
  "SFAX": "SFAX",
  "TUNIS": "TUNIS",
  "NABEUL": "NABEUL",
  "BIZERTE": "BIZERTE",
  "GAFSA": "GAFSA",
  "GABES": "GABES"
};

// Affiliation type mapping
const AFFILIATION_MAP: { [key: string]: string } = {
  "CNAM": "CNSS",
  "CNRPS": "CNRPS",
  "CNSS": "CNSS"
};

// Beneficiary type detection
function detectBeneficiaryType(notes: string | null): string {
  if (!notes) return "ASSURE_SOCIAL";
  
  const lowerNotes = notes.toLowerCase();
  if (lowerNotes.includes("conjoint")) return "CONJOINT";
  if (lowerNotes.includes("enfant") || lowerNotes.includes("fils") || lowerNotes.includes("fille")) return "ENFANT";
  if (lowerNotes.includes("parent") || lowerNotes.includes("mère") || lowerNotes.includes("père")) return "ASSANDANT";
  
  return "ASSURE_SOCIAL";
}

// Clean phone number
function cleanPhoneNumber(phone: string): string {
  if (!phone) return "";
  
  // Remove commas and spaces
  let cleaned = phone.replace(/[,\s]/g, '');
  
  // Remove any non-numeric characters except +
  cleaned = cleaned.replace(/[^\d+]/g, '');
  
  // Add country code if missing
  if (cleaned && !cleaned.startsWith('+')) {
    if (!cleaned.startsWith('216')) {
      cleaned = '+216' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  
  return cleaned;
}

// Parse full name
function parseName(fullName: string): { firstName: string, lastName: string } {
  if (!fullName) return { firstName: "", lastName: "" };
  
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  
  // Assume first word is first name, rest is last name
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

// Format date
function formatDate(dateStr: string | null): string | null {
  if (!dateStr || dateStr === "null") return null;
  
  // Try to parse various formats
  const patterns = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // MM/DD/YY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/ // YYYY-MM-DD
  ];
  
  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      let year, month, day;
      
      if (pattern === patterns[0]) {
        // MM/DD/YY
        month = match[1].padStart(2, '0');
        day = match[2].padStart(2, '0');
        year = parseInt(match[3]) < 50 ? `20${match[3]}` : `19${match[3]}`;
      } else if (pattern === patterns[1]) {
        // MM/DD/YYYY
        month = match[1].padStart(2, '0');
        day = match[2].padStart(2, '0');
        year = match[3];
      } else {
        // YYYY-MM-DD
        return dateStr;
      }
      
      return `${year}-${month}-${day}`;
    }
  }
  
  return null;
}

function enhancePatientsData(): void {
  try {
    // Read input files
    const patientsFile = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
    const patientsData = patientsFile.patients || patientsFile;
    
    // Read technician mappings
    const mappingsFile = JSON.parse(fs.readFileSync(MAPPINGS_PATH, 'utf-8'));
    const technicianMappings = mappingsFile.technicianMappings || {};
    
    // Enhance each patient
    const enhancedPatients: PatientEnhanced[] = patientsData.map((patient: any) => {
      // Map technician name to user ID
      const technicianId = patient.technicianName && technicianMappings[patient.technicianName.toUpperCase()]
        ? technicianMappings[patient.technicianName.toUpperCase()].userId
        : null;
      
      // Clean and prepare data
      const enhanced: PatientEnhanced = {
        patientCode: patient.patientCode,
        firstName: patient.firstName,
        lastName: patient.lastName,
        cin: patient.cin,
        dateOfBirth: patient.dateOfBirth,
        telephone: patient.telephone,
        telephoneTwo: patient.telephoneTwo,
        governorate: patient.governorate,
        delegation: patient.delegation,
        detailedAddress: patient.detailedAddress,
        affiliation: patient.affiliation === "CNAM" ? "CNSS" : patient.affiliation,
        beneficiaryType: patient.beneficiaryType,
        medicalHistory: patient.medicalHistory,
        generalNote: patient.generalNote,
        doctorName: patient.doctorName,
        technicianName: patient.technicianName,
        supervisorName: "Ahmed Gazzeh", // Set supervisor for all
        status: patient.status,
        // Required Prisma fields
        userId: AHMED_GAZZEH_ID, // Default assignee
        doctorId: null, // Will be populated after doctors are imported
        technicianId: technicianId,
        supervisorId: AHMED_GAZZEH_ID // Ahmed Gazzeh as supervisor for all
      };
      
      return enhanced;
    });
    
    // Save output
    const output = {
      metadata: {
        totalPatients: enhancedPatients.length,
        generatedAt: new Date().toISOString(),
        dataQuality: {
          withCIN: enhancedPatients.filter(p => p.cin).length,
          withDateOfBirth: enhancedPatients.filter(p => p.dateOfBirth).length,
          withSecondPhone: enhancedPatients.filter(p => p.telephoneTwo).length,
          withDoctor: enhancedPatients.filter(p => p.doctorName).length,
          withTechnician: enhancedPatients.filter(p => p.technicianName).length
        }
      },
      patients: enhancedPatients
    };
    
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    
    console.log(`✅ Successfully enhanced patients data`);
    console.log(`📊 Statistics:`);
    console.log(`   - Total patients: ${enhancedPatients.length}`);
    console.log(`   - With CIN: ${output.metadata.dataQuality.withCIN}`);
    console.log(`   - With birth date: ${output.metadata.dataQuality.withDateOfBirth}`);
    console.log(`   - With doctor: ${output.metadata.dataQuality.withDoctor}`);
    console.log(`   - With technician: ${output.metadata.dataQuality.withTechnician}`);
    console.log(`📁 Output saved to: ${OUTPUT_PATH}`);
    
    // Show sample
    console.log('\n📋 Sample enhanced patients:');
    enhancedPatients.slice(0, 3).forEach(p => {
      console.log(`   - ${p.firstName} ${p.lastName} (${p.patientCode})`);
      console.log(`     Phone: ${p.telephone}, Gov: ${p.governorate}`);
    });
    
  } catch (error) {
    console.error('❌ Error enhancing patients data:', error);
    process.exit(1);
  }
}

// Run the script
enhancePatientsData();