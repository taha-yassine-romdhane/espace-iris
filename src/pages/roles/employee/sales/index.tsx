import React from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { ShoppingCart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SalesExcelTable from "../dashboard/components/tables/SalesExcelTable";
import EmployeeLayout from '../EmployeeLayout';

export default function EmployeeSalesPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Mes Ventes - Espace Elite</title>
        <meta name="description" content="Gestion de mes ventes" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <ShoppingCart className="h-8 w-8" />
                  Mes Ventes
                </h1>
                <p className="text-green-100 mt-2">
                  Gérez vos ventes et suivez vos performances
                </p>
              </div>
              <Button
                onClick={() => router.push('/roles/employee/sales/create')}
                className="bg-white text-green-700 hover:bg-green-50 font-semibold shadow-lg flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Nouvelle Vente
              </Button>
            </div>
          </div>
        </div>

        {/* Container for content */}
        <div className="w-full px-4 -mt-6">
          {/* Sales Table */}
          <div className="mb-8 w-full">
            <Card className="bg-white rounded-xl shadow-sm">
              <CardContent className="p-6">
                <SalesExcelTable />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

EmployeeSalesPage.getLayout = function getLayout(page: React.ReactElement) {
  return <EmployeeLayout>{page}</EmployeeLayout>;
};
