import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Building2, ShoppingCart, Stethoscope, Calendar, ClipboardCheck } from "lucide-react";
import { useRouter } from "next/router";
import AdminLayout from "../AdminLayout";

// Import new table components
import AppointmentsExcelTable from "../appointments/AppointmentsExcelTable";
import DiagnosticsExcelTable from "../diagnostics/DiagnosticsExcelTable";
import CNAMRappelsTable from "../sales/components/CNAMRappelsTable";
import RentalStatistics from "../location/components/RentalStatistics";
import AdminManualTasksTable from "../manual-tasks/index";
import { TabSwitcher } from "./components/TabSwitcher";
import { Card, CardContent } from "@/components/ui/card";

function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"appointments" | "diagnostics" | "sales" | "rentals" | "manual-tasks">("manual-tasks");
  const router = useRouter();


  return (
    <div className="container mx-auto py-6 px-4">
        <h1 className="text-3xl font-bold mb-8 text-blue-900">Tableau de Bord</h1>
        
        {/* Action Buttons Row - 5 per line, same color */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Button
              className="w-full bg-blue-900 hover:bg-blue-700 text-white flex items-center justify-start gap-2"
              onClick={() => router.push("/roles/admin/manual-tasks")}
            >
              <ClipboardCheck className="h-5 w-5" />
              <span>Tâches Manuelles</span>
            </Button>

            <Button
              className="w-full bg-blue-900 hover:bg-blue-700 text-white flex items-center justify-start gap-2"
              onClick={() => router.push("/roles/admin/appointments")}
            >
              <Calendar className="h-5 w-5" />
              <span>Nouveau Rendez-vous</span>
            </Button>

            <Button
              className="w-full bg-blue-900 hover:bg-blue-700 text-white flex items-center justify-start gap-2"
              onClick={() => router.push("/roles/admin/diagnostics")}
            >
              <Stethoscope className="h-5 w-5" />
              <span>Commencer un Diagnostic</span>
            </Button>

            <Button
              className="w-full bg-blue-900 hover:bg-blue-700 text-white flex items-center justify-start gap-2"
              onClick={() => router.push("/roles/admin/sales")}
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Commencer une Vente</span>
            </Button>

            <Button
              className="w-full bg-blue-900 hover:bg-blue-700 text-white flex items-center justify-start gap-2"
              onClick={() => router.push("/roles/admin/location")}
            >
              <Building2 className="h-5 w-5" />
              <span>Gestion des Locations</span>
            </Button>
          </div>
        </div>

        {/* Tab Switcher */}
        <TabSwitcher activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as any)} />

        {/* Tables */}
        {activeTab === "appointments" && (
          <Card>
            <CardContent className="pt-6">
              <AppointmentsExcelTable />
            </CardContent>
          </Card>
        )}

        {activeTab === "diagnostics" && (
          <Card>
            <CardContent className="pt-6">
              <DiagnosticsExcelTable />
            </CardContent>
          </Card>
        )}

        {activeTab === "sales" && (
          <Card>
            <CardContent className="pt-6">
              <CNAMRappelsTable />
            </CardContent>
          </Card>
        )}

        {activeTab === "rentals" && (
          <RentalStatistics />
        )}

        {activeTab === "manual-tasks" && (
          <Card>
            <CardContent className="pt-6">
              <AdminManualTasksTable />
            </CardContent>
          </Card>
        )}
    </div>
  );
}

// Add layout wrapper
DashboardPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AdminLayout>{page}</AdminLayout>;
};

export default DashboardPage;