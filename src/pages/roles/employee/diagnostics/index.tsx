import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Stethoscope } from 'lucide-react';
import DiagnosticsExcelTable from '../dashboard/components/tables/DiagnosticsExcelTable';
import EmployeeLayout from '../EmployeeLayout';

export default function DiagnosticsPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Diagnostics - Espace Elite</title>
        <meta name="description" content="Gestion des diagnostics employé" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Stethoscope className="h-8 w-8" />
                  Mes Diagnostics
                </h1>
                <p className="text-green-100 mt-2">
                  Consultez et gérez vos diagnostics
                </p>
              </div>
              <Button
                onClick={() => router.push('/roles/employee/diagnostics/create')}
                className="bg-white text-green-700 hover:bg-green-50 font-semibold shadow-lg flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Nouveau Diagnostic
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="w-full px-4 -mt-6 space-y-6">
          {/* Diagnostics Table Card */}
          <Card className="bg-white rounded-xl shadow-sm">
            <CardContent className="p-6">
              <DiagnosticsExcelTable />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

DiagnosticsPage.getLayout = function getLayout(page: React.ReactElement) {
  return <EmployeeLayout>{page}</EmployeeLayout>;
};
