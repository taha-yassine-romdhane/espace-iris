import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { Parser } from 'json2csv';
import { create } from 'xmlbuilder2';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const execPromise = promisify(exec);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET request - list all backups from database
  if (req.method === 'GET') {
    try {
      const backups = await prisma.databaseBackup.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return res.status(200).json(backups);
    } catch (error) {
      console.error('Error fetching backups:', error);
      return res.status(500).json({ error: 'Failed to fetch backups' });
    }
  }
  
  // POST request - create and download a backup
  if (req.method === 'POST') {
    try {
      const { description, userId, format = 'json' } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      // Validate format
      const validFormats = ['json', 'sql', 'xml', 'csv', 'xlsx'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({ error: `Invalid format. Supported formats: ${validFormats.join(', ')}` });
      }
      
      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let backupFileName = `backup-${timestamp}.${format}`;
      let actualFormat = format;
      
      let backupContent: Buffer = Buffer.from(''); // Initialize with empty buffer
      let contentType: string = 'application/octet-stream';
      
      // Handle SQL format first (requires special handling)
      if (format === 'sql') {
        try {
          // Get database URL from environment variable
          const databaseUrl = process.env.DATABASE_URL;
          if (!databaseUrl) {
            throw new Error('Database URL not configured for SQL backup');
          }
          
          // Parse database connection string
          const dbUrlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
          if (!dbUrlMatch) {
            throw new Error('Invalid database URL format for PostgreSQL');
          }
          
          const [, user, password, host, port, dbname] = dbUrlMatch;
          
          // Create temporary file for SQL dump
          const tempDir = '/tmp';
          const tempFile = path.join(tempDir, `backup-${Date.now()}.sql`);
          
          // Create pg_dump command with proper escaping
          const pgDumpCmd = `PGPASSWORD='${password}' pg_dump -U '${user}' -h '${host}' -p ${port} -d '${dbname}' -f '${tempFile}' --no-owner --no-privileges --clean --if-exists`;
          
          // Execute pg_dump
          await execPromise(pgDumpCmd);
          
          // Check if file was created and read it
          if (!fs.existsSync(tempFile)) {
            throw new Error('SQL dump file was not created');
          }
          
          backupContent = fs.readFileSync(tempFile);
          contentType = 'application/sql';
          
          // Clean up temporary file
          fs.unlinkSync(tempFile);
          
        } catch (sqlError) {
          console.error('SQL backup failed:', sqlError);
          // Fall back to JSON format
          actualFormat = 'json';
          backupFileName = `backup-${timestamp}.json`;
        }
      }
      
      // Handle other formats or fallback for SQL
      if (format !== 'sql' || actualFormat === 'json') {
        // Fetch critical data from database
        const patients = await prisma.patient.findMany();
        const companies = await prisma.company.findMany();
        const medicalDevices = await prisma.medicalDevice.findMany();
        const settings = await prisma.appSettings.findFirst();
        
        // Create the backup data object
        const backupData = {
          timestamp: new Date().toISOString(),
          version: '1.0',
          patients,
          companies,
          medicalDevices,
          settings
        };
        
        // Generate the appropriate format
        switch (actualFormat) {
          case 'json':
            backupContent = Buffer.from(JSON.stringify(backupData, null, 2));
            contentType = 'application/json';
            break;
            
          case 'xml':
            const xmlDoc = create({ backup: backupData });
            backupContent = Buffer.from(xmlDoc.end({ prettyPrint: true }));
            contentType = 'application/xml';
            break;
            
          case 'csv':
            // Create a comprehensive CSV with all data
            const csvData = [];
            
            // Add summary row
            csvData.push({
              type: 'summary',
              timestamp: backupData.timestamp,
              version: backupData.version,
              patients_count: backupData.patients.length,
              companies_count: backupData.companies.length,
              devices_count: backupData.medicalDevices.length,
              has_settings: backupData.settings ? 'yes' : 'no'
            });
            
            // Add all data rows with type identifier
            backupData.patients.forEach(patient => {
              csvData.push({ record_type: 'patient', ...patient });
            });
            
            backupData.companies.forEach(company => {
              csvData.push({ record_type: 'company', ...company });
            });
            
            backupData.medicalDevices.forEach(device => {
              csvData.push({ record_type: 'medical_device', ...device });
            });
            
            if (backupData.settings) {
              csvData.push({ record_type: 'settings', ...backupData.settings });
            }
            
            const parser = new Parser();
            const csvString = parser.parse(csvData);
            backupContent = Buffer.from(csvString);
            contentType = 'text/csv';
            break;
            
          case 'xlsx':
            const workbook = XLSX.utils.book_new();
            
            // Add summary worksheet
            const summaryData = [{
              timestamp: backupData.timestamp,
              version: backupData.version,
              patients_count: backupData.patients.length,
              companies_count: backupData.companies.length,
              devices_count: backupData.medicalDevices.length,
              has_settings: backupData.settings ? 'Yes' : 'No'
            }];
            const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
            
            // Add each entity as a separate worksheet
            if (backupData.patients.length > 0) {
              const patientsWorksheet = XLSX.utils.json_to_sheet(backupData.patients);
              XLSX.utils.book_append_sheet(workbook, patientsWorksheet, 'Patients');
            }
            
            if (backupData.companies.length > 0) {
              const companiesWorksheet = XLSX.utils.json_to_sheet(backupData.companies);
              XLSX.utils.book_append_sheet(workbook, companiesWorksheet, 'Companies');
            }
            
            if (backupData.medicalDevices.length > 0) {
              const devicesWorksheet = XLSX.utils.json_to_sheet(backupData.medicalDevices);
              XLSX.utils.book_append_sheet(workbook, devicesWorksheet, 'Medical_Devices');
            }
            
            // Add settings as a separate worksheet if available
            if (backupData.settings) {
              const settingsWorksheet = XLSX.utils.json_to_sheet([backupData.settings]);
              XLSX.utils.book_append_sheet(workbook, settingsWorksheet, 'Settings');
            }
            
            // Convert workbook to buffer
            backupContent = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            break;
            
          default:
            // Default to JSON if format is not recognized
            backupContent = Buffer.from(JSON.stringify(backupData, null, 2));
            contentType = 'application/json';
            actualFormat = 'json';
        }
      }
      
      // Create backup record in database (without file path since we're not saving to disk)
      const backup = await prisma.databaseBackup.create({
        data: {
          fileName: backupFileName,
          filePath: '', // No file path since we're not saving to disk
          fileSize: backupContent.length,
          format: actualFormat,
          source: 'download',
          description: description || `${actualFormat.toUpperCase()} backup created on ${new Date().toLocaleString()}`,
          createdBy: userId,
        }
      });
      
      // Set appropriate headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${backupFileName}"`);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', backupContent.length.toString());
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Send the file content
      return res.status(200).send(backupContent);
    } catch (error) {
      console.error('Error creating backup:', error);
      return res.status(500).json({ 
        error: 'Failed to create backup', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Return 405 for other methods
  return res.status(405).json({ error: 'Method not allowed' });
}
