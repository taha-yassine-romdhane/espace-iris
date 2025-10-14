import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstallationsHistory } from "./InstallationsHistory";
import { PaymentsHistory } from "./PaymentsHistory";
import { TransfersHistory } from "./TransfersHistory";
import { TasksHistory } from "./TasksHistory";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface TechnicianHistoryProps {
  technicianId: string;
  onBack: () => void;
}

interface Technician {
  id: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export function TechnicianHistory({ technicianId, onBack }: TechnicianHistoryProps) {
  const { data: technician, isLoading, error } = useQuery({
    queryKey: ['technician', technicianId],
    queryFn: async () => {
      const response = await axios.get(`/api/technicians/${technicianId}`);
      return response.data as Technician;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !technician) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-red-600">Erreur</h2>
            <p className="text-sm text-muted-foreground">Impossible de charger les informations du technicien</p>
          </div>
          <Button onClick={onBack}>Retour</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Portail Technicien: {technician.user.firstName} {technician.user.lastName}</h2>
          <div className="flex space-x-4 mt-2">
          </div>
        </div>
        <Button variant="outline" onClick={onBack}>Retour</Button>
      </div>

      <Tabs defaultValue="installations" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="installations">Installations</TabsTrigger>
          <TabsTrigger value="payments">Paiements</TabsTrigger>
          <TabsTrigger value="transfers">Transferts</TabsTrigger>
          <TabsTrigger value="tasks">Tâches</TabsTrigger>
        </TabsList>

        <TabsContent value="installations">
          <InstallationsHistory technicianId={technicianId} />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsHistory technicianId={technicianId} />
        </TabsContent>

        <TabsContent value="transfers">
          <TransfersHistory technicianId={technicianId} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksHistory technicianId={technicianId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TechnicianHistory;
