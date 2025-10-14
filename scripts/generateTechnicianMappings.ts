import * as fs from 'fs';
import * as path from 'path';

interface Patient {
  "TECHNICIEN": string;
}

interface DashboardEntry {
  "__EMPTY_6": string; // Technicien field
  "__EMPTY_7": string; // Superviseur field
}

interface UserMapping {
  userId: string | null;
  fullName: string;
  email: string | null;
  note?: string;
}

interface NewUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  telephone: string;
  isActive: boolean;
}

const PATIENTS_PATH = path.join(__dirname, '../public/excell/json-data/patients.json');
const DASHBOARD_PATH = path.join(__dirname, '../public/excell/json-data/dashboard.json');
const OUTPUT_PATH = path.join(__dirname, '../public/excell/json-data/technician-mappings.json');

// Existing users from database
const EXISTING_USERS = {
  "ACHRAF": { id: "cme43uv7k0004oamtu24s7igf", name: "Achraf Mlayah", email: "achraf@elite.com" },
  "BILEL": { id: "cme43x525000boamtr91cww0g", name: "Bilel Bouhlel", email: "bilel@elite.com" },
  "GAITH": { id: "cme43uvht0007oamtaycbehwf", name: "Ghaith Mlayah", email: "ghaith@elite.com" },
  "GHAITH": { id: "cme43uvht0007oamtaycbehwf", name: "Ghaith Mlayah", email: "ghaith@elite.com" },
  "KARIM": { id: "cme43uulr0000oamtlwtibwua", name: "Karim Brahem", email: "karim@elite.com" },
  "AHMED": { id: "cme43uuw40003oamthleh171m", name: "Ahmed Gazzeh", email: "ahmed@elite.com" },
};

// Name variations mapping
const NAME_VARIATIONS: { [key: string]: string } = {
  "BIEL": "BILEL",
  "GAITH": "GHAITH",
  "Bilel Bouhlel": "BILEL",
  "BILEL Bouhlel": "BILEL",
};

function generateTechnicianMappings(): void {
  try {
    // Read data files
    const patientsData = JSON.parse(fs.readFileSync(PATIENTS_PATH, 'utf-8'));
    const dashboardData = JSON.parse(fs.readFileSync(DASHBOARD_PATH, 'utf-8'));
    
    // Extract unique technician names
    const technicianNames = new Set<string>();
    const supervisorNames = new Set<string>();
    
    // From patients
    patientsData.forEach((patient: Patient) => {
      if (patient["TECHNICIEN"] && patient["TECHNICIEN"].trim()) {
        technicianNames.add(patient["TECHNICIEN"].trim().toUpperCase());
      }
    });
    
    // From dashboard (supervisors and technicians)
    dashboardData.forEach((entry: DashboardEntry) => {
      if (entry["__EMPTY_6"] && entry["__EMPTY_6"].trim() && 
          !entry["__EMPTY_6"].includes("Technicien")) {
        technicianNames.add(entry["__EMPTY_6"].trim().toUpperCase());
      }
      if (entry["__EMPTY_7"] && entry["__EMPTY_7"].trim() && 
          entry["__EMPTY_7"] !== "0" && 
          !entry["__EMPTY_7"].includes("Superviseur")) {
        supervisorNames.add(entry["__EMPTY_7"].trim());
      }
    });
    
    // Build technician mappings
    const technicianMappings: { [key: string]: UserMapping } = {};
    const newUsersToCreate: NewUser[] = [];
    
    Array.from(technicianNames).sort().forEach(name => {
      // Check if it's a variation
      const canonicalName = NAME_VARIATIONS[name] || name;
      
      if (EXISTING_USERS[canonicalName]) {
        technicianMappings[name] = {
          userId: EXISTING_USERS[canonicalName].id,
          fullName: EXISTING_USERS[canonicalName].name,
          email: EXISTING_USERS[canonicalName].email
        };
        if (NAME_VARIATIONS[name]) {
          technicianMappings[name].note = `Variation of ${canonicalName}`;
        }
      } else {
        // Need to create new user
        technicianMappings[name] = {
          userId: null,
          fullName: `${name} (To be created)`,
          email: null,
          note: "User needs to be created"
        };
        
        // Add to new users list (only MOHAMED and SOUHAIEB need creation)
        if (name === "MOHAMED" || name === "SOUHAIEB") {
          const firstName = name.charAt(0) + name.slice(1).toLowerCase();
          newUsersToCreate.push({
            email: `${firstName.toLowerCase()}.tech@elite.com`,
            password: "EliteTech2025",
            firstName: firstName,
            lastName: name === "SOUHAIEB" ? "Ben Sahra" : "Technician",
            role: "EMPLOYEE",
            telephone: "",
            isActive: true
          });
        }
      }
    });
    
    // Build supervisor mappings
    const supervisorMappings: { [key: string]: UserMapping } = {};
    
    Array.from(supervisorNames).sort().forEach(name => {
      const upperName = name.toUpperCase();
      const canonicalName = NAME_VARIATIONS[name] || NAME_VARIATIONS[upperName] || upperName;
      
      if (EXISTING_USERS[canonicalName]) {
        supervisorMappings[name] = {
          userId: EXISTING_USERS[canonicalName].id,
          fullName: EXISTING_USERS[canonicalName].name,
          email: EXISTING_USERS[canonicalName].email
        };
      } else if (name === "SOUHAIEB BEN SAHRA") {
        supervisorMappings[name] = {
          userId: null,
          fullName: "Souhaieb Ben Sahra",
          email: null,
          note: "User needs to be created"
        };
      } else {
        supervisorMappings[name] = {
          userId: null,
          fullName: name,
          email: null,
          note: "Unknown supervisor"
        };
      }
    });
    
    // Save output
    const output = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalTechnicians: Object.keys(technicianMappings).length,
        totalSupervisors: Object.keys(supervisorMappings).length,
        newUsersRequired: newUsersToCreate.length
      },
      technicianMappings,
      supervisorMappings,
      newUsersToCreate
    };
    
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    
    console.log(`✅ Successfully generated technician mappings`);
    console.log(`📊 Statistics:`);
    console.log(`   - Technicians found: ${Object.keys(technicianMappings).length}`);
    console.log(`   - Supervisors found: ${Object.keys(supervisorMappings).length}`);
    console.log(`   - New users to create: ${newUsersToCreate.length}`);
    console.log(`📁 Output saved to: ${OUTPUT_PATH}`);
    
    // Display unmapped users
    const unmapped = Object.entries(technicianMappings)
      .filter(([_, mapping]) => mapping.userId === null);
    
    if (unmapped.length > 0) {
      console.log('\n⚠️  Unmapped technicians:');
      unmapped.forEach(([name, mapping]) => {
        console.log(`   - ${name}: ${mapping.note}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error generating technician mappings:', error);
    process.exit(1);
  }
}

// Run the script
generateTechnicianMappings();