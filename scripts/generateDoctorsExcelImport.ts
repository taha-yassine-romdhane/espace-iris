import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

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
  createdAt: string;
  updatedAt: string;
}

interface ExcelDoctorRow {
  "Email": string;
  "Password": string;
  "First Name": string;
  "Last Name": string;
  "Role": string;
  "Speciality": string;
  "Telephone": string;
  "Address": string;
  "Is Active": string;
  "Created At": string;
  "Updated At": string;
}

const INPUT_PATH = path.join(__dirname, '../public/excell/json-data/doctors-import.json');
const OUTPUT_PATH = path.join(__dirname, '../public/excell/json-data/doctors-excel-import.xlsx');

function generateDoctorsExcelImport(): void {
  try {
    // Read doctors import data
    const inputFile = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
    const doctorsData: DoctorImport[] = inputFile.doctors || inputFile;

    // Convert to Excel format
    const excelData: ExcelDoctorRow[] = doctorsData.map(doctor => ({
      "Email": doctor.email,
      "Password": doctor.password,
      "First Name": doctor.firstName,
      "Last Name": doctor.lastName,
      "Role": doctor.role,
      "Speciality": doctor.speciality,
      "Telephone": doctor.telephone || "",
      "Address": doctor.address || "",
      "Is Active": doctor.isActive ? "TRUE" : "FALSE",
      "Created At": doctor.createdAt,
      "Updated At": doctor.updatedAt
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 30 }, // Email
      { wch: 15 }, // Password
      { wch: 15 }, // First Name
      { wch: 20 }, // Last Name
      { wch: 10 }, // Role
      { wch: 15 }, // Speciality
      { wch: 15 }, // Telephone
      { wch: 25 }, // Address
      { wch: 10 }, // Is Active
      { wch: 20 }, // Created At
      { wch: 20 }  // Updated At
    ];

    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Doctors');

    // Create metadata sheet
    const metadata = [
      { Field: "Total Doctors", Value: doctorsData.length },
      { Field: "Generated At", Value: new Date().toISOString() },
      { Field: "Role", Value: "All are DOCTOR role" },
      { Field: "Default Speciality", Value: "Pneumologue" },
      { Field: "Default Password", Value: "EliteDoc2025 (should be changed)" },
      { Field: "", Value: "" },
      { Field: "Import Instructions:", Value: "" },
      { Field: "1. Verify unique emails", Value: "Each email must be unique in system" },
      { Field: "2. Update passwords", Value: "Change default passwords after import" },
      { Field: "3. Check required fields", Value: "Email, Password, First Name, Last Name required" },
      { Field: "4. Role validation", Value: "Must be: ADMIN, EMPLOYEE, MANAGER, or DOCTOR" },
      { Field: "5. Boolean values", Value: "Is Active: TRUE or FALSE" },
      { Field: "6. Date format", Value: "ISO format: YYYY-MM-DDTHH:mm:ss.sssZ" },
      { Field: "", Value: "" },
      { Field: "Security Notes:", Value: "" },
      { Field: "- Change all passwords", Value: "Default password is EliteDoc2025" },
      { Field: "- Verify email addresses", Value: "Must be valid email format" },
      { Field: "- Check specialities", Value: "Update if different from Pneumologue" }
    ];

    const metadataSheet = XLSX.utils.json_to_sheet(metadata);
    metadataSheet['!cols'] = [{ wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Import Info');

    // Create validation rules sheet
    const validationRules = [
      { Field: "Email", "Valid Values": "user@elite.com format", Description: "Must be unique and valid email format" },
      { Field: "Password", "Valid Values": "Minimum 8 characters", Description: "Strong password recommended" },
      { Field: "Role", "Valid Values": "ADMIN, EMPLOYEE, MANAGER, DOCTOR", Description: "User role in system" },
      { Field: "Is Active", "Valid Values": "TRUE, FALSE", Description: "Account activation status" },
      { Field: "Speciality", "Valid Values": "Any text", Description: "Medical speciality (optional for non-doctors)" },
      { Field: "Dates", "Valid Values": "ISO format", Description: "YYYY-MM-DDTHH:mm:ss.sssZ format" },
      { Field: "Required Fields", "Valid Values": "Email, Password, First Name, Last Name", Description: "These fields cannot be empty" }
    ];

    const validationSheet = XLSX.utils.json_to_sheet(validationRules);
    validationSheet['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, validationSheet, 'Validation Rules');

    // Create sample additional users sheet (for technicians)
    const additionalUsers = [
      {
        "Email": "mohamed.tech@elite.com",
        "Password": "EliteTech2025",
        "First Name": "Mohamed",
        "Last Name": "Technician",
        "Role": "EMPLOYEE",
        "Speciality": "",
        "Telephone": "",
        "Address": "",
        "Is Active": "TRUE",
        "Created At": new Date().toISOString(),
        "Updated At": new Date().toISOString()
      },
      {
        "Email": "souhaieb.bensahra@elite.com",
        "Password": "EliteTech2025",
        "First Name": "Souhaieb",
        "Last Name": "Ben Sahra",
        "Role": "EMPLOYEE",
        "Speciality": "",
        "Telephone": "",
        "Address": "",
        "Is Active": "TRUE",
        "Created At": new Date().toISOString(),
        "Updated At": new Date().toISOString()
      }
    ];

    const additionalSheet = XLSX.utils.json_to_sheet(additionalUsers);
    additionalSheet['!cols'] = columnWidths;
    XLSX.utils.book_append_sheet(workbook, additionalSheet, 'Additional Users');

    // Save the Excel file
    XLSX.writeFile(workbook, OUTPUT_PATH);

    console.log(`✅ Successfully generated doctors Excel import file`);
    console.log(`📊 Statistics:`);
    console.log(`   - Total doctors: ${doctorsData.length}`);
    console.log(`   - Additional users: ${additionalUsers.length}`);
    console.log(`   - Columns: ${Object.keys(excelData[0]).length}`);
    console.log(`   - Worksheets: 4 (Doctors, Import Info, Validation Rules, Additional Users)`);
    console.log(`📁 Output saved to: ${OUTPUT_PATH}`);
    
    // Show speciality distribution
    const specialities = doctorsData.reduce((acc, doctor) => {
      acc[doctor.speciality] = (acc[doctor.speciality] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`\n📋 Speciality Distribution:`);
    Object.entries(specialities).forEach(([speciality, count]) => {
      console.log(`   - ${speciality}: ${count} doctors`);
    });

    // Show sample data
    console.log(`\n📋 Sample doctors in Excel:`);
    excelData.slice(0, 3).forEach((doctor, index) => {
      console.log(`   ${index + 1}. Dr. ${doctor["First Name"]} ${doctor["Last Name"]} (${doctor["Email"]})`);
      console.log(`      Speciality: ${doctor["Speciality"]}, Role: ${doctor["Role"]}`);
    });

    console.log(`\n⚠️  Security Reminder:`);
    console.log(`   - All doctors have default password: ${doctorsData[0]?.password}`);
    console.log(`   - Change passwords after import for security`);

  } catch (error) {
    console.error('❌ Error generating doctors Excel import:', error);
    process.exit(1);
  }
}

// Run the script
generateDoctorsExcelImport();