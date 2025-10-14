import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmployeeLayout from './EmployeeLayout';

export default function Custom404() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="bg-green-50 p-6 rounded-full mb-6">
        <FileQuestion className="h-16 w-16 text-green-600" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Page introuvable</h1>
      <p className="text-gray-600 mb-8 max-w-md">
        La page que vous recherchez n&apos;existe pas ou n&apos;est pas encore disponible dans l&apos;espace employé.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={() => router.back()} 
          variant="outline" 
          className="border-green-200 text-green-700 hover:bg-green-50"
        >
          Retour
        </Button>
        <Link href="/roles/employee" passHref>
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            Retour au tableau de bord
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Use the employee layout for this 404 page
Custom404.getLayout = function getLayout(page: React.ReactElement) {
  return <EmployeeLayout>{page}</EmployeeLayout>;
};
