import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface StepperFormProps {
  action: "location" | "vente" | "diagnostique";
}

export function StepperForm({  }: StepperFormProps) {
  const [, setCurrentStep] = useState(1);
  const [clientType, setClientType] = useState<"patient" | "societe" | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  // Mock data - replace with actual API calls
  const patients = [
    { id: "1", name: "John Doe" },
    { id: "2", name: "Jane Smith" },
  ];

  const companies = [
    { id: "1", name: "Medical Corp" },
    { id: "2", name: "Health Services Inc" },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center mb-8">
          <div className="flex items-center">
            <div className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center">
              1
            </div>
            <span className="ml-2 font-medium">Type de Renseignement</span>
          </div>
          <div className="h-px bg-gray-300 flex-1 mx-4" />
          <div className="flex items-center opacity-50">
            <div className="bg-gray-300 text-gray-600 w-8 h-8 rounded-full flex items-center justify-center">
              2
            </div>
            <span className="ml-2 font-medium">Ajout Produits</span>
          </div>
          <div className="h-px bg-gray-300 flex-1 mx-4" />
          <div className="flex items-center opacity-50">
            <div className="bg-gray-300 text-gray-600 w-8 h-8 rounded-full flex items-center justify-center">
              3
            </div>
            <span className="ml-2 font-medium">Ajout Paiement</span>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <Label className="text-base">Type de Client</Label>
            <RadioGroup
              className="grid grid-cols-2 gap-4 mt-2"
              value={clientType || ""}
              onValueChange={(value) => {
                setClientType(value as "patient" | "societe");
                setSelectedClient(null);
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="patient" id="patient" />
                <Label htmlFor="patient">Patient</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="societe" id="societe" />
                <Label htmlFor="societe">Société</Label>
              </div>
            </RadioGroup>
          </div>

          {clientType && (
            <div>
              <Label className="text-base">
                {clientType === "patient" ? "Sélectionner le Patient" : "Sélectionner la Société"}
              </Label>
              <Select
                value={selectedClient || ""}
                onValueChange={setSelectedClient}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {(clientType === "patient" ? patients : companies).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end space-x-4 mt-6">
            <Button
              variant="default"
              disabled={!selectedClient}
              onClick={() => setCurrentStep(2)}
            >
              Continue →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StepperForm;
