import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileCheck, 
  FileX,
  ChevronRight,
  Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CNAMInfo {
  bondType: string;
  currentStep: number;
  totalSteps: number;
  status: 'en_attente_approbation' | 'approuve' | 'termine' | 'refuse';
  notes?: string;
  bondAmount?: number;
  devicePrice?: number;
  complementAmount?: number;
}

interface CNAMStepSelectorProps {
  cnamInfo: CNAMInfo;
  onUpdate: (cnamInfo: CNAMInfo) => void;
  editable?: boolean;
  className?: string;
}

const CNAM_STEPS = [
  { id: 1, label: 'En attente d\'approbation CNAM', description: 'Dossier soumis, en attente de l\'approbation CNAM' },
  { id: 2, label: 'Accord est avec patient', description: 'Accord est avec le patient' },
  { id: 3, label: 'Technicien récupère Bon Achat / Location CNAM', description: 'Technicien récupère le Bon Achat CNAM auprès du patient' },
  { id: 4, label: 'Livraison Bon Achat à l\'Admin', description: 'Technicien livre le Bon Achat à l\'administration' },
  { id: 5, label: 'Livraison au Technicien', description: 'Admin livre le bon de livraison au technicien' },
  { id: 6, label: 'Signature Médecin', description: 'Médecin effectue la signature du bon de livraison' },
  { id: 7, label: 'Livraison au Admin', description: 'Technicien livre le bon de livraison au admin' }
];

const CNAM_STATUSES = [
  { 
    id: 'en_attente_approbation', 
    label: 'En attente d\'approbation CNAM', 
    color: 'bg-amber-100 text-amber-700',
    icon: <Clock className="h-4 w-4" />
  },
  { 
    id: 'approuve', 
    label: 'Dossier approuvé - En cours', 
    color: 'bg-blue-100 text-blue-700',
    icon: <FileCheck className="h-4 w-4" />
  },
  { 
    id: 'termine', 
    label: 'Processus terminé', 
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle2 className="h-4 w-4" />
  },
  { 
    id: 'refuse', 
    label: 'Dossier refusé', 
    color: 'bg-red-100 text-red-700',
    icon: <FileX className="h-4 w-4" />
  }
];

