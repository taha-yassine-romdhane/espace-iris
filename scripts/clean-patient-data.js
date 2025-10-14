const fs = require('fs');
const path = require('path');

// Read the original data
const inputFile = path.join(__dirname, '../public/excell/json-data/patients-prisma-ready.json');
const outputFile = path.join(__dirname, '../public/excell/json-data/patients-cleaned.json');

console.log('🔄 Starting patient data cleaning...\n');

// Read the JSON file
const rawData = fs.readFileSync(inputFile, 'utf8');
const data = JSON.parse(rawData);

let fixedIssues = {
  datesFixed: 0,
  cinCleaned: 0,
  statusRemoved: 0,
  affiliationFixed: 0
};

// Clean the patient data
const cleanedPatients = data.patients.map((patient, index) => {
  const cleaned = { ...patient };
  
  // 1. Fix invalid future dates (year > 2025)
  if (cleaned.dateOfBirth) {
    const year = parseInt(cleaned.dateOfBirth.substring(0, 4));
    if (year > 2025) {
      // Subtract 100 years to fix the date
      const correctedYear = year - 100;
      cleaned.dateOfBirth = cleaned.dateOfBirth.replace(year.toString(), correctedYear.toString());
      fixedIssues.datesFixed++;
      console.log(`✅ Fixed date for ${cleaned.firstName} ${cleaned.lastName}: ${patient.dateOfBirth} → ${cleaned.dateOfBirth}`);
    }
  }
  
  // 2. Clean CIN numbers (remove "N°" prefix and trim spaces)
  if (cleaned.cin) {
    cleaned.cin = cleaned.cin.trim(); // First trim any leading/trailing spaces
    if (cleaned.cin.includes('N°')) {
      cleaned.cin = cleaned.cin.replace('N°', '').trim();
      fixedIssues.cinCleaned++;
    }
  }
  
  // 3. Remove the status field (not in schema)
  if (cleaned.status) {
    delete cleaned.status;
    fixedIssues.statusRemoved++;
  }
  
  // 4. Ensure affiliation values match enum (CNSS, CNAM, NONE)
  if (cleaned.affiliation) {
    // Map common variations to valid enum values
    const affiliationMap = {
      'CNSS': 'CNSS',
      'CNAM': 'CNAM',
      'NONE': 'NONE',
      'AUCUNE': 'NONE',
      '': 'NONE',
      null: 'NONE'
    };
    
    const upperAffiliation = cleaned.affiliation.toUpperCase();
    if (affiliationMap[upperAffiliation]) {
      cleaned.affiliation = affiliationMap[upperAffiliation];
    } else {
      // Default to NONE if unknown
      console.log(`⚠️  Unknown affiliation "${cleaned.affiliation}" for patient ${cleaned.patientCode}, defaulting to NONE`);
      cleaned.affiliation = 'NONE';
      fixedIssues.affiliationFixed++;
    }
  }
  
  // 5. Ensure beneficiaryType values match enum
  if (cleaned.beneficiaryType) {
    const validBeneficiaryTypes = ['ASSURE_SOCIAL', 'BENEFICIARY', 'OTHER'];
    if (!validBeneficiaryTypes.includes(cleaned.beneficiaryType)) {
      console.log(`⚠️  Invalid beneficiaryType "${cleaned.beneficiaryType}" for patient ${cleaned.patientCode}`);
      // Map common values
      if (cleaned.beneficiaryType === 'ASSURE' || cleaned.beneficiaryType === 'ASSURE_SOCIALE') {
        cleaned.beneficiaryType = 'ASSURE_SOCIAL';
      } else {
        cleaned.beneficiaryType = 'OTHER';
      }
    }
  }
  
  // 6. Ensure telephone numbers are properly formatted
  if (cleaned.telephone && !cleaned.telephone.startsWith('+216')) {
    // Add country code if missing
    if (cleaned.telephone.match(/^[0-9]/)) {
      cleaned.telephone = '+216' + cleaned.telephone;
    }
  }
  if (cleaned.telephoneTwo && !cleaned.telephoneTwo.startsWith('+216')) {
    if (cleaned.telephoneTwo.match(/^[0-9]/)) {
      cleaned.telephoneTwo = '+216' + cleaned.telephoneTwo;
    }
  }
  
  return cleaned;
});

// Update metadata
const cleanedData = {
  metadata: {
    ...data.metadata,
    cleanedAt: new Date().toISOString(),
    cleaningReport: {
      totalPatients: cleanedPatients.length,
      datesFixed: fixedIssues.datesFixed,
      cinCleaned: fixedIssues.cinCleaned,
      statusFieldsRemoved: fixedIssues.statusRemoved,
      affiliationFixed: fixedIssues.affiliationFixed
    }
  },
  patients: cleanedPatients
};

// Write the cleaned data
fs.writeFileSync(outputFile, JSON.stringify(cleanedData, null, 2));

// Print summary
console.log('\n📊 Cleaning Summary:');
console.log('====================');
console.log(`✅ Total patients processed: ${cleanedPatients.length}`);
console.log(`✅ Dates fixed: ${fixedIssues.datesFixed}`);
console.log(`✅ CIN numbers cleaned: ${fixedIssues.cinCleaned}`);
console.log(`✅ Status fields removed: ${fixedIssues.statusRemoved}`);
console.log(`✅ Affiliation values fixed: ${fixedIssues.affiliationFixed}`);
console.log(`\n💾 Cleaned data saved to: ${outputFile}`);

// Verify the cleaned data
console.log('\n🔍 Verifying cleaned data...');
let verificationIssues = [];

cleanedPatients.forEach(patient => {
  // Check for future dates
  if (patient.dateOfBirth) {
    const year = parseInt(patient.dateOfBirth.substring(0, 4));
    if (year > 2025) {
      verificationIssues.push(`Patient ${patient.patientCode} still has future date: ${patient.dateOfBirth}`);
    }
  }
  
  // Check for CIN with prefix
  if (patient.cin && patient.cin.includes('N°')) {
    verificationIssues.push(`Patient ${patient.patientCode} still has N° in CIN: ${patient.cin}`);
  }
  
  // Check for status field
  if (patient.status !== undefined) {
    verificationIssues.push(`Patient ${patient.patientCode} still has status field`);
  }
  
  // Check affiliation values
  const validAffiliations = ['CNSS', 'CNAM', 'NONE'];
  if (patient.affiliation && !validAffiliations.includes(patient.affiliation)) {
    verificationIssues.push(`Patient ${patient.patientCode} has invalid affiliation: ${patient.affiliation}`);
  }
});

if (verificationIssues.length === 0) {
  console.log('✅ All data quality issues have been fixed!');
  console.log('\n🎉 The data is now ready for database import!');
} else {
  console.log('⚠️  Some issues remain:');
  verificationIssues.forEach(issue => console.log(`  - ${issue}`));
}