import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SaleStepperDialog } from "./components/SaleStepperDialog";
import { DiagnosticStepperDialog } from "./components/DiagnosticStepperDialog";
import { RentStepperDialog } from "./components/RentStepperDialog";
import { EmployeeRdvStepperDialog } from "./components/EmployeeRdvStepperDialog";
import { Building2, ShoppingCart, Stethoscope, Calendar } from "lucide-react";
import { useRouter } from "next/router";
import EmployeeLayout from '../EmployeeLayout';

// Import table components
import { AppointmentsTable } from "./components/tables/AppointmentsTable";
import { DiagnosticTable } from "./components/tables/DiagnosticTable";
import { RentalTable } from "./components/tables/RentalTable";
import { SalesTable } from "./components/tables/SalesTable";
import { TabSwitcher } from "./components/TabSwitcher";

export default function DashboardPage() {
  const [selectedAction, setSelectedAction] = useState<"location" | "vente" | "diagnostique" | "rdv" | null>(null);
  const [activeTab, setActiveTab] = useState<"appointments" | "diagnostics" | "rentals" | "sales">("appointments");
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-8 text-green-900">Tableau de Bord</h1>
        
        {/* Action Buttons Row */}
        <div className="grid grid-cols-1 tablet:grid-cols-2 tablet-lg:grid-cols-4 gap-4 mb-8">
        <Button 
            className="w-full bg-green-700 hover:bg-green-600 text-white flex items-center justify-start gap-2"
            onClick={() => setSelectedAction("rdv")}
          >
            <Calendar className="h-5 w-5" />
            <span>Créer un Rendez-vous</span>
          </Button>
          
          <Button 
            className="w-full bg-green-700 hover:bg-green-600 text-white flex items-center justify-start gap-2"
            onClick={() => setSelectedAction("diagnostique")}
          >
            <Stethoscope className="h-5 w-5" />
            <span>Commencer un Diagnostic</span>
          </Button>
          
          <Button 
            className="w-full bg-green-700 hover:bg-green-600 text-white flex items-center justify-start gap-2"
            onClick={() => setSelectedAction("vente")}
          >
            <ShoppingCart className="h-5 w-5" />
            <span>Commencer une Vente</span>
          </Button>
          
          <Button 
            className="w-full bg-green-700 hover:bg-green-600 text-white flex items-center justify-start gap-2"
            onClick={() => setSelectedAction("location")}
          >
            <Building2 className="h-5 w-5" />
            <span>Commencer une Location</span>
          </Button>
          
        
        </div>

        {/* Tab Switcher */}
        <TabSwitcher activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as any)} />
        
        {/* Tables */}
        {activeTab === "appointments" && (
          <AppointmentsTable />
        )}

        {activeTab === "diagnostics" && (
          <DiagnosticTable 
            onViewDetails={(id) => router.push(`/roles/employee/diagnostics/${id}`)} 
            onEnterResults={(id) => router.push(`/roles/employee/diagnostics/${id}/results`)}
          />
        )}
        
        {activeTab === "rentals" && (
          <RentalTable 
            onViewDetails={(id) => router.push(`/roles/employee/rentals/${id}`)}
            onEdit={(id) => router.push(`/roles/employee/rentals/${id}/edit`)}
          />
        )}
        
        {activeTab === "sales" && (
          <SalesTable 
            onViewDetails={(id) => router.push(`/roles/employee/sales/${id}`)}
            onEdit={(id) => router.push(`/roles/employee/sales/${id}/edit`)}
          />
        )}

        {/* Stepper Dialogs */}
        {selectedAction === "vente" && (
          <SaleStepperDialog
            isOpen={true}
            onClose={() => setSelectedAction(null)}
            action={selectedAction}
          />
        )}

        {selectedAction === "diagnostique" && (
          <DiagnosticStepperDialog
            isOpen={true}
            onClose={() => setSelectedAction(null)}
          />
        )}
        
        
        {selectedAction === "location" && (
          <RentStepperDialog
            isOpen={true}
            onClose={() => setSelectedAction(null)}
          />
        )}
        
        {selectedAction === "rdv" && (
          <EmployeeRdvStepperDialog
            isOpen={true}
            onClose={() => setSelectedAction(null)}
          />
        )}
      </div>
    </div>
  );
}
DashboardPage.getLayout = function getLayout(page: React.ReactElement) {
  return <EmployeeLayout>{page}</EmployeeLayout>;
};