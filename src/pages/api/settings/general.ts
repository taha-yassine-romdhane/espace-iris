import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET request - retrieve settings
  if (req.method === 'GET') {
    try {
      // Get the first settings record or create one if it doesn't exist
      let settings = await prisma.appSettings.findFirst();
      
      if (!settings) {
        // Create default settings if none exist
        settings = await prisma.appSettings.create({
          data: {
            companyName: "Iris Santé",
            companyAddress: "123 Rue de la Santé, Tunis, Tunisie",
            companyPhone: "+216 71 123 456",
            companyEmail: "contact@iris-sante.tn",
            companyLogo: "/logo.png",
          }
        });
      }
      
      return res.status(200).json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }
  
  // PUT request - update settings
  if (req.method === 'PUT') {
    try {
      const { companyName, companyAddress, companyPhone, companyEmail, companyLogo } = req.body;
      
      // Find the first settings record
      const existingSettings = await prisma.appSettings.findFirst();
      
      let settings;
      
      if (existingSettings) {
        // Update existing settings
        settings = await prisma.appSettings.update({
          where: { id: existingSettings.id },
          data: {
            companyName,
            companyAddress,
            companyPhone,
            companyEmail,
            companyLogo,
          }
        });
      } else {
        // Create new settings if none exist
        settings = await prisma.appSettings.create({
          data: {
            companyName,
            companyAddress,
            companyPhone,
            companyEmail,
            companyLogo,
          }
        });
      }
      
      return res.status(200).json(settings);
    } catch (error) {
      console.error('Error updating settings:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  }
  
  // Return 405 for other methods
  return res.status(405).json({ error: 'Method not allowed' });
}
