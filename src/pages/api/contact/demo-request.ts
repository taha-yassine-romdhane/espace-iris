import { NextApiRequest, NextApiResponse } from 'next';

interface DemoRequestData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  position?: string;
  establishmentType: string;
  message?: string;
  preferredTime?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const data: DemoRequestData = req.body;

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'company', 'establishmentType'];
    const missingFields = requiredFields.filter(field => !data[field as keyof DemoRequestData]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Missing required fields',
        missingFields
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return res.status(400).json({
        message: 'Invalid email format'
      });
    }

    // Here you would typically:
    // 1. Save to database
    // 2. Send notification email to sales team
    // 3. Send confirmation email to user
    // 4. Add to CRM system
    
    // For now, we'll just log the request
    console.log('Demo request received:', {
      ...data,
      timestamp: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return res.status(200).json({
      message: 'Demo request submitted successfully',
      id: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

  } catch (error) {
    console.error('Error processing demo request:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}