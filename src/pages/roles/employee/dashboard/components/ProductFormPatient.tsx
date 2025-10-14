import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PlusCircle } from "lucide-react";
import { useState } from "react";

interface ProductFormPatientProps {
  onNext: () => void;
  onBack: () => void;
}

interface Product {
  id: string;
  name: string;
  parameters?: string[];
}

export function ProductFormPatient({ onNext, onBack }: ProductFormPatientProps) {
  const [selectedProducts, setSelectedProducts] = useState<{
    appareil: Product[];
    accessoires: Product[];
    pieces: Product[];
    diagnostique: Product[];
  }>({
    appareil: [],
    accessoires: [],
    pieces: [],
    diagnostique: []
  });

  const devices = [
    {
      id: "cpap-350",
      name: "CPAP YH-350 FIXE YUWELL",
      parameters: [
        "paramètres CPAP",
        "paramètres VNI",
        "paramètres Concentrateur oxygène",
        "paramètres VI",
        "paramètres Bouteille"
      ]
    }
  ];

  const handleAddProduct = (type: "appareil" | "accessoires" | "pieces" | "diagnostique", product: Product) => {
    setSelectedProducts(prev => ({
      ...prev,
      [type]: [...prev[type], product]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <PlusCircle className="w-4 h-4 mr-1" /> Appareil
        </Button>
        <Button variant="outline" size="sm">
          <PlusCircle className="w-4 h-4 mr-1" /> Accessoires
        </Button>
        <Button variant="outline" size="sm">
          <PlusCircle className="w-4 h-4 mr-1" /> Pièces de rechanges
        </Button>
        <Button variant="outline" size="sm">
          <PlusCircle className="w-4 h-4 mr-1" /> Diagnostique
        </Button>
      </div>

      {/* Appareil Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Appareil</h3>
        {selectedProducts.appareil.map((product, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-4">
              <div>
                <Label>Nom du produit</Label>
                <Input value={product.name} readOnly />
              </div>
              <div className="flex flex-wrap gap-2">
                {product.parameters?.map((param, pIndex) => (
                  <Badge key={pIndex} variant="secondary">{param}</Badge>
                ))}
              </div>
            </div>
          </Card>
        ))}
        <Button 
          variant="outline" 
          onClick={() => handleAddProduct("appareil", devices[0])}
        >
          + Ajouter un appareil
        </Button>
      </div>

      {/* Accessoires Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Accessoires</h3>
        {selectedProducts.accessoires.map((product, index) => (
          <Card key={index} className="p-4">
            <div>
              <Label>Nom de l&apos;accessoire</Label>
              <Input value={product.name} readOnly />
            </div>
          </Card>
        ))}
        <Button 
          variant="outline" 
          onClick={() => handleAddProduct("accessoires", devices[0])}
        >
          + Ajouter un accessoire
        </Button>
      </div>

      {/* Pièces de rechanges Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Pièces de rechanges</h3>
        {selectedProducts.pieces.map((product, index) => (
          <Card key={index} className="p-4">
            <div>
              <Label>Nom de la pièce</Label>
              <Input value={product.name} readOnly />
            </div>
          </Card>
        ))}
        <Button 
          variant="outline" 
          onClick={() => handleAddProduct("pieces", devices[0])}
        >
          + Ajouter une pièce
        </Button>
      </div>

      {/* Diagnostique Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Appareil diagnostique</h3>
        {selectedProducts.diagnostique.map((product, index) => (
          <Card key={index} className="p-4">
            <div>
              <Label>Nom de l&apos;appareil</Label>
              <Input value={product.name} readOnly />
            </div>
          </Card>
        ))}
        <Button 
          variant="outline" 
          onClick={() => handleAddProduct("diagnostique", devices[0])}
        >
          + Ajouter un appareil diagnostique
        </Button>
      </div>

      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onBack}>
          ← Retour
        </Button>
        <Button onClick={onNext}>
          Continuer →
        </Button>
      </div>
    </div>
  );
}

export default ProductFormPatient;
