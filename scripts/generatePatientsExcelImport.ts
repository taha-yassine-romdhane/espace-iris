import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

interface PatientPrismaReady {
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
  userId: string;
  doctorId: string | null;
  technicianId: string | null;
  supervisorId: string | null;
}

interface ExcelPatientRow {
  "Patient Code": string;
  "First Name": string;
  "Last Name": string;
  "CIN": string;
  "Date of Birth": string;
  "Primary Phone": string;
  "Secondary Phone": string;
  "Governorate": string;
  "Delegation": string;
  "Detailed Address": string;
  "Affiliation": string;
  "Beneficiary Type": string;
  "Medical History": string;
  "General Notes": string;
  "Doctor Name": string;
  "Technician Name": string;
  "Supervisor Name": string;
  "Status": string;
  "Assigned User ID": string;
  "Doctor ID": string;
  "Technician ID": string;
  "Supervisor ID": string;
}

const INPUT_PATH = path.join(__dirname, '../public/excell/json-data/patients-prisma-ready.json');
const OUTPUT_PATH = path.join(__dirname, '../public/excell/json-data/patients-excel-import.xlsx');

function generatePatientsExcelImport(): void {
  try {
    // Read Prisma-ready patients data
    const inputFile = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
    const patientsData: PatientPrismaReady[] = inputFile.patients || inputFile;

    // Convert to Excel format
    const excelData: ExcelPatientRow[] = patientsData.map(patient => ({
      "Patient Code": patient.patientCode,
      "First Name": patient.firstName,
      "Last Name": patient.lastName,
      "CIN": patient.cin || "",
      "Date of Birth": patient.dateOfBirth || "",
      "Primary Phone": patient.telephone,
      "Secondary Phone": patient.telephoneTwo || "",
      "Governorate": patient.governorate,
      "Delegation": patient.delegation,
      "Detailed Address": patient.detailedAddress,
      "Affiliation": patient.affiliation,
      "Beneficiary Type": patient.beneficiaryType,
      "Medical History": patient.medicalHistory || "",
      "General Notes": patient.generalNote || "",
      "Doctor Name": patient.doctorName || "",
      "Technician Name": patient.technicianName || "",
      "Supervisor Name": patient.supervisorName || "",
      "Status": patient.status,
      "Assigned User ID": patient.userId,
      "Doctor ID": patient.doctorId || "",
      "Technician ID": patient.technicianId || "",
      "Supervisor ID": patient.supervisorId
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 12 }, // Patient Code
      { wch: 15 }, // First Name
      { wch: 20 }, // Last Name
      { wch: 15 }, // CIN
      { wch: 12 }, // Date of Birth
      { wch: 15 }, // Primary Phone
      { wch: 15 }, // Secondary Phone
      { wch: 12 }, // Governorate
      { wch: 15 }, // Delegation
      { wch: 25 }, // Detailed Address
      { wch: 12 }, // Affiliation
      { wch: 15 }, // Beneficiary Type
      { wch: 20 }, // Medical History
      { wch: 30 }, // General Notes
      { wch: 20 }, // Doctor Name
      { wch: 15 }, // Technician Name
      { wch: 15 }, // Supervisor Name
      { wch: 10 }, // Status
      { wch: 25 }, // Assigned User ID
      { wch: 25 }, // Doctor ID
      { wch: 25 }, // Technician ID
      { wch: 25 }  // Supervisor ID
    ];

    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Patients');

    // Create metadata sheet
    const metadata = [
      { Field: "Total Patients", Value: patientsData.length },
      { Field: "Generated At", Value: new Date().toISOString() },
      { Field: "With CIN", Value: patientsData.filter(p => p.cin).length },
      { Field: "With Birth Date", Value: patientsData.filter(p => p.dateOfBirth).length },
      { Field: "With Second Phone", Value: patientsData.filter(p => p.telephoneTwo).length },
      { Field: "With Doctor", Value: patientsData.filter(p => p.doctorName).length },
      { Field: "With Technician", Value: patientsData.filter(p => p.technicianName).length },
      { Field: "", Value: "" },
      { Field: "Import Instructions:", Value: "" },
      { Field: "1. Verify all phone numbers", Value: "Should start with +216" },
      { Field: "2. Check required fields", Value: "Patient Code, First Name, Last Name, Phone" },
      { Field: "3. Validate enum values", Value: "Affiliation: CNSS|CNRPS, Beneficiary: ASSURE_SOCIAL|CONJOINT|ENFANT|ASSANDANT" },
      { Field: "4. User IDs must exist", Value: "Verify Doctor ID, Technician ID, Supervisor ID exist in database" },
      { Field: "5. Status values", Value: "ACTIVE or INACTIVE" }
    ];

    const metadataSheet = XLSX.utils.json_to_sheet(metadata);
    metadataSheet['!cols'] = [{ wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Import Info');

    // Create validation rules sheet
    const validationRules = [
      { Field: "Affiliation", "Valid Values": "CNSS, CNRPS", Description: "Insurance type" },
      { Field: "Beneficiary Type", "Valid Values": "ASSURE_SOCIAL, CONJOINT, ENFANT, ASSANDANT", Description: "Relationship to insured person" },
      { Field: "Status", "Valid Values": "ACTIVE, INACTIVE", Description: "Patient status" },
      { Field: "Phone Format", "Valid Values": "+216XXXXXXXX", Description: "Must start with +216 country code" },
      { Field: "Date Format", "Valid Values": "YYYY-MM-DD or empty", Description: "ISO date format or leave empty" },
      { Field: "Required Fields", "Valid Values": "Patient Code, First Name, Last Name, Primary Phone", Description: "These fields cannot be empty" }
    ];

    const validationSheet = XLSX.utils.json_to_sheet(validationRules);
    validationSheet['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, validationSheet, 'Validation Rules');

    // Save the Excel file
    XLSX.writeFile(workbook, OUTPUT_PATH);

    console.log(`✅ Successfully generated patients Excel import file`);
    console.log(`📊 Statistics:`);
    console.log(`   - Total patients: ${patientsData.length}`);
    console.log(`   - Columns: ${Object.keys(excelData[0]).length}`);
    console.log(`   - Worksheets: 3 (Patients, Import Info, Validation Rules)`);
    console.log(`📁 Output saved to: ${OUTPUT_PATH}`);
    
    // Show data quality summary
    console.log(`\n📋 Data Quality Summary:`);
    console.log(`   - With CIN: ${patientsData.filter(p => p.cin).length}/${patientsData.length}`);
    console.log(`   - With birth date: ${patientsData.filter(p => p.dateOfBirth).length}/${patientsData.length}`);
    console.log(`   - With second phone: ${patientsData.filter(p => p.telephoneTwo).length}/${patientsData.length}`);
    console.log(`   - With doctor assigned: ${patientsData.filter(p => p.doctorName).length}/${patientsData.length}`);
    console.log(`   - With technician assigned: ${patientsData.filter(p => p.technicianName).length}/${patientsData.length}`);

    // Show sample data
    console.log(`\n📋 Sample patients in Excel:`);
    excelData.slice(0, 3).forEach((patient, index) => {
      console.log(`   ${index + 1}. ${patient["First Name"]} ${patient["Last Name"]} (${patient["Patient Code"]})`);
      console.log(`      Phone: ${patient["Primary Phone"]}, Location: ${patient["Governorate"]}`);
    });

  } catch (error) {
    console.error('❌ Error generating patients Excel import:', error);
    process.exit(1);
  }
}

// Run the script
generatePatientsExcelImport();