import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/db';
import fs from 'fs';
import path from 'path';

// Base storage path outside the project
const STORAGE_BASE_PATH = '/home/taha/Desktop/projects/espace-elite-files';

// Helper function to delete file from filesystem
const deleteFileFromDisk = async (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`File deleted from disk: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error deleting file from disk: ${filePath}`, error);
    // Don't throw error, just log it
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get the session to check if the user is authenticated
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Handle GET request to fetch files
  if (req.method === 'GET') {
    try {
      const { patientId, companyId } = req.query;
      
      // Fetch files based on query parameters
      const files = await prisma.file.findMany({
        where: {
          ...(patientId ? { patientId: patientId as string } : {}),
          ...(companyId ? { companyId: companyId as string } : {})
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return res.status(200).json(files);
    } catch (error) {
      console.error('Error fetching files:', error);
      return res.status(500).json({ error: 'Failed to fetch files' });
    }
  }
  
  // Handle POST request to create files
  if (req.method === 'POST') {
    try {
      const { files, patientId, companyId } = req.body;
      
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'Files data is required and must be an array' });
      }
      
      if (!patientId && !companyId) {
        return res.status(400).json({ error: 'Either patientId or companyId is required' });
      }
      
      console.log('Creating files for entity:', patientId || companyId);
      console.log('Files data:', files);
      
      // Create the files in the database
      const createdFiles = await Promise.all(
        files.map(async (file) => {
          return await prisma.file.create({
            data: {
              url: file.url,
              type: file.type || 'IMAGE',
              ...(patientId ? { patientId: patientId } : {}),
              ...(companyId ? { companyId: companyId } : {})
            }
          });
        })
      );
      
      console.log(`Successfully created ${createdFiles.length} files`);
      return res.status(201).json(createdFiles);
    } catch (error) {
      console.error('Error creating files:', error);
      return res.status(500).json({ error: 'Failed to create files' });
    }
  }
  
  // Handle DELETE request to remove files
  if (req.method === 'DELETE') {
    try {
      const { fileId, fileUrl, patientId, companyId } = req.body;
      
      console.log('DELETE request with params:', { fileId, fileUrl, patientId, companyId });
      
      if (fileId) {
        // Delete a specific file by ID
        try {
          // First, get the file info to find the file path
          const fileRecord = await prisma.file.findUnique({
            where: { id: fileId }
          });
          
          if (!fileRecord) {
            return res.status(404).json({ error: 'File not found' });
          }
          
          // Delete file from filesystem if filePath exists
          if (fileRecord.filePath) {
            await deleteFileFromDisk(fileRecord.filePath);
          }
          
          // Delete from database
          await prisma.file.delete({
            where: { id: fileId }
          });
          
          return res.status(200).json({ message: 'File deleted successfully' });
        } catch (deleteError) {
          console.error('Error deleting file by ID:', deleteError);
          return res.status(404).json({ error: 'File not found or could not be deleted' });
        }
      } else if (fileUrl) {
        // Delete a specific file by URL
        try {
          // First, get the file info to find the file path
          const fileRecords = await prisma.file.findMany({
            where: { url: fileUrl }
          });
          
          if (fileRecords.length === 0) {
            return res.status(404).json({ error: 'No file found with the provided URL' });
          }
          
          // Delete files from filesystem
          for (const fileRecord of fileRecords) {
            if (fileRecord.filePath) {
              await deleteFileFromDisk(fileRecord.filePath);
            }
          }
          
          // Delete from database
          const result = await prisma.file.deleteMany({
            where: { url: fileUrl }
          });
          
          return res.status(200).json({ 
            message: 'File deleted successfully', 
            count: result.count 
          });
        } catch (deleteError) {
          console.error('Error deleting file by URL:', deleteError);
          return res.status(500).json({ error: 'Failed to delete file by URL' });
        }
      } else if (patientId) {
        // Delete all files for a patient
        try {
          // First, get all file records to find file paths
          const fileRecords = await prisma.file.findMany({
            where: { patientId: patientId }
          });
          
          // Delete files from filesystem
          for (const fileRecord of fileRecords) {
            if (fileRecord.filePath) {
              await deleteFileFromDisk(fileRecord.filePath);
            }
          }
          
          // Delete from database
          const result = await prisma.file.deleteMany({
            where: { patientId: patientId }
          });
          
          return res.status(200).json({ 
            message: 'All files for patient deleted successfully',
            count: result.count
          });
        } catch (deleteError) {
          console.error('Error deleting files for patient:', deleteError);
          return res.status(500).json({ error: 'Failed to delete files for patient' });
        }
      } else if (companyId) {
        // Delete all files for a company
        try {
          // First, get all file records to find file paths
          const fileRecords = await prisma.file.findMany({
            where: { companyId: companyId }
          });
          
          // Delete files from filesystem
          for (const fileRecord of fileRecords) {
            if (fileRecord.filePath) {
              await deleteFileFromDisk(fileRecord.filePath);
            }
          }
          
          // Delete from database
          const result = await prisma.file.deleteMany({
            where: { companyId: companyId }
          });
          
          return res.status(200).json({ 
            message: 'All files for company deleted successfully',
            count: result.count
          });
        } catch (deleteError) {
          console.error('Error deleting files for company:', deleteError);
          return res.status(500).json({ error: 'Failed to delete files for company' });
        }
      } else {
        return res.status(400).json({ error: 'Either fileId, fileUrl, patientId, or companyId is required' });
      }
    } catch (error) {
      console.error('Error deleting files:', error);
      return res.status(500).json({ error: 'Failed to delete files' });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ error: 'Method not allowed' });
}
