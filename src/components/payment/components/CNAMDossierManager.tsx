import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { FileCheck, AlertCircle, Clock, CheckCircle2, XCircle, FileQuestion } from 'lucide-react';
import { PaymentData } from '../context/PaymentContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CNAMDossierManagerProps {
  payment: PaymentData;
  onUpdate: (updatedPayment: PaymentData) => void;
  readOnly?: boolean;
}

const statusIcons = {
  'en_attente': <Clock className="h-5 w-5 text-amber-500" />,
  'en_cours': <FileQuestion className="h-5 w-5 text-blue-500" />,
  'complement_dossier': <AlertCircle className="h-5 w-5 text-orange-500" />,
  'accepte': <CheckCircle2 className="h-5 w-5 text-green-500" />,
  'refuse': <XCircle className="h-5 w-5 text-red-500" />
};

const statusLabels = {
  'en_attente': 'En attente de dépôt',
  'en_cours': 'Dossier en cours de traitement',
  'complement_dossier': 'Complément de dossier requis',
  'accepte': 'Dossier accepté',
  'refuse': 'Dossier refusé'
};

const bondTypeLabels = {
  'masque': 'Masque CPAP',
  'cpap': 'Appareil CPAP',
  'autre': 'Autre équipement'
};

const CNAMDossierManager: React.FC<CNAMDossierManagerProps> = ({ payment, onUpdate, readOnly = false }) => {
  const [status, setStatus] = useState<'en_attente' | 'en_cours' | 'complement_dossier' | 'accepte' | 'refuse'>(payment.etatDossier || 'en_attente');
  const [note, setNote] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = () => {
    if (!status || !selectedDate) return;

    setIsUpdating(true);
    
    try {
      // Create a new status history entry
      const newStatusEntry = {
        date: format(selectedDate, 'yyyy-MM-dd'),
        status,
        note: note.trim() || undefined,
        user: 'current_user' // This should be replaced with the actual logged-in user
      };

      // Update the appropriate date field based on status
      const dateUpdates: Partial<PaymentData> = {};
      if (status === 'en_attente') {
        dateUpdates.dateDepose = format(selectedDate, 'yyyy-MM-dd');
      } else if (status === 'accepte') {
        dateUpdates.dateAcceptation = format(selectedDate, 'yyyy-MM-dd');
      } else if (status === 'en_cours' || status === 'complement_dossier') {
        dateUpdates.dateRappel = format(selectedDate, 'yyyy-MM-dd');
      }

      // Prepare the updated payment data
      const updatedPayment: PaymentData = {
        ...payment,
        etatDossier: status,
        ...dateUpdates,
        statusHistory: [
          ...(payment.statusHistory || []),
          newStatusEntry
        ],
        isPending: !['accepte', 'refuse'].includes(status),
        metadata: {
          ...(payment.metadata || {}),
          lastUpdated: new Date().toISOString(),
          pendingStatus: !['accepte', 'refuse'].includes(status)
        }
      };

      // Call the onUpdate callback with the updated payment
      onUpdate(updatedPayment);
      
      // Reset form
      setNote('');
      setSelectedDate(undefined);
    } catch (error) {
      console.error('Error updating CNAM dossier status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Get the latest status entry from history
  const latestStatusEntry = payment.statusHistory && payment.statusHistory.length > 0
    ? payment.statusHistory[payment.statusHistory.length - 1]
    : null;

  // Determine if the dossier is pending or completed
  const isPending = payment.isPending !== false && !['accepte', 'refuse'].includes(payment.etatDossier || '');

  return (
    <Card className={`border ${isPending ? 'border-amber-300' : 'border-green-300'}`}>
      <CardHeader className="bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Dossier CNAM {payment.dossierReference || `#${payment.id?.substring(0, 8) || 'Nouveau'}`}</CardTitle>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
            {statusIcons[payment.etatDossier as keyof typeof statusIcons] || statusIcons.en_attente}
            <span className="text-sm font-medium">
              {statusLabels[payment.etatDossier as keyof typeof statusLabels] || 'En attente'}
            </span>
          </div>
        </div>
        <CardDescription>
          {payment.cnamBonType && (
            <span className="block mt-1">
              Type de bon: <span className="font-medium">{bondTypeLabels[payment.cnamBonType as keyof typeof bondTypeLabels]}</span>
            </span>
          )}
          <span className="block mt-1">
            Montant: <span className="font-medium">{typeof payment.amount === 'number' ? payment.amount.toFixed(2) : Number(payment.amount || 0).toFixed(2)} DT</span>
          </span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        {isPending ? (
          <Alert className="bg-amber-50 text-amber-800 border-amber-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Dossier en attente</AlertTitle>
            <AlertDescription>
              Ce dossier CNAM nécessite un suivi. Veuillez mettre à jour son statut dès que vous avez des nouvelles.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-green-50 text-green-800 border-green-200">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Dossier finalisé</AlertTitle>
            <AlertDescription>
              Ce dossier CNAM a été {payment.etatDossier === 'accepte' ? 'accepté' : 'refusé'} et ne nécessite plus de suivi.
            </AlertDescription>
          </Alert>
        )}

        {/* Status History */}
        {payment.statusHistory && payment.statusHistory.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-sm mb-2">Historique du dossier:</h4>
            <div className="space-y-2">
              {payment.statusHistory.map((entry, index) => (
                <div key={index} className="text-sm p-2 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-2">
                    {statusIcons[entry.status as keyof typeof statusIcons] || <Clock className="h-4 w-4" />}
                    <span className="font-medium">{statusLabels[entry.status as keyof typeof statusLabels] || entry.status}</span>
                    <span className="text-gray-500 ml-auto">{entry.date}</span>
                  </div>
                  {entry.note && <p className="mt-1 text-gray-600">{entry.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {!readOnly && isPending && (
          <div className="mt-6 space-y-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium">Mettre à jour le statut du dossier</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nouveau statut</label>
                <Select 
                  value={status} 
                  onValueChange={(value) => setStatus(value as 'en_attente' | 'en_cours' | 'complement_dossier' | 'accepte' | 'refuse')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_attente">En attente de dépôt</SelectItem>
                    <SelectItem value="en_cours">En cours de traitement</SelectItem>
                    <SelectItem value="complement_dossier">Complément de dossier requis</SelectItem>
                    <SelectItem value="accepte">Dossier accepté</SelectItem>
                    <SelectItem value="refuse">Dossier refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <DatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  placeholder="Sélectionner une date"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Note (optionnel)</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ajouter des détails sur le statut du dossier..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        )}
      </CardContent>
      
      {!readOnly && isPending && (
        <CardFooter className="flex justify-end gap-2 pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => {
              setStatus(payment.etatDossier || 'en_attente');
              setNote('');
              setSelectedDate(undefined);
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleStatusUpdate}
            disabled={!status || !selectedDate || isUpdating}
          >
            Mettre à jour le statut
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default CNAMDossierManager;
