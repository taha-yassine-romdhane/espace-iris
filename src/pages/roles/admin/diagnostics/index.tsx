import React from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, Stethoscope } from 'lucide-react';
import DiagnosticsExcelTable from './DiagnosticsExcelTable';

export default function DiagnosticsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/roles/admin/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink>Polygraphies</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Stethoscope className="h-6 w-6" />
          Polygraphies
        </h1>
      </div>

      {/* Diagnostics Excel-like Table Card */}
      <Card>
        <CardHeader className="bg-muted/50">
          <CardTitle>Liste des Polygraphies</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <DiagnosticsExcelTable />
        </CardContent>
      </Card>
    </div>
  );
}
