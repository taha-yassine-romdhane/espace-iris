import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, UserCheck, AlertCircle } from "lucide-react";

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

interface TechnicianSelectorProps {
  onSelect: (technicianId: string) => void;
}

export function TechnicianSelector({ onSelect }: TechnicianSelectorProps) {
  const [selectedValue, setSelectedValue] = useState<string>("");

  // Fetch technicians from the database
  const { data: technicians, isLoading, error } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const response = await axios.get('/api/technicians');
      return response.data as Technician[];
    }
  });

  if (isLoading) {
    return (
      <Card className="max-w-md mx-auto shadow-lg border-blue-100 border">
        <CardHeader className="bg-blue-50 rounded-t-lg">
          <CardTitle className="text-blue-700 flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Chargement des techniciens...
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center p-8">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto shadow-lg border-red-100 border">
        <CardHeader className="bg-red-50 rounded-t-lg">
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Erreur
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-red-500 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Impossible de charger les techniciens. Veuillez réessayer plus tard.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto shadow-lg  border transition-all hover:shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg border-b border-blue-100">
        <CardTitle className="text-blue-700 flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-blue-600" />
          Sélectionner Technicien
        </CardTitle>
        <CardDescription>
          Choisissez un technicien pour voir son historique
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="space-y-2">
          <label htmlFor="technician-select" className="text-sm font-medium text-gray-700">
            Technicien
          </label>
          <Select
            value={selectedValue}
            onValueChange={setSelectedValue}
          >
            <SelectTrigger id="technician-select" className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm">
              <SelectValue placeholder="Sélectionner un technicien..." />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {technicians && technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id} className="cursor-pointer hover:bg-blue-50">
                  {tech.user.firstName} {tech.user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          className={`w-full py-2 transition-all ${
            selectedValue 
              ? "bg-blue-600 hover:bg-blue-700 text-white" 
              : "bg-gray-200 text-gray-500"
          }`}
          onClick={() => onSelect(selectedValue)}
          disabled={!selectedValue}
        >
          {selectedValue ? "Voir l'historique" : "Sélectionner un technicien"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default TechnicianSelector;
