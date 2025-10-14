import * as fs from 'fs';
import * as path from 'path';

interface IntegrationStep {
  order: number;
  name: string;
  description: string;
  script?: string;
  inputFiles: string[];
  outputFiles: string[];
  dependencies: string[];
  status: 'pending' | 'ready' | 'completed';
}

const DATA_DIR = path.join(__dirname, '../public/excell/json-data');
const OUTPUT_PATH = path.join(DATA_DIR, 'integration-summary.json');

function generateIntegrationSummary(): void {
  try {
    // Define integration steps
    const integrationSteps: IntegrationStep[] = [
      {
        order: 1,
        name: "Generate Doctor Users",
        description: "Extract doctors from patient data and prepare for user creation",
        script: "generateDoctorsImport.ts",
        inputFiles: ["patients.json"],
        outputFiles: ["doctors-import.json"],
        dependencies: [],
        status: "ready"
      },
      {
        order: 2,
        name: "Generate Technician Mappings",
        description: "Map technician names to existing users and identify new users needed",
        script: "generateTechnicianMappings.ts",
        inputFiles: ["patients.json", "dashboard.json"],
        outputFiles: ["technician-mappings.json"],
        dependencies: [],
        status: "ready"
      },
      {
        order: 3,
        name: "Create New Users",
        description: "Import doctors and missing technicians as users in database",
        inputFiles: ["doctors-import.json", "technician-mappings.json"],
        outputFiles: [],
        dependencies: ["Generate Doctor Users", "Generate Technician Mappings"],
        status: "pending"
      },
      {
        order: 4,
        name: "Enhance Patient Data",
        description: "Clean and enhance patient data with proper formatting and relationships",
        script: "enhancePatientsData.ts",
        inputFiles: ["patients.json", "technician-mappings.json"],
        outputFiles: ["patients-enhanced.json"],
        dependencies: ["Generate Technician Mappings"],
        status: "ready"
      },
      {
        order: 5,
        name: "Import Patients",
        description: "Import enhanced patients to database with proper relationships",
        inputFiles: ["patients-enhanced.json"],
        outputFiles: [],
        dependencies: ["Create New Users", "Enhance Patient Data"],
        status: "pending"
      },
      {
        order: 6,
        name: "Import Medical Devices",
        description: "Import medical devices from Prisma-ready file",
        inputFiles: ["devices-prisma-ready.json"],
        outputFiles: [],
        dependencies: [],
        status: "ready"
      },
      {
        order: 7,
        name: "Import Rentals",
        description: "Import rental records with patient and device relationships",
        inputFiles: ["rentals-cleaned.json"],
        outputFiles: [],
        dependencies: ["Import Patients", "Import Medical Devices"],
        status: "pending"
      },
      {
        order: 8,
        name: "Import CNAM Bonds",
        description: "Import CNAM insurance bonds and link to rentals",
        inputFiles: ["cnam-bonds-cleaned.json"],
        outputFiles: [],
        dependencies: ["Import Rentals"],
        status: "pending"
      },
      {
        order: 9,
        name: "Import Rental Periods",
        description: "Import rental payment periods",
        inputFiles: ["rental-periods-cleaned.json"],
        outputFiles: [],
        dependencies: ["Import Rentals", "Import CNAM Bonds"],
        status: "pending"
      },
      {
        order: 10,
        name: "Verify Data Integrity",
        description: "Run validation checks on all imported data",
        inputFiles: [],
        outputFiles: ["validation-report.json"],
        dependencies: ["Import Rental Periods"],
        status: "pending"
      }
    ];
    
    // Check file existence
    const fileStatus: { [key: string]: boolean } = {};
    const allFiles = new Set<string>();
    
    integrationSteps.forEach(step => {
      [...step.inputFiles, ...step.outputFiles].forEach(file => {
        allFiles.add(file);
      });
    });
    
    allFiles.forEach(file => {
      const filePath = path.join(DATA_DIR, file);
      fileStatus[file] = fs.existsSync(filePath);
    });
    
    // Generate summary
    const summary = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalSteps: integrationSteps.length,
        readySteps: integrationSteps.filter(s => s.status === 'ready').length,
        pendingSteps: integrationSteps.filter(s => s.status === 'pending').length,
        completedSteps: integrationSteps.filter(s => s.status === 'completed').length
      },
      fileStatus,
      integrationSteps,
      executionOrder: integrationSteps.map(s => ({
        order: s.order,
        name: s.name,
        script: s.script || "Manual process",
        status: s.status
      }))
    };
    
    // Save summary
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(summary, null, 2));
    
    console.log(`✅ Integration Summary Generated`);
    console.log(`📊 Overview:`);
    console.log(`   - Total steps: ${summary.metadata.totalSteps}`);
    console.log(`   - Ready to execute: ${summary.metadata.readySteps}`);
    console.log(`   - Pending: ${summary.metadata.pendingSteps}`);
    console.log(`   - Completed: ${summary.metadata.completedSteps}`);
    
    console.log(`\n📋 Execution Order:`);
    summary.executionOrder.forEach(step => {
      const statusIcon = step.status === 'ready' ? '✅' : 
                        step.status === 'completed' ? '🎯' : '⏳';
      console.log(`   ${step.order}. ${statusIcon} ${step.name} (${step.script})`);
    });
    
    console.log(`\n📁 Missing Files:`);
    Object.entries(fileStatus).forEach(([file, exists]) => {
      if (!exists) {
        console.log(`   ❌ ${file}`);
      }
    });
    
    console.log(`\n📁 Output saved to: ${OUTPUT_PATH}`);
    
  } catch (error) {
    console.error('❌ Error generating integration summary:', error);
    process.exit(1);
  }
}

// Run the script
generateIntegrationSummary();