import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/db';
import formidable, { File as FormidableFile } from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import { generateCompanyCode } from '@/utils/idGenerator';

interface FileWithId {
  id: string;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.method === 'POST') {
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    const data = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, value?.[0]])
    );

    try {
      // Handle file upload if present
      let fileData = {};
      if (files.files) {
        const filesToUpload = Array.isArray(files.files) ? files.files : [files.files];
        console.log('Processing files:', filesToUpload.length, 'files');
        
        const uploadPromises = filesToUpload.map(async (file: FormidableFile) => {
          console.log('Processing file:', file.originalFilename);
          const bytes = await fs.readFile(file.filepath);
          const uploadDir = path.join(process.cwd(), 'public', 'uploads');
          await fs.mkdir(uploadDir, { recursive: true });
          const fileName = `${Date.now()}-${file.originalFilename}`;
          const filePath = path.join(uploadDir, fileName);
          await fs.writeFile(filePath, bytes);
          console.log('File saved to:', filePath);
          return {
            url: `/uploads/${fileName}`,
            type: 'IMAGE'
          };
        });

        const processedFiles = await Promise.all(uploadPromises);
        console.log('Uploaded files:', processedFiles);

        if (processedFiles.length > 0) {
          fileData = {
            files: {
              create: processedFiles
            }
          };
        }
      }

      // Generate company code
      const companyCode = await generateCompanyCode(prisma);

      const company = await prisma.company.create({
        data: {
          companyCode: companyCode,
          companyName: data.nomSociete || '',
          telephone: data.telephonePrincipale || '',
          telephoneSecondaire: data.telephoneSecondaire || '',
          governorate: data.governorate || '',
          delegation: data.delegation || '',
          detailedAddress: data.detailedAddress || '',
          taxId: data.matriculeFiscale || '',
          generalNote: data.generalNote || null,
          userId: session.user.id,
          technicianId: data.technicienResponsable || null,
          ...fileData
        },
        include: {
          technician: true,
          assignedTo: true,
          files: true
        }
      });

      res.status(200).json(company);
    } catch (error) {
      console.error('Error creating company:', error);
      res.status(500).json({ error: 'Failed to create company' });
    }
  } else if (req.method === 'PUT') {
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    const data = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, value?.[0]])
    );

    try {
      if (!data.id) {
        res.status(400).json({ error: 'Company ID is required' });
        return;
      }

      // Get existing files if this is an update
      let updateFileData = {};
      if (data.id) {
        const currentCompany = await prisma.company.findUnique({
          where: { id: data.id },
          include: { files: true }
        });

        if (files.files) {
          // If new files are uploaded, delete old ones and create new ones
          const filesToUpload = Array.isArray(files.files) ? files.files : [files.files];
          
          const uploadPromises = filesToUpload.map(async (file: FormidableFile) => {
            const bytes = await fs.readFile(file.filepath);
            const uploadDir = path.join(process.cwd(), 'public', 'uploads');
            await fs.mkdir(uploadDir, { recursive: true });
            const fileName = `${Date.now()}-${file.originalFilename}`;
            const filePath = path.join(uploadDir, fileName);
            await fs.writeFile(filePath, bytes);
            return {
              url: `/uploads/${fileName}`,
              type: 'IMAGE'
            };
          });

          const processedFiles = await Promise.all(uploadPromises);
          
          if (processedFiles.length > 0) {
            updateFileData = {
              files: {
                deleteMany: {},
                create: processedFiles
              }
            };
          }
        } else if (currentCompany && currentCompany.files && currentCompany.files.length > 0) {
          // If no new files but we have existing files, keep them
          updateFileData = {
            files: {
              connect: currentCompany.files.map(file => ({ id: file.id }))
            }
          };
        }
      }

      const company = await prisma.company.update({
        where: { id: data.id },
        data: {
          companyName: data.nomSociete || '',
          telephone: data.telephonePrincipale || '',
          telephoneSecondaire: data.telephoneSecondaire || null,
          governorate: data.governorate || '',
          delegation: data.delegation || '',
          detailedAddress: data.detailedAddress || '',
          taxId: data.matriculeFiscale || null,
          generalNote: data.generalNote || null,
          technicianId: data.technicienResponsable || null,
          ...updateFileData
        },
        include: {
          technician: true,
          assignedTo: true,
          files: true
        }
      });

      res.status(200).json(company);
    } catch (error) {
      console.error('Error updating company:', error);
      res.status(500).json({ error: 'Failed to update company' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'Company ID is required' });
        return;
      }

      // First delete associated files
      await prisma.file.deleteMany({
        where: {
          companyId: id
        }
      });

      // Then delete the company
      await prisma.company.delete({
        where: { id }
      });

      res.status(200).json({ message: 'Company deleted successfully' });
    } catch (error) {
      console.error('Error deleting company:', error);
      res.status(500).json({ error: 'Failed to delete company' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
