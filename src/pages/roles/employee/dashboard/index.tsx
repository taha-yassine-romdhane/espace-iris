import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Building2, ShoppingCart, Stethoscope, Calendar, ListTodo } from "lucide-react";
import { useRouter } from "next/router";
import EmployeeLayout from '../EmployeeLayout';
import { TabSwitcher } from "./components/TabSwitcher";
import { Card, CardContent } from "@/components/ui/card";
import RentalStatistics from '../rentals/components/RentalStatistics';

// Import new Excel table components
import AppointmentsExcelTable from "./components/tables/AppointmentsExcelTable";
import DiagnosticsExcelTable from "./components/tables/DiagnosticsExcelTable";
import SalesExcelTable from "./components/tables/SalesExcelTable";
import EmployeeManualTasksTable from "../manual-tasks/index";

function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"appointments" | "diagnostics" | "sales" | "rentals" | "manual-tasks">("manual-tasks");
  const router = useRouter();

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-8 text-green-900">Tableau de Bord</h1>

      {/* Action Buttons Row - 5 per line, same color */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Button
            className="w-full bg-green-700 hover:bg-green-600 text-white flex items-center justify-start gap-2"
            onClick={() => router.push("/roles/employee/manual-tasks")}
          >
            <ListTodo className="h-5 w-5" />
            <span>Mes Tâches</span>
          </Button>

          <Button
            className="w-full bg-green-700 hover:bg-green-600 text-white flex items-center justify-start gap-2"
            onClick={() => router.push("/roles/employee/appointments")}
          >
            <Calendar className="h-5 w-5" />
            <span>Nouveau Rendez-vous</span>
          </Button>

          <Button
            className="w-full bg-green-700 hover:bg-green-600 text-white flex items-center justify-start gap-2"
            onClick={() => router.push("/roles/employee/diagnostics")}
          >
            <Stethoscope className="h-5 w-5" />
            <span>Commencer un Diagnostic</span>
          </Button>

          <Button
            className="w-full bg-green-700 hover:bg-green-600 text-white flex items-center justify-start gap-2"
            onClick={() => router.push("/roles/employee/sales")}
          >
            <ShoppingCart className="h-5 w-5" />
            <span>Commencer une Vente</span>
          </Button>

          <Button
            className="w-full bg-green-700 hover:bg-green-600 text-white flex items-center justify-start gap-2"
            onClick={() => router.push("/roles/employee/rentals")}
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
            <SalesExcelTable />
          </CardContent>
        </Card>
      )}

      {activeTab === "rentals" && (
        <RentalStatistics />
      )}

      {activeTab === "manual-tasks" && (
        <Card>
          <CardContent className="pt-6">
            <EmployeeManualTasksTable />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Add layout wrapper
DashboardPage.getLayout = function getLayout(page: React.ReactElement) {
  return <EmployeeLayout>{page}</EmployeeLayout>;
};

export default DashboardPage;
