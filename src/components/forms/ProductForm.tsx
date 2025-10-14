import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ProductStatus, StockLocationType } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ProductFormProps {
  formData: {
    id?: string;
    nom: string;
    type: string;
    marque: string;
    stock: StockLocationType;
    ns?: string;
    prixAchat?: number;
    status: ProductStatus;
    montantReparation?: number;
    pieceRechange?: string;
  };
  existingTypes: string[];
  existingBrands: string[];
  isEditMode?: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onAddType: (newType: string) => void;
  onAddBrand: (newBrand: string) => void;
}

const ProductForm: React.FC<ProductFormProps> = ({
  formData,
  existingTypes,
  existingBrands,
  isEditMode = false,
  onInputChange,
  onSubmit,
  onCancel,
  onAddType,
  onAddBrand
}) => {
  const [showNewTypeDialog, setShowNewTypeDialog] = useState(false);
  const [showNewBrandDialog, setShowNewBrandDialog] = useState(false);
  const [newType, setNewType] = useState('');
  const [newBrand, setNewBrand] = useState('');

  const handleSelectChange = (name: string, value: string) => {
    onInputChange({
      target: { name, value }
    } as React.ChangeEvent<HTMLInputElement>);
  };

  const handleAddType = () => {
    if (newType.trim()) {
      onAddType(newType.trim());
      setNewType('');
      setShowNewTypeDialog(false);
    }
  };

  const handleAddBrand = () => {
    if (newBrand.trim()) {
      onAddBrand(newBrand.trim());
      setNewBrand('');
      setShowNewBrandDialog(false);
    }
  };

  const showRepairFields = formData.stock === StockLocationType.HORS_SERVICE;

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold mb-4">
        {isEditMode ? 'Modifier un Appareil' : 'Ajout d\'un Appareil'}
      </h2>
      
      <div className="space-y-4">
        <div>
          <Label>Nom</Label>
          <Input
            type="text"
            name="nom"
            value={formData.nom}
            onChange={onInputChange}
            placeholder="Nom de l'appareil"
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <Label>Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleSelectChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {existingTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-6"
            onClick={() => setShowNewTypeDialog(true)}
          >
            +
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <Label>Marque</Label>
            <Select
              value={formData.marque}
              onValueChange={(value) => handleSelectChange('marque', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une marque" />
              </SelectTrigger>
              <SelectContent>
                {existingBrands.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-6"
            onClick={() => setShowNewBrandDialog(true)}
          >
            +
          </Button>
        </div>

        <div>
          <Label>N/S</Label>
          <Input
            type="text"
            name="ns"
            value={formData.ns || ''}
            onChange={onInputChange}
            placeholder="Numéro de série"
          />
        </div>

        <div>
          <Label>Prix Achat</Label>
          <Input
            type="number"
            name="prixAchat"
            value={formData.prixAchat || ''}
            onChange={onInputChange}
            placeholder="Prix d'achat"
          />
        </div>

        <div>
          <Label>Stock</Label>
          <Select
            value={formData.stock}
            onValueChange={(value) => {
              handleSelectChange('stock', value);
              // Reset repair status when changing stock
              if (value !== StockLocationType.HORS_SERVICE) {
                handleSelectChange('status', ProductStatus.ACTIVE);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={StockLocationType.VENTE}>Vente</SelectItem>
              <SelectItem value={StockLocationType.LOCATION}>Location</SelectItem>
              <SelectItem value={StockLocationType.HORS_SERVICE}>Hors Service</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showRepairFields && (
          <>
            <div>
              <Label>État</Label>
              <RadioGroup 
                value={formData.status}
                onValueChange={(value) => handleSelectChange('status', value)}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="IN_REPAIR" id="reparation" />
                  <Label htmlFor="reparation">Réparation</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="OUT_OF_SERVICE" id="nonFonctionnel" />
                  <Label htmlFor="nonFonctionnel">Non Fonctionnel</Label>
                </div>
              </RadioGroup>
            </div>

            {(formData.status as any) === "IN_REPAIR" && (
              <>
                <div>
                  <Label>Montant de Réparation</Label>
                  <Input
                    type="number"
                    name="montantReparation"
                    value={formData.montantReparation || ''}
                    onChange={onInputChange}
                    placeholder="0.00 dt"
                  />
                </div>

                <div>
                  <Label>Pièce de Rechange</Label>
                  <Select
                    value={formData.pieceRechange || ''}
                    onValueChange={(value) => handleSelectChange('pieceRechange', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une pièce" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Filtre">Filtre</SelectItem>
                      <SelectItem value="Tuyau">Tuyau</SelectItem>
                      <SelectItem value="Masque">Masque</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button variant="default" onClick={onSubmit}>
          {isEditMode ? 'Mettre à jour' : 'Sauvegarder'}
        </Button>
      </div>

      {/* Dialog for adding new type */}
      <Dialog open={showNewTypeDialog} onOpenChange={setShowNewTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="Nom du type"
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowNewTypeDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddType}>
                Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for adding new brand */}
      <Dialog open={showNewBrandDialog} onOpenChange={setShowNewBrandDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une nouvelle marque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              placeholder="Nom de la marque"
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowNewBrandDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddBrand}>
                Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductForm;