import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/db';
import { SearchResult, SearchResultType } from '@/components/search/GlobalSearch';
import { Patient, Product, Diagnostic, Sale, Rental, User, MedicalDevice, Company } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if user is authenticated
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Vous devez être connecté pour effectuer cette action' });
  }

  // Get search query
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.length < 2) {
    return res.status(400).json({ 
      error: 'Une requête de recherche valide est requise',
      results: [] 
    });
  }

  try {
    const searchQuery = q.toLowerCase();
    const results: SearchResult[] = [];

    // Search patients
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { firstName: { contains: searchQuery, mode: 'insensitive' } },
          { lastName: { contains: searchQuery, mode: 'insensitive' } },
          { telephone: { contains: searchQuery, mode: 'insensitive' } },
          { telephoneTwo: { contains: searchQuery, mode: 'insensitive' } },
          { cnamId: { contains: searchQuery, mode: 'insensitive' } },
          { governorate: { contains: searchQuery, mode: 'insensitive' } },
          { delegation: { contains: searchQuery, mode: 'insensitive' } },
          { detailedAddress: { contains: searchQuery, mode: 'insensitive' } },
        ]
      },
      take: 5,
    });

    patients.forEach((patient: Patient) => {
      results.push({
        id: patient.id,
        title: `${patient.firstName} ${patient.lastName}`,
        subtitle: patient.telephone || patient.telephoneTwo || 'Patient',
        type: 'patient',
        url: `/roles/admin/renseignement/patient/${patient.id}`
      });
    });

     // Search company
     const companies = await prisma.company.findMany({
      where: {
        OR: [
          { companyName: { contains: searchQuery, mode: 'insensitive' } },
          { governorate: { contains: searchQuery, mode: 'insensitive' } },
          { delegation: { contains: searchQuery, mode: 'insensitive' } },
          { detailedAddress: { contains: searchQuery, mode: 'insensitive' } },
          { telephone: { contains: searchQuery, mode: 'insensitive' } },
        ]
      },
      take: 5,
    });

    companies.forEach((company: Company) => {
      results.push({
        id: company.id,
        title: company.companyName,
        subtitle: `${company.governorate || ''} ${company.delegation || ''} ${company.detailedAddress || ''}`.trim() || 'Company',
        type: 'company' as SearchResultType,
        url: `/roles/admin/renseignement/company/${company.id}`
      });
    });

    // Search products
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { model: { contains: searchQuery, mode: 'insensitive' } },
          { brand: { contains: searchQuery, mode: 'insensitive' } },
          { serialNumber: { contains: searchQuery, mode: 'insensitive' } },
        ]
      },
      take: 5,
    });

    products.forEach((product: Product) => {
      results.push({
        id: product.id,
        title: product.name,
        subtitle: product.brand || 'Produit',
        type: 'product' as SearchResultType,
        url: `/roles/admin/appareils/${product.id}`
      });
    });

    // Search diagnostics
    const diagnostics = await prisma.diagnostic.findMany({
      where: {
        OR: [
          { notes: { contains: searchQuery, mode: 'insensitive' } },
          { patient: { is: { firstName: { contains: searchQuery, mode: 'insensitive' } } } },
          { patient: { is: { lastName: { contains: searchQuery, mode: 'insensitive' } } } },
          { medicalDevice: { is: { name: { contains: searchQuery, mode: 'insensitive' } } } },
        ]
      },
      include: {
        patient: true,
        medicalDevice: true,
      },
      take: 5,
    });

    diagnostics.forEach((diagnostic) => {
      results.push({
        id: diagnostic.id,
        title: `Diagnostic: ${diagnostic.notes || 'Sans notes'}`,
        subtitle: (diagnostic.patient)
          ? `${diagnostic.patient.firstName || ''} ${diagnostic.patient.lastName || ''}`.trim() || 'Patient sans nom'
          : 'Diagnostic',
        type: 'diagnostic' as SearchResultType,
        url: `/roles/admin/diagnostics/${diagnostic.id}`
      });
    });

    // Search sales
    const sales = await prisma.sale.findMany({
      where: {
        OR: [
          { notes: { contains: searchQuery, mode: 'insensitive' } },
          { patient: { firstName: { contains: searchQuery, mode: 'insensitive' } } },
          { patient: { lastName: { contains: searchQuery, mode: 'insensitive' } } },
        ]
      },
      include: {
        patient: true,
      },
      take: 5,
    });

    sales.forEach((sale) => {
      results.push({
        id: sale.id,
        title: `Vente: ${sale.notes || sale.id}`,
        subtitle: sale.patient 
        ? `${sale.patient.firstName || ''} ${sale.patient.lastName || ''}`.trim() || 'Patient sans nom'
        : 'Vente',
        type: 'sale',
        url: `/roles/admin/sales/${sale.id}`
      });
    });
    // Search MedicalDevices
    const medicalDevices = await prisma.medicalDevice.findMany({
      where: {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { model: { contains: searchQuery, mode: 'insensitive' } },
          { brand: { contains: searchQuery, mode: 'insensitive' } },
          { serialNumber: { contains: searchQuery, mode: 'insensitive' } },
        ]
      },
      take: 5,
    });

    medicalDevices.forEach((medicalDevice: MedicalDevice) => {
      results.push({
        id: medicalDevice.id,
        title: medicalDevice.name,
        subtitle: medicalDevice.brand && medicalDevice.model 
          ? `${medicalDevice.brand} / ${medicalDevice.model}` 
          : medicalDevice.brand || medicalDevice.model || 'Appareil',
        type: 'medicalDevice' as SearchResultType,
        url: `/roles/admin/appareils/${medicalDevice.id}`
      });
    });

    // Search rentals
    const rentals = await prisma.rental.findMany({
      where: {
        OR: [
          { notes: { contains: searchQuery, mode: 'insensitive' } },
          { patient: { firstName: { contains: searchQuery, mode: 'insensitive' } } },
          { patient: { lastName: { contains: searchQuery, mode: 'insensitive' } } },
          { medicalDevice: { name: { contains: searchQuery, mode: 'insensitive' } } },
          { medicalDevice: { model: { contains: searchQuery, mode: 'insensitive' } } },
          { medicalDevice: { brand: { contains: searchQuery, mode: 'insensitive' } } },
          { medicalDevice: { serialNumber: { contains: searchQuery, mode: 'insensitive' } } },
        ]
      },
      include: {
        patient: true,
        medicalDevice: true,
      },
      take: 5,
    });

    rentals.forEach(
      (rental: Rental & { patient?: Patient; medicalDevice: MedicalDevice }) => {
        results.push({
          id: rental.id,
          title: `Location: ${rental.medicalDevice.name}`,
          subtitle: rental.patient
            ? `${rental.patient.firstName} ${rental.patient.lastName}`
            : 'Location',
          type: 'rental' as SearchResultType,
          url: `/roles/admin/rentals/${rental.id}`,
        });
      }
    );

    // Search users
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: searchQuery, mode: 'insensitive' } },
          { lastName: { contains: searchQuery, mode: 'insensitive' } },
          { email: { contains: searchQuery, mode: 'insensitive' } },
        ]
      },
      take: 5,
    });

    users.forEach((user: User) => {
      results.push({
        id: user.id,
        title: user.firstName || user.lastName || 'Utilisateur',
        subtitle: user.email || 'Utilisateur',
        type: 'user' as SearchResultType,
        url: `/roles/admin/users/${user.id}`
      });
    });

    // Return search results
    return res.status(200).json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ 
      error: 'Une erreur est survenue lors de la recherche',
      results: [] 
    });
  }
}
