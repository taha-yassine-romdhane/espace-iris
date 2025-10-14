import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (!session || session.user.role !== 'EMPLOYEE') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    try {
        // Fetch all diagnostic operations related to employee with related data
        const diagnostics = await prisma.diagnostic.findMany({
            where: {
                performedById: session.user.id,
            },
            include: {
                medicalDevice: {
                    select: {
                        id: true,
                        name: true,
                        brand: true,
                        model: true,
                        serialNumber: true,
                    },
                },
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        telephone: true,
                    },
                },
                performedBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                // Include diagnostic result with the new model
                result: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        
        // Transform the data to make it easier to use in the frontend
        const transformedDiagnostics = diagnostics.map(diagnostic => {
            // Format patient information
            const patientName = diagnostic.patient ? 
                `${diagnostic.patient.firstName} ${diagnostic.patient.lastName}`.trim() : 'N/A';
                
            // Format device information
            const deviceName = `${diagnostic.medicalDevice.name} ${diagnostic.medicalDevice.brand || ''} ${diagnostic.medicalDevice.model || ''}`.trim();
            
            // Format user information
            const performedBy = diagnostic.performedBy ? 
                `${diagnostic.performedBy.firstName} ${diagnostic.performedBy.lastName}`.trim() : 
                'N/A';

            return {
                id: diagnostic.id,
                deviceName,
                patientName,
                companyName: 'N/A', // Always N/A since we only use patients
                date: diagnostic.diagnosticDate,
                followUpDate: diagnostic.followUpDate,
                followUpRequired: diagnostic.followUpRequired,
                notes: diagnostic.notes,
                performedBy,
                result: diagnostic.result, // Include the full diagnostic result
                status: diagnostic.result?.status || 'PENDING',
            };
        });

        return res.status(200).json({ diagnostics: transformedDiagnostics });
    } catch (error) {
        console.error('Error fetching diagnostics:', error);
        return res.status(500).json({ error: 'Failed to fetch diagnostics' });
    }
}
