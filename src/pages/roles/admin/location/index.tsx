import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  KeyRound,
  CreditCard,
  Package,
  Shield,
  BarChart3,
  Stethoscope,
  Calendar,
  Info,
} from "lucide-react";
import ComprehensiveRentalsTable from './components/ComprehensiveRentalsTable';
import PaymentsTable from './components/PaymentsTable';
import RentalAccessoriesTable from './components/RentalAccessoriesTable';
import CNAMBondsTable from './components/CNAMBondsTable';
import RentalStatistics from './components/RentalStatistics';
import RentalDevicesTable from './components/RentalDevicesTable';
import { RentalWorkflowGuideDialog } from '@/components/dialogs/RentalWorkflowGuideDialog';

export default function LocationPage() {
  const [activeTab, setActiveTab] = useState("rentals");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <KeyRound className="h-8 w-8 text-blue-600" />
              Gestion des Locations
            </h1>
            <p className="text-slate-600 mt-1">
              Système de gestion complet des locations et paiements
            </p>
            <Alert className="mt-3 bg-blue-50 border-blue-200 max-w-2xl">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                <strong>Info:</strong> Les paiements CNAM sont créés automatiquement lors de la création d'un Bon CNAM
              </AlertDescription>
            </Alert>
          </div>
          <RentalWorkflowGuideDialog />
        </div>

        {/* Main Tabs */}
        <Card className="shadow-lg">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6 bg-slate-100 p-1 rounded-t-lg">
              <TabsTrigger
                value="rentals"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <KeyRound className="h-4 w-4" />
                <span className="hidden sm:inline">Locations</span>
              </TabsTrigger>
              <TabsTrigger
                value="cnam"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Bons et Paiements CNAM</span>
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Tous les Paiements</span>
              </TabsTrigger>
              <TabsTrigger
                value="accessories"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Accessoires</span>
              </TabsTrigger>
              <TabsTrigger
                value="devices"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Stethoscope className="h-4 w-4" />
                <span className="hidden sm:inline">Articles et Restauration</span>
              </TabsTrigger>
              <TabsTrigger
                value="statistics"
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Statistiques</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rentals" className="p-6">
              <ComprehensiveRentalsTable />
            </TabsContent>

            <TabsContent value="cnam" className="p-6">
              <CNAMBondsTable showGlobalView={true} />
            </TabsContent>

            <TabsContent value="payments" className="p-6">
              <PaymentsTable />
            </TabsContent>

            <TabsContent value="accessories" className="p-6">
              <RentalAccessoriesTable />
            </TabsContent>

            <TabsContent value="devices" className="p-6">
              <RentalDevicesTable />
            </TabsContent>

            <TabsContent value="statistics" className="p-6 bg-white">
              <RentalStatistics />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