export const CNAMStepSelector: React.FC<CNAMStepSelectorProps> = ({
  cnamInfo,
  onUpdate,
  editable = true,
  className
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedInfo, setEditedInfo] = useState(cnamInfo);

  // Sync editedInfo when cnamInfo changes from outside
  useEffect(() => {
    if (!isEditing) {
      setEditedInfo(cnamInfo);
    }
  }, [cnamInfo, isEditing]);

  const currentStatus = CNAM_STATUSES.find(s => s.id === cnamInfo.status);
  
  // Calculate if complement is required
  const needsComplement = cnamInfo.devicePrice && cnamInfo.bondAmount && 
    cnamInfo.devicePrice > cnamInfo.bondAmount;
  const complementAmount = needsComplement ? 
    (cnamInfo.devicePrice! - cnamInfo.bondAmount!) : 0;
  
  // Auto-set step based on status
  const actualCurrentStep = 
    cnamInfo.status === 'en_attente_approbation' ? 1 : 
    cnamInfo.status === 'termine' ? 7 : 
    cnamInfo.status === 'refuse' ? 1 :
    cnamInfo.currentStep;

  const handleSave = () => {
    // Auto-adjust step based on status before saving
    const finalInfo = { ...editedInfo };
    
    if (editedInfo.status === 'en_attente_approbation') {
      finalInfo.currentStep = 1;
    } else if (editedInfo.status === 'termine') {
      finalInfo.currentStep = 7;
    } else if (editedInfo.status === 'refuse') {
      finalInfo.currentStep = 1;
    }
    
    onUpdate(finalInfo);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedInfo(cnamInfo);
    setIsEditing(false);
  };

  if (!editable && !isEditing) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Suivi CNAM</CardTitle>
            <Badge className={currentStatus?.color}>
              {currentStatus?.icon}
              <span className="ml-2">{currentStatus?.label}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Complement Information */}
          {needsComplement && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-800">Complément requis</span>
              </div>
              <div className="text-sm text-amber-700">
                <p>Prix de l'appareil: {cnamInfo.devicePrice?.toFixed(2)} DT</p>
                <p>Montant du bond CNAM: {cnamInfo.bondAmount?.toFixed(2)} DT</p>
                <p className="font-medium">Complément à payer: {complementAmount.toFixed(2)} DT</p>
              </div>
            </div>
          )}

          {/* CNAM Steps */}
          <div className="space-y-2">
            {CNAM_STEPS.map((step, index) => {
              let isCompleted = false;
              let isCurrent = false;
              
              if (cnamInfo.status === 'en_attente_approbation') {
                // Only step 1 is current when waiting for approval
                isCurrent = step.id === 1;
                isCompleted = false;
              } else if (cnamInfo.status === 'termine') {
                // All steps completed when process is finished
                isCompleted = step.id < 7;
                isCurrent = step.id === 7;
              } else if (cnamInfo.status === 'refuse') {
                // Step 1 is current and marked as refused
                isCurrent = step.id === 1;
                isCompleted = false;
              } else {
                // Normal logic for approved states (en cours)
                isCompleted = step.id < actualCurrentStep;
                isCurrent = step.id === actualCurrentStep;
              }
              
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0",
                    isCompleted 
                      ? "bg-green-500 text-white" 
                      : isCurrent
                        ? cnamInfo.status === 'refuse' && step.id === 1 
                          ? "bg-red-500 text-white"
                          : "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-500"
                  )}>
                    {isCompleted ? <CheckCircle2 className="h-3 w-3" /> : 
                     isCurrent && cnamInfo.status === 'refuse' && step.id === 1 ? <FileX className="h-3 w-3" /> : 
                     step.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "text-sm font-medium",
                      isCompleted ? "text-green-700" : 
                      isCurrent ? 
                        (cnamInfo.status === 'refuse' && step.id === 1 ? "text-red-700" : "text-blue-700") : 
                        "text-gray-500"
                    )}>
                      {step.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="text-sm text-gray-600">
            <p><strong>Étape actuelle:</strong> {actualCurrentStep} / 7</p>
            <p><strong>Type de bond:</strong> {cnamInfo.bondType}</p>
            {cnamInfo.notes && (
              <p><strong>Notes:</strong> {cnamInfo.notes}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Suivi CNAM</CardTitle>
          <div className="flex items-center gap-2">
            {!isEditing && editable && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Modifier
              </Button>
            )}
            <Badge className={currentStatus?.color}>
              {currentStatus?.icon}
              <span className="ml-2">{currentStatus?.label}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            {editedInfo.status !== 'en_attente_approbation' && editedInfo.status !== 'termine' && (
              <div>
                <Label htmlFor="currentStep">Étape actuelle</Label>
                <Select 
                  value={editedInfo.currentStep.toString()} 
                  onValueChange={(value) => setEditedInfo({
                    ...editedInfo,
                    currentStep: parseInt(value)
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CNAM_STEPS.filter(step => step.id > 1).map(step => (
                      <SelectItem key={step.id} value={step.id.toString()}>
                        Étape {step.id}: {step.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="status">Statut</Label>
              <Select 
                value={editedInfo.status} 
                onValueChange={(value: any) => setEditedInfo({
                  ...editedInfo,
                  status: value
                })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CNAM_STATUSES.map(status => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        {status.icon}
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={editedInfo.notes || ''}
                onChange={(e) => setEditedInfo({
                  ...editedInfo,
                  notes: e.target.value
                })}
                className="mt-1"
                rows={3}
                placeholder="Ajoutez des notes sur l'avancement du dossier..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                Sauvegarder
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {CNAM_STEPS.map((step, index) => {
                const isCompleted = step.id <= cnamInfo.currentStep;
                const isCurrent = step.id === cnamInfo.currentStep + 1;
                
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0",
                      isCompleted 
                        ? "bg-green-500 text-white" 
                        : isCurrent
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-500"
                    )}>
                      {isCompleted ? <CheckCircle2 className="h-3 w-3" /> : step.id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-sm font-medium",
                        isCompleted ? "text-green-700" : isCurrent ? "text-blue-700" : "text-gray-500"
                      )}>
                        {step.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {step.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="text-sm text-gray-600">
              <p><strong>Étape actuelle:</strong> {cnamInfo.currentStep} / {cnamInfo.totalSteps}</p>
              <p><strong>Type de bond:</strong> {cnamInfo.bondType}</p>
              {cnamInfo.notes && (
                <p><strong>Notes:</strong> {cnamInfo.notes}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CNAMStepSelector;