import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const prisma = new PrismaClient();
const execPromise = promisify(exec);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // POST request - restore from backup
  if (req.method === 'POST') {
    try {
      const { backupId } = req.body;
      
      if (!backupId) {
        return res.status(400).json({ error: 'Backup ID is required' });
      }
      
      // Find the backup record
      const backup = await prisma.databaseBackup.findUnique({
        where: { id: backupId }
      });
      
      if (!backup) {
        return res.status(404).json({ error: 'Backup not found' });
      }
      
      // Check if backup file exists
      if (!fs.existsSync(backup.filePath)) {
        return res.status(404).json({ error: 'Backup file not found on disk' });
      }
      
      // Get database URL from environment variable
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        return res.status(500).json({ error: 'Database URL not configured' });
      }
      
      // Parse database connection string
      const dbUrlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      if (!dbUrlMatch) {
        return res.status(500).json({ error: 'Invalid database URL format' });
      }
      
      const [, user, password, host, port, dbname] = dbUrlMatch;
      
      // Create psql restore command
      const restoreCmd = `PGPASSWORD=${password} psql -U ${user} -h ${host} -p ${port} -d ${dbname} -f ${backup.filePath}`;
      
      // Execute restore command
      await execPromise(restoreCmd);
      
      // Update backup record with restore timestamp
      await prisma.databaseBackup.update({
        where: { id: backupId },
        data: {
          restoredAt: new Date()
        }
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Database restored successfully',
        restoredAt: new Date()
      });
    } catch (error) {
      console.error('Error restoring backup:', error);
      return res.status(500).json({ error: 'Failed to restore backup' });
    }
  }
  
  // DELETE request - delete a backup
  if (req.method === 'DELETE') {
    try {
      const { backupId } = req.body;
      
      if (!backupId) {
        return res.status(400).json({ error: 'Backup ID is required' });
      }
      
      // Find the backup record
      const backup = await prisma.databaseBackup.findUnique({
        where: { id: backupId }
      });
      
      if (!backup) {
        return res.status(404).json({ error: 'Backup not found' });
      }
      
      // Delete the file if it exists
      if (fs.existsSync(backup.filePath)) {
        fs.unlinkSync(backup.filePath);
      }
      
      // Delete the database record
      await prisma.databaseBackup.delete({
        where: { id: backupId }
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Backup deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting backup:', error);
      return res.status(500).json({ error: 'Failed to delete backup' });
    }
  }
  
  // Return 405 for other methods
  return res.status(405).json({ error: 'Method not allowed' });
}
