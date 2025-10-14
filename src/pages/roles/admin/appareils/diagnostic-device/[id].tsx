import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import prisma from '@/lib/db';
import { MedicalDevice, MedicalDeviceParametre, Patient, Company, Rental, Diagnostic, DiagnosticResult, RepairLog, RepairLocation, Technician } from '@prisma/client';
import { DeviceHeader } from '@/components/medicalDevice/DeviceHeader';
import { DeviceParameters } from '@/components/medicalDevice/DeviceParameters';
import { DeviceRelations } from '@/components/medicalDevice/DeviceRelations';
import { DeviceMaintenanceHistory } from '@/components/medicalDevice/DeviceMaintenanceHistory';
import { DiagnosticDeviceDetails } from '@/components/medicalDevice/DiagnosticDeviceDetails';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from 'lucide-react';

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
}

export default function DiagnosticDeviceDetail({ device }: MedicalDeviceDetailProps) {
  const router = useRouter();
  
  if (router.isFallback) {
    return <div className="container mx-auto p-4">Chargement...</div>;
  }

  const isDiagnosticDevice = device.type.toUpperCase().includes('DIAGNOSTIC');

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-4"
          onClick={() => router.back()}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <h1 className="text-3xl font-bold">Détails de l'appareil de diagnostic</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DeviceHeader device={device} />
          
          {device.deviceParameters && device.deviceParameters.length > 0 && (
            <DeviceParameters device={device} parameters={device.deviceParameters} />
          )}
          
          {isDiagnosticDevice && (
            <DiagnosticDeviceDetails device={device} diagnostics={device.Diagnostic} />
          )}
          
          <DeviceMaintenanceHistory device={device} repairLogs={device.RepairLog} />
        </div>
        
        <div className="space-y-6">
          <DeviceRelations device={device} />
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };

  try {
    const device = await prisma.medicalDevice.findUnique({
      where: { id },
      include: {
        Patient: true,
        Company: true,
        stockLocation: {
          select: {
            name: true,
          },
        },
        deviceParameters: {
          orderBy: {
            updatedAt: 'desc',
          },
        },
        Rental: {
          orderBy: {
            startDate: 'desc',
          },
          take: 5,
        },
        Diagnostic: {
          orderBy: {
            diagnosticDate: 'desc',
          },
          include: {
            result: true,
            patient: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        RepairLog: {
          orderBy: {
            repairDate: 'desc',
          },
          include: {
            location: {
              select: {
                name: true,
              },
            },
            technician: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!device) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        device: JSON.parse(JSON.stringify(device)),
      },
    };
  } catch (error) {
    console.error('Error fetching medical device:', error);
    return {
      notFound: true,
    };
  }
};
