import React from 'react';
import { GetServerSideProps } from 'next';
import prisma from '@/lib/db';
import { User, Doctor, Technician, Task, StockLocation, Patient, Company } from '@prisma/client';
import { UserHeader } from '@/components/user/UserHeader';
import { UserDetails } from '@/components/user/UserDetails';
import { UserRelations } from '@/components/user/UserRelations';
import { UserActions } from '@/components/user/UserActions';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ChevronRightIcon, UserIcon } from 'lucide-react';

interface UserDetailPageProps {
  user: User & {
    doctor: Doctor | null;
    technician: Technician[];
    tasks: Task[];
    stockLocation: StockLocation | null;
    assignedPatients: Patient[];
    assignedCompanies: Company[];
    technicianPatients: Patient[];
    technicianCompanies: Company[];
  };
}

export default function UserDetailPage({ user }: UserDetailPageProps) {
  if (!user) {
    return (
        <div className="container mx-auto py-6">
          <h1 className="text-2xl font-bold mb-4">Utilisateur non trouvé</h1>
          <p>L'utilisateur demandé n'existe pas ou a été supprimé.</p>
        </div>
    );
  }

  return (

      <div className="container mx-auto py-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/roles/admin">Tableau de bord</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/roles/admin/users">Utilisateurs</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRightIcon className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>
                <div className="flex items-center">
                  <UserIcon className="h-4 w-4 mr-1" />
                  {user.firstName} {user.lastName}
                </div>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid grid-cols-1 gap-6 mt-6">
          <UserHeader user={user} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <UserDetails user={user} />
              <UserRelations user={user} />
            </div>
            <div>
              <UserActions user={user} />
            </div>
          </div>
        </div>
      </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        doctor: true,
        technician: true,
        tasks: {
          orderBy: {
            endDate: 'asc',
          },
          take: 10, // Limit to 10 most recent tasks
        },
        stockLocation: true,
        assignedPatients: true,
        assignedCompanies: true,
        technicianPatients: true,
        technicianCompanies: true,
      },
    });

    if (!user) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        user: JSON.parse(JSON.stringify(user)),
      },
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return {
      notFound: true,
    };
  }
};
