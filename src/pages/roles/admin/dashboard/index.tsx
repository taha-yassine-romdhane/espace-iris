import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SaleStepperDialog } from "./components/SaleStepperDialog";
import { DiagnosticStepperDialog } from "./components/DiagnosticStepperDialog";
import { RentStepperDialog } from "./components/RentStepperDialog";
import { RdvStepperDialog } from "./components/RdvStepperDialog";
import { Building2, ShoppingCart, Stethoscope, Calendar } from "lucide-react";
import { useRouter } from "next/router";
import AdminLayout from "../AdminLayout";

// Import table components
import { AppointmentsTable } from "./components/tables/AppointmentsTable";
import { DiagnosticTable } from "./components/tables/DiagnosticTable";
import { SalesTable } from "./components/tables/SalesTable";
import { RentalTable } from "./components/tables/RentalTable";
import { TabSwitcher } from "./components/TabSwitcher";

function DashboardPage() {
  const [selectedAction, setSelectedAction] = useState<"rdv" | "diagnostique" | "vente" | "location" | null>(null);
  const [activeTab, setActiveTab] = useState<"appointments" | "diagnostics" | "sales" | "rentals">("appointments");
  const router = useRouter();


  return (
    <div className="container mx-auto py-6 px-4">
        <h1 className="text-3xl font-bold mb-8 text-blue-900">Tableau de Bord</h1>
        
        {/* Action Buttons Row */}
        <div className="space-y-4 mb-8">
          {/* Primary Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              className="w-full bg-blue-900 hover:bg-blue-700 text-white flex items-center justify-start gap-2"
              onClick={() => setSelectedAction("rdv")}
            >
              <Calendar className="h-5 w-5" />
              <span>Nouveau Rendez-vous</span>
            </Button>
            
            <Button 
              className="w-full bg-blue-900 hover:bg-blue-700 text-white flex items-center justify-start gap-2"
              onClick={() => setSelectedAction("diagnostique")}
            >
              <Stethoscope className="h-5 w-5" />
              <span>Commencer un Diagnostic</span>
            </Button>
            
            <Button 
              className="w-full bg-blue-900 hover:bg-blue-700 text-white flex items-center justify-start gap-2"
              onClick={() => setSelectedAction("vente")}
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Commencer une Vente</span>
            </Button>
            
            <Button 
              className="w-full bg-blue-900 hover:bg-blue-700 text-white flex items-center justify-start gap-2"
              onClick={() => setSelectedAction("location")}
            >
              <Building2 className="h-5 w-5" />
              <span>Location Détaillée</span>
            </Button>
          </div>
        </div>

        {/* Tab Switcher */}
        <TabSwitcher activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as any)} />
        
        {/* Tables */}
        {activeTab === "appointments" && (
          <AppointmentsTable 
            onViewDetails={(id) => router.push(`/roles/admin/appointments/${id}`)}
          />
        )}
        
        {activeTab === "diagnostics" && (
          <DiagnosticTable 
            onViewDetails={(id) => router.push(`/roles/admin/diagnostics/${id}`)} 
            onEnterResults={(id) => router.push(`/roles/admin/diagnostics/${id}/results`)}
          />
        )}
        
        {activeTab === "sales" && (
          <SalesTable 
            onViewDetails={(id) => router.push(`/roles/admin/sales/${id}`)}
            onEdit={(id) => router.push(`/roles/admin/sales/${id}/edit`)}
          />
        )}
        
        {activeTab === "rentals" && (
          <RentalTable 
            onViewDetails={(id) => router.push(`/roles/admin/rentals/${id}`)}
            onEdit={(id) => router.push(`/roles/admin/rentals/${id}/edit`)}
          />
        )}

        {/* Stepper Dialogs */}
        {selectedAction === "rdv" && (
          <RdvStepperDialog
            isOpen={true}
            onClose={() => setSelectedAction(null)}
          />
        )}

        {selectedAction === "diagnostique" && (
          <DiagnosticStepperDialog
            isOpen={true}
            onClose={() => setSelectedAction(null)}
          />
        )}

        {selectedAction === "vente" && (
          <SaleStepperDialog
            isOpen={true}
            onClose={() => setSelectedAction(null)}
            action={selectedAction}
          />
        )}
        
        {selectedAction === "location" && (
          <RentStepperDialog
            isOpen={true}
            onClose={() => setSelectedAction(null)}
          />
        )}
    </div>
  );
}

// Add layout wrapper
DashboardPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AdminLayout>{page}</AdminLayout>;
};

export default DashboardPage;