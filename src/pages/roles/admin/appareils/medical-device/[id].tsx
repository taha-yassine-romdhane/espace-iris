import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import prisma from '@/lib/db';
import { MedicalDevice, MedicalDeviceParametre, Patient, Company, Rental, Diagnostic, DiagnosticResult, RepairLog, RepairLocation, Technician } from '@prisma/client';
import { DeviceHeader } from '@/components/medicalDevice/DeviceHeader';
import { DeviceParameters } from '@/components/medicalDevice/DeviceParameters';
import { DeviceRelations } from '@/components/medicalDevice/DeviceRelations';
import { DeviceMaintenanceHistory } from '@/components/medicalDevice/DeviceMaintenanceHistory';
import { DiagnosticDeviceDetails } from '@/components/medicalDevice/DiagnosticDeviceDetails';
import { DeviceActions } from '@/components/appareils/DeviceActions';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSession } from 'next-auth/react';

interface MedicalDeviceDetailProps {
  device: MedicalDevice & {
    Patient?: Patient | null;
    Company?: Company | null;
    Rental: Rental[];
    Diagnostic: (Diagnostic & {
      result?: DiagnosticResult | null;
      patient: { firstName: string; lastName: string };
    })[];
    deviceParameters: MedicalDeviceParametre[];
    RepairLog: (RepairLog & {
      location: { name: string };
      technician?: { user: { firstName: string; lastName: string } } | null;
    })[];
    stockLocation?: { name: string } | null;
  };
  stockLocations: Array<{ id: string; name: string }>;
}

export default function MedicalDeviceDetail({ device, stockLocations }: MedicalDeviceDetailProps) {
  const router = useRouter();
  
  if (router.isFallback) {
    return <div className="container mx-auto p-4">Chargement...</div>;
  }

  const isDiagnosticDevice = device.type.toUpperCase().includes('DIAGNOSTIC');

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button 
            variant="ghost" 
            size="sm"
            className="mb-2 text-muted-foreground"
            onClick={() => router.back()}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Retour à la liste
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{device.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <DeviceHeader device={device} />
          
          <Tabs defaultValue="details" className="w-full">
            <TabsList>
              <TabsTrigger value="details">Détails & Paramètres</TabsTrigger>
              {isDiagnosticDevice && <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>}
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-6">
              {device.deviceParameters && device.deviceParameters.length > 0 ? (
                <DeviceParameters device={device} parameters={device.deviceParameters} />
              ) : (
                <Card className="mt-6"><CardHeader><CardTitle>Aucun paramètre</CardTitle><CardDescription>Cet appareil n'a pas de paramètres spécifiques enregistrés.</CardDescription></CardHeader></Card>
              )}
            </TabsContent>
            {isDiagnosticDevice && (
              <TabsContent value="diagnostics" className="mt-6">
                <DiagnosticDeviceDetails device={device} diagnostics={device.Diagnostic} />
              </TabsContent>
            )}
            <TabsContent value="maintenance" className="mt-6">
              <DeviceMaintenanceHistory device={device} repairLogs={device.RepairLog} />
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="space-y-6">
          <DeviceActions device={device} stockLocations={stockLocations} />
          <DeviceRelations device={device} />
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  if (!session || session.user.role !== 'ADMIN') {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  const { id } = context.params as { id: string };

  try {
    const devicePromise = prisma.medicalDevice.findUnique({
      where: { id },
      include: {
        stockLocation: { select: { name: true } },
        deviceParameters: { orderBy: { updatedAt: 'desc' } },
        Rental: {
          orderBy: { startDate: 'desc' },
          include: {
            patient: { select: { firstName: true, lastName: true, patientCode: true } }
          }
        },
        Diagnostic: {
          orderBy: { diagnosticDate: 'desc' },
          include: {
            result: true,
            patient: { select: { id: true, firstName: true, lastName: true } },
          },
          take: 5,
        },
        RepairLog: {
          orderBy: { repairDate: 'desc' },
          include: {
            location: { select: { name: true } },
            technician: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    });

    const stockLocationsPromise = prisma.stockLocation.findMany();

    const device = await devicePromise;

    if (!device) {
      return { notFound: true };
    }

    const stockLocations = await stockLocationsPromise;

    return {
      props: {
        device: JSON.parse(JSON.stringify(device)),
        stockLocations: JSON.parse(JSON.stringify(stockLocations)),
      },
    };
  } catch (error) {
    console.error('Error fetching medical device:', error);
    return {
      notFound: true,
    };
  }
};
