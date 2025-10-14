import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlusCircle } from "lucide-react";
import { useState } from "react";

interface ProductFormCompanyProps {
  onNext: () => void;
  onBack: () => void;
}

interface Product {
  id: string;
  name: string;
  type: string;
  brand: string;
  quantity: number;
}

export function ProductFormCompany({ onNext, onBack }: ProductFormCompanyProps) {
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
      type: "CPAP",
      brand: "YUWELL",
      quantity: 10
    }
  ];

  const handleAddProduct = (type: "appareil" | "accessoires" | "pieces" | "diagnostique", product: Product) => {
    setSelectedProducts(prev => ({
      ...prev,
      [type]: [...prev[type], product]
    }));
  };

  const handleQuantityChange = (
    type: "appareil" | "accessoires" | "pieces" | "diagnostique",
    index: number,
    value: string
  ) => {
    setSelectedProducts(prev => ({
      ...prev,
      [type]: prev[type].map((product, i) =>
        i === index ? { ...product, quantity: parseInt(value) || 0 } : product
      )
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
        <div className="grid grid-cols-[1fr,auto] gap-4 items-center text-sm font-medium text-muted-foreground">
          <div>Nom | Type | marque</div>
          <div>Quantité</div>
        </div>
        {selectedProducts.appareil.map((product, index) => (
          <Card key={index} className="p-4">
            <div className="grid grid-cols-[1fr,auto] gap-4 items-center">
              <div>{product.name}</div>
              <Input
                type="number"
                value={product.quantity}
                onChange={(e) => handleQuantityChange("appareil", index, e.target.value)}
                className="w-20"
                min="0"
              />
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
        <div className="grid grid-cols-[1fr,auto] gap-4 items-center text-sm font-medium text-muted-foreground">
          <div>Nom | Type | marque</div>
          <div>Quantité</div>
        </div>
        {selectedProducts.accessoires.map((product, index) => (
          <Card key={index} className="p-4">
            <div className="grid grid-cols-[1fr,auto] gap-4 items-center">
              <div>{product.name}</div>
              <Input
                type="number"
                value={product.quantity}
                onChange={(e) => handleQuantityChange("accessoires", index, e.target.value)}
                className="w-20"
                min="0"
              />
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
        <div className="grid grid-cols-[1fr,auto] gap-4 items-center text-sm font-medium text-muted-foreground">
          <div>Nom | Type | marque</div>
          <div>Quantité</div>
        </div>
        {selectedProducts.pieces.map((product, index) => (
          <Card key={index} className="p-4">
            <div className="grid grid-cols-[1fr,auto] gap-4 items-center">
              <div>{product.name}</div>
              <Input
                type="number"
                value={product.quantity}
                onChange={(e) => handleQuantityChange("pieces", index, e.target.value)}
                className="w-20"
                min="0"
              />
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
        <div className="grid grid-cols-[1fr,auto] gap-4 items-center text-sm font-medium text-muted-foreground">
          <div>Nom | Type | marque</div>
          <div>Quantité</div>
        </div>
        {selectedProducts.diagnostique.map((product, index) => (
          <Card key={index} className="p-4">
            <div className="grid grid-cols-[1fr,auto] gap-4 items-center">
              <div>{product.name}</div>
              <Input
                type="number"
                value={product.quantity}
                onChange={(e) => handleQuantityChange("diagnostique", index, e.target.value)}
                className="w-20"
                min="0"
              />
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

export default ProductFormCompany;
