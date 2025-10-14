import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Shield, Database, FileText, Calendar, CreditCard, Stethoscope, Home, Users, Bell, Settings, History, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface PatientDependencies {
  canDelete: boolean;
  blockers: {
    sales: number;
    rentals: number;
    payments: number;
    diagnostics: number;
    appointments: number;
  };
  cascadable: {
    files: number;
    notifications: number;
    medicalDevices: number;
    deviceParameters: number;
    patientHistory: number;
  };
  warnings: string[];
}

interface PatientDeletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onDeleteComplete: () => void;
}

export function PatientDeletionDialog({ 
  isOpen, 
  onClose, 
  patientId, 
  patientName,
  onDeleteComplete 
}: PatientDeletionDialogProps) {
  const [dependencies, setDependencies] = useState<PatientDependencies | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showForceOption, setShowForceOption] = useState(false);
  const [confirmForceDelete, setConfirmForceDelete] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && patientId) {
      checkDependencies();
    }
  }, [isOpen, patientId]);

  const checkDependencies = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/renseignements/patients/check-dependencies/${patientId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check dependencies');
      }
      
      setDependencies(data.dependencies);
      setShowForceOption(!data.dependencies.canDelete);
    } catch (error) {
      console.error('Error checking dependencies:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier les dépendances du patient",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (forceDelete = false) => {
    if (!dependencies) return;

    setDeleting(true);
    try {
      const endpoint = forceDelete 
        ? `/api/renseignements/patients/delete-cascade/${patientId}`
        : `/api/renseignements/patients/${patientId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: forceDelete ? JSON.stringify({ forceDelete: true }) : undefined
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete patient');
      }

      toast({
        title: "Suppression réussie",
        description: forceDelete 
          ? `Patient ${patientName} et toutes ses données associées ont été supprimés`
          : `Patient ${patientName} a été supprimé avec succès`,
      });

      onDeleteComplete();
      onClose();
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast({
        title: "Erreur de suppression",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la suppression",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'sales': return <CreditCard className="h-4 w-4" />;
      case 'rentals': return <Home className="h-4 w-4" />;
      case 'payments': return <CreditCard className="h-4 w-4" />;
      case 'diagnostics': return <Stethoscope className="h-4 w-4" />;
      case 'appointments': return <Calendar className="h-4 w-4" />;
      case 'files': return <FileText className="h-4 w-4" />;
      case 'notifications': return <Bell className="h-4 w-4" />;
      case 'medicalDevices': return <Settings className="h-4 w-4" />;
      case 'deviceParameters': return <Database className="h-4 w-4" />;
      case 'patientHistory': return <History className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getDisplayName = (key: string) => {
    const names: Record<string, string> = {
      sales: 'Ventes',
      rentals: 'Locations',
      payments: 'Paiements',
      diagnostics: 'Diagnostics',
      appointments: 'Rendez-vous',
      files: 'Fichiers',
      notifications: 'Notifications',
      medicalDevices: 'Appareils médicaux',
      deviceParameters: 'Paramètres d\'appareils',
      patientHistory: 'Historique patient'
    };
    return names[key] || key;
  };

  const reset = () => {
    setDependencies(null);
    setShowForceOption(false);
    setConfirmForceDelete(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Vérification des dépendances...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Confirmer la suppression du patient
          </DialogTitle>
          <DialogDescription>
            Vous êtes sur le point de supprimer le patient <strong>{patientName}</strong>
          </DialogDescription>
        </DialogHeader>

        {dependencies && (
          <div className="space-y-6">
            {/* Blockers Section */}
            {!dependencies.canDelete && (
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-800">Suppression bloquée</h3>
                </div>
                <p className="text-red-700 text-sm mb-3">
                  Ce patient a des enregistrements liés qui empêchent sa suppression :
                </p>
                <div className="space-y-2">
                  {Object.entries(dependencies.blockers).map(([key, count]) => {
                    if (count === 0) return null;
                    return (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {getIconForType(key)}
                          <span>{getDisplayName(key)}</span>
                        </div>
                        <span className="font-medium text-red-700">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cascadable Items Section */}
            {Object.values(dependencies.cascadable).some(count => count > 0) && (
              <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-800">Données associées</h3>
                </div>
                <p className="text-yellow-700 text-sm mb-3">
                  Ces données seront supprimées avec le patient :
                </p>
                <div className="space-y-2">
                  {Object.entries(dependencies.cascadable).map(([key, count]) => {
                    if (count === 0) return null;
                    return (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {getIconForType(key)}
                          <span>{getDisplayName(key)}</span>
                        </div>
                        <span className="font-medium text-yellow-700">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Safe Deletion Section */}
            {dependencies.canDelete && (
              <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">Suppression sécurisée</h3>
                </div>
                <p className="text-green-700 text-sm">
                  Ce patient peut être supprimé en toute sécurité. Aucun enregistrement critique n'est lié.
                </p>
              </div>
            )}

            {/* Force Delete Option */}
            {showForceOption && (
              <div className="border border-red-300 rounded-lg p-4 bg-red-50">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-800">Suppression forcée (Cascade)</h3>
                </div>
                <p className="text-red-700 text-sm mb-3">
                  ⚠️ <strong>ATTENTION :</strong> Cette action supprimera définitivement le patient ET tous ses enregistrements liés 
                  (ventes, locations, paiements, diagnostics, rendez-vous). Cette action est irréversible.
                </p>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="confirmForceDelete"
                    checked={confirmForceDelete}
                    onCheckedChange={(checked) => setConfirmForceDelete(checked === true)}
                  />
                  <label 
                    htmlFor="confirmForceDelete" 
                    className="text-sm text-red-700 cursor-pointer"
                  >
                    Je comprends que cette action est irréversible et supprimera toutes les données
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={deleting}>
            Annuler
          </Button>
          
          {dependencies?.canDelete && (
            <Button 
              variant="destructive" 
              onClick={() => handleDelete(false)}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Supprimer le patient
            </Button>
          )}

          {showForceOption && (
            <Button 
              variant="destructive" 
              onClick={() => handleDelete(true)}
              disabled={deleting || !confirmForceDelete}
              className="bg-red-700 hover:bg-red-800"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-2" />
              )}
              Suppression forcée
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}