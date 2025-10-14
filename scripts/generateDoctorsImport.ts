import * as fs from 'fs';
import * as path from 'path';

interface PatientEnhanced {
  doctorName: string | null;
}

interface DoctorImport {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  speciality: string;
  telephone: string;
  address?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const INPUT_PATH = path.join(__dirname, '../public/excell/json-data/patients-enhanced.json');
const OUTPUT_PATH = path.join(__dirname, '../public/excell/json-data/doctors-import.json');

// Existing doctor in database (to exclude)
const EXISTING_DOCTORS = ['ABBES ROMDHANE'];

function extractDoctorsFromPatients(): void {
  try {
    // Read patients enhanced data
    const patientsFile = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
    const patientsData = patientsFile.patients || patientsFile;
    
    // Extract unique doctor names
    const doctorNames = new Set<string>();
    
    patientsData.forEach((patient: PatientEnhanced) => {
      if (patient.doctorName && patient.doctorName.trim() && patient.doctorName !== "***") {
        // Handle multiple doctors separated by /
        const names = patient.doctorName.split('/').map(n => n.trim());
        names.forEach(name => {
          if (name && !EXISTING_DOCTORS.includes(name.toUpperCase())) {
            doctorNames.add(name);
          }
        });
      }
    });
    
    // Convert doctor names to user objects
    const doctors: DoctorImport[] = Array.from(doctorNames)
      .sort()
      .map(fullName => {
        // Parse name parts
        const nameParts = fullName.split(' ').filter(p => p);
        let firstName = '';
        let lastName = '';
        
        if (nameParts.length >= 2) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        } else {
          firstName = fullName;
          lastName = '';
        }
        
        // Generate email from name
        const emailName = fullName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove accents
          .replace(/[^a-z0-9\s]/g, '') // Remove special chars
          .replace(/\s+/g, '.');
        
        return {
          email: `${emailName}@elite.com`,
          password: "EliteDoc2025", // Default password - should be changed
          firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase(),
          lastName: lastName.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' '),
          role: "DOCTOR",
          speciality: "Pneumologue", // Default speciality
          telephone: "",
          address: null,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });
    
    // Save to file
    const output = {
      metadata: {
        totalDoctors: doctors.length,
        generatedAt: new Date().toISOString(),
        note: "Doctors extracted from patient data. Passwords should be changed after import."
      },
      doctors
    };
    
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    
    console.log(`✅ Successfully generated doctors import file`);
    console.log(`📊 Total doctors to import: ${doctors.length}`);
    console.log(`📁 Output saved to: ${OUTPUT_PATH}`);
    
    // Display sample
    console.log('\n📋 Sample doctors:');
    doctors.slice(0, 5).forEach(doc => {
      console.log(`  - ${doc.firstName} ${doc.lastName} (${doc.email})`);
    });
    
  } catch (error) {
    console.error('❌ Error generating doctors import:', error);
    process.exit(1);
  }
}

// Run the script
extractDoctorsFromPatients();