import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, AlertCircle } from 'lucide-react';

interface DiagnosticResult {
  id: string;
  deviceId: string;
  deviceName: string;
  patientId: string;
  patientName: string;
  parameterId: string;
  parameterName: string;
  dueDate: string;
  value?: string;
  notes?: string;
  status: 'PENDING' | 'COMPLETED';
}

export function DiagnosticResultsNotification() {
  const [pendingResults, setPendingResults] = useState<DiagnosticResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<DiagnosticResult | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [resultValue, setResultValue] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const { toast } = useToast();

  // Fetch pending diagnostic results
  useEffect(() => {
    fetchPendingResults();
  }, []);

  const fetchPendingResults = async () => {
    setIsLoading(true);
    try {
      // This would be replaced with your actual API endpoint
      const response = await fetch('/api/diagnostic-results/pending');
      if (!response.ok) {
        throw new Error('Failed to fetch pending diagnostic results');
      }
      const data = await response.json();
      setPendingResults(data || []);
    } catch (error) {
      console.error('Error fetching pending results:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer les résultats en attente',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateResult = (result: DiagnosticResult) => {
    setSelectedResult(result);
    setResultValue(result.value || '');
    setResultNotes(result.notes || '');
    setIsUpdateDialogOpen(true);
  };

  const submitResultUpdate = async () => {
    if (!selectedResult) return;

    try {
      // This would be replaced with your actual API endpoint
      const response = await fetch(`/api/diagnostic-results/${selectedResult.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: resultValue,
          notes: resultNotes,
          status: 'COMPLETED',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update diagnostic result');
      }

      toast({
        title: 'Succès',
        description: 'Le résultat a été mis à jour avec succès',
      });

      // Refresh the list of pending results
      fetchPendingResults();
      setIsUpdateDialogOpen(false);
    } catch (error) {
      console.error('Error updating result:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le résultat',
        variant: 'destructive',
      });
    }
  };

  // Calculate if a result is overdue
  const isOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Résultats de diagnostic en attente</h2>
        <Button variant="outline" onClick={fetchPendingResults} disabled={isLoading}>
          Actualiser
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Chargement des résultats en attente...</div>
      ) : pendingResults.length > 0 ? (
        <div className="space-y-4">
          {pendingResults.map((result) => (
            <div
              key={result.id}
              className={`bg-white rounded-lg border p-4 shadow-sm ${
                isOverdue(result.dueDate) ? 'border-red-300' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-base font-medium">{result.parameterName}</h3>
                  <p className="text-sm text-gray-600">
                    Appareil: {result.deviceName} | Patient: {result.patientName}
                  </p>
                </div>
                <div className="flex items-center">
                  {isOverdue(result.dueDate) ? (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      En retard
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      À venir
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-700 mb-3">
                <span className="font-medium">Date d&apos;échéance: </span>
                {new Date(result.dueDate).toLocaleDateString()}
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleUpdateResult(result)}
              >
                Saisir le résultat
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Aucun résultat de diagnostic en attente
        </div>
      )}

      {selectedResult && (
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="max-w-[500px] rounded-lg">
            <DialogHeader>
              <DialogTitle>Saisir le résultat</DialogTitle>
              <DialogDescription>
                Entrez le résultat pour {selectedResult.parameterName} du patient{' '}
                {selectedResult.patientName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="resultValue">Valeur du résultat</Label>
                <Input
                  id="resultValue"
                  value={resultValue}
                  onChange={(e) => setResultValue(e.target.value)}
                  placeholder="Entrez la valeur du résultat"
                />
              </div>
              <div>
                <Label htmlFor="resultNotes">Notes (optionnel)</Label>
                <Textarea
                  id="resultNotes"
                  value={resultNotes}
                  onChange={(e) => setResultNotes(e.target.value)}
                  placeholder="Ajoutez des notes ou observations"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={submitResultUpdate}>Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default DiagnosticResultsNotification;
