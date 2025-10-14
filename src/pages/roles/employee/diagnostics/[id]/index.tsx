import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator, 
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Edit, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DiagnosticHeader } from "./components/DiagnosticHeader";
import { PatientInformation } from "./components/PatientInformation";
import { DeviceInformation } from "./components/DeviceInformation";
import { DiagnosticResultsForm } from "./components/DiagnosticResultsForm";
import { DiagnosticNotes } from "./components/DiagnosticNotes";
import { DiagnosticTasks } from "./components/DiagnosticTasks";
import { DiagnosticDocuments } from "./components/DiagnosticDocuments";
import EmployeeLayout from "./../../EmployeeLayout";

export default function DiagnosticDetailsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { id } = router.query;

  // State to manage the diagnostic data
  const [localDiagnostic, setLocalDiagnostic] = useState<any>(null);

  // Fetch diagnostic details
  const { data: diagnostic, isLoading, error, refetch } = useQuery({
    queryKey: ["diagnostic", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/diagnostics/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch diagnostic details");
      }
      const data = await response.json();
      console.log("Diagnostic data:", data);
      console.log("Parameter values:", data.parameterValues);
      return data;
    },
    enabled: !!id,
  });

  // Sync the fetched diagnostic data with our local state
  useEffect(() => {
    if (diagnostic) {
      setLocalDiagnostic(diagnostic);
    }
  }, [diagnostic]);

  // Handle notes update
  const handleNotesUpdated = (newNotes: string) => {
    if (localDiagnostic) {
      setLocalDiagnostic({
        ...localDiagnostic,
        notes: newNotes
      });

      toast({
        title: "Notes mises à jour",
        description: "Les notes du diagnostic ont été mises à jour avec succès",
        variant: "default",
      });
    }
  };

  // Ensure patient data is properly formatted
  const formattedPatient = localDiagnostic?.patient ? {
    ...localDiagnostic.patient,
    dateOfBirth: localDiagnostic.patient.dateOfBirth ? new Date(localDiagnostic.patient.dateOfBirth) : null
  } : null;

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mb-4"></div>
          <p className="text-gray-600">Chargement des détails du diagnostic...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow p-8">
          <div className="flex items-center text-red-600 mb-4">
            <AlertCircle className="h-6 w-6 mr-2" />
            <h2 className="text-xl font-semibold">Erreur de chargement</h2>
          </div>
          <p className="text-gray-700 mb-4">
            Une erreur s&apos;est produite lors du chargement des détails du diagnostic.
          </p>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    );
  }

  // Handle not found
  if (!localDiagnostic) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow p-8">
          <h2 className="text-xl font-semibold mb-4">Diagnostic non trouvé</h2>
          <p className="text-gray-700 mb-4">
            Le diagnostic que vous recherchez n&apos;existe pas ou a été supprimé.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/roles/admin/dashboard")}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/roles/employee/dashboard">Tableau de bord</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/roles/employee/diagnostics">Diagnostics</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Détails</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div className="flex space-x-3">
            {localDiagnostic.status === "PENDING" && (
              <Button
                className="bg-green-700 hover:bg-green-600 text-white flex items-center"
                onClick={() => router.push(`/roles/employee/diagnostics/${id}/results`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Saisir les résultats
              </Button>
            )}
          </div>
        </div>

        {/* Diagnostic Header */}
        <DiagnosticHeader diagnostic={localDiagnostic} />

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="border-b border-gray-200 w-full rounded-none px-6 bg-gray-50">
              <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
              <TabsTrigger value="parameters">Paramètres et Résultats</TabsTrigger>
              <TabsTrigger value="tasks">Tâches</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PatientInformation patient={formattedPatient} />
                <DeviceInformation device={localDiagnostic.medicalDevice} />
              </div>
              <DiagnosticNotes
                notes={localDiagnostic?.notes || null}
                diagnosticId={id as string}
                onNotesUpdated={handleNotesUpdated}
              />
            </TabsContent>

            <TabsContent value="parameters" className="p-6">
              <DiagnosticResultsForm
                diagnosticResult={localDiagnostic.result || null}
                status={localDiagnostic.status}
                diagnosticId={id as string}
                resultDueDate={localDiagnostic.resultDueDate ? new Date(localDiagnostic.resultDueDate) : null}
              />
            </TabsContent>

            <TabsContent value="tasks" className="p-6">
              <DiagnosticTasks
                diagnosticId={id as string}
                resultDueDate={localDiagnostic.resultDueDate}
                patientId={localDiagnostic.patient?.id}
              />
            </TabsContent>

            <TabsContent value="documents" className="p-6">
              <DiagnosticDocuments
                documents={localDiagnostic.documents || []}
                diagnosticId={id as string}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
DiagnosticDetailsPage.getLayout = function getLayout(page: React.ReactElement) {
  return <EmployeeLayout>{page}</EmployeeLayout>;
};

