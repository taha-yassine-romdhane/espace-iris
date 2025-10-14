import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import prisma from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ChevronRight, FileText, ArrowLeft, Save, Printer } from 'lucide-react';
import { Diagnostic, DiagnosticStatus, MedicalDevice, Patient } from '@prisma/client';
import { DiagnosticResultsForm } from './components/DiagnosticResultsForm';

interface DiagnosticResultsProps {
  diagnostic: Diagnostic & {
    patient: Patient;
    medicalDevice: MedicalDevice;
  };
  diagnosticResult?: {
    id: string;
    iah: number | null;
    idValue: number | null;
    remarque: string | null;
    status: string;
  } | null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };

  try {
    const diagnostic = await prisma.diagnostic.findUnique({
      where: { id },
      include: {
        patient: true,
        medicalDevice: true,
      },
    });

    if (!diagnostic) {
      return {
        notFound: true,
      };
    }
    
    // Fetch or create diagnostic result
    let diagnosticResult = await prisma.diagnosticResult.findFirst({
      where: { diagnosticId: id },
    });
    
    if (!diagnosticResult) {
      // Create a new diagnostic result if none exists
      diagnosticResult = await prisma.diagnosticResult.create({
        data: {
          diagnosticId: id,
          status: 'PENDING',
        },
      });
    }

    return {
      props: {
        diagnostic: JSON.parse(JSON.stringify(diagnostic)),
        diagnosticResult: diagnosticResult ? JSON.parse(JSON.stringify(diagnosticResult)) : null,
      },
    };
  } catch (error) {
    console.error('Error fetching diagnostic:', error);
    return {
      notFound: true,
    };
  }
};

export default function DiagnosticResultsPage({ diagnostic, diagnosticResult }: DiagnosticResultsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if results are completed
  const isResultsCompleted = diagnosticResult?.status === 'COMPLETED' || diagnostic.status === 'COMPLETED';

  const handleStatusChange = async (newStatus: DiagnosticStatus) => {
    if (isResultsCompleted) return; // Prevent status change if results are completed
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/diagnostics/${diagnostic.id}/update-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        router.reload();
      } else {
        console.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsLoading(false);
    }
  };


  return (
      <div className="container mx-auto py-6 space-y-6 ">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6 ">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/roles/admin/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href="/roles/admin/diagnostics">Diagnostics</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/roles/admin/diagnostics/${diagnostic.id}`}>
                Détails
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink>Résultats</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex justify-between items-center ">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">Résultats du diagnostic</h1>
          </div>
          <div className="flex gap-2">
       
            {diagnostic.status !== 'COMPLETED' && (
              <Button
                onClick={() => handleStatusChange('COMPLETED')}
                disabled={isLoading || isResultsCompleted}
                className="flex items-center gap-1"
              >
                <Save className="h-4 w-4" />
                {isResultsCompleted ? 'Résultats traités' : 'Marquer comme terminé'}
              </Button>
            )}
          </div>
        </div>

        {/* Diagnostic Info Card */}
        <Card>
          <CardHeader className="bg-muted/50">
            <div className="flex justify-between items-center">
              <CardTitle>Informations du diagnostic</CardTitle>
              <Badge variant={
                diagnostic.status === 'COMPLETED' ? 'success' : 
                diagnostic.status === 'CANCELLED' ? 'destructive' : 
                'default'
              }>
                {diagnostic.status === 'COMPLETED' ? 'Terminé' : 
                 diagnostic.status === 'CANCELLED' ? 'Annulé' : 
                 'En attente'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Patient</h3>
                <p className="font-medium">{diagnostic.patient.firstName} {diagnostic.patient.lastName}</p>
                <p className="text-sm text-gray-500">{diagnostic.patient.telephone}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Appareil</h3>
                <p className="font-medium">{diagnostic.medicalDevice.name}</p>
                <p className="text-sm text-gray-500">{diagnostic.medicalDevice.brand} {diagnostic.medicalDevice.model}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Date du diagnostic</h3>
                <p>{format(new Date(diagnostic.diagnosticDate), 'dd/MM/yyyy')}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Suivi requis</h3>
                <p>{diagnostic.followUpRequired ? 'Oui' : 'Non'}</p>
                {diagnostic.followUpRequired && diagnostic.followUpDate && (
                  <p className="text-sm text-gray-500">
                    Date de suivi: {format(new Date(diagnostic.followUpDate), 'dd/MM/yyyy')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Form */}
        <DiagnosticResultsForm
          diagnosticResult={diagnosticResult || null}
          status={diagnostic.status}
          diagnosticId={diagnostic.id}
          resultDueDate={diagnostic.followUpDate}
        />
      </div>
  );
}
