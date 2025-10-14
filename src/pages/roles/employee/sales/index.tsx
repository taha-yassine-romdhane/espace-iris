import React, { useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Head from "next/head";
import { 
  ShoppingCart, 
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalesTable } from "../dashboard/components/tables/SalesTable";
import EmployeeLayout from '../EmployeeLayout';

export default function EmployeeSalesPage() {
  const router = useRouter();
  const { data: session } = useSession();


  // Handle view sale details
  const handleViewDetails = (saleId: string) => {
    router.push(`/roles/employee/sales/${saleId}`);
  };

  // Handle edit sale
  const handleEditSale = (saleId: string) => {
    router.push(`/roles/employee/sales/${saleId}/edit`);
  };



  return (
    <>
      <Head>
        <title>Mes Ventes - Espace Iris </title>
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
              
            </div>
          </div>
        </div>

        {/* Container for content */}
        <div className="w-full px-4 -mt-6">

          {/* Quick Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtres rapides:</span>
              <Button variant="outline" size="sm" className="text-xs">
                Aujourd'hui
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Cette semaine
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Ce mois
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                En attente
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Complétées
              </Button>
            </div>
          </div>

          {/* Sales Table */}
          <div className="mb-8 w-full">
            <div className="w-full overflow-hidden">
              <SalesTable 
                onViewDetails={handleViewDetails}
                onEdit={handleEditSale}
              />
            </div>
          </div>
        </div>
      </div>

    </>
  );
}

EmployeeSalesPage.getLayout = function getLayout(page: React.ReactElement) {
  return <EmployeeLayout>{page}</EmployeeLayout>;
};