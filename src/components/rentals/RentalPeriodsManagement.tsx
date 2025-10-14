import React, { useState } from 'react';
import { format, differenceInDays, addDays, isAfter, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Zap,
  Sparkles,
  Eye,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

interface RentalPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  amount: number;
  paymentMethod: string;
  isGapPeriod: boolean;
  gapReason?: string;
  notes?: string;
  paymentId?: string;
  cnamBondId?: string;
}

interface RentalPeriodsManagementProps {
  rental: any;
  rentalPeriods: RentalPeriod[];
  onUpdate?: (periods: RentalPeriod[]) => void;
}

interface GeneratedPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  amount: number;
  paymentMethod: 'CASH' | 'CNAM';
  isGapPeriod: boolean;
  gapReason?: string;
  source: 'CNAM_BOND' | 'GAP_AUTO';
  notes?: string;
  cnamBondId?: string;
}

export default function RentalPeriodsManagement({ rental, rentalPeriods, onUpdate }: RentalPeriodsManagementProps) {
  const [periods, setPeriods] = useState<RentalPeriod[]>(rentalPeriods || []);
  const [editingPeriod, setEditingPeriod] = useState<RentalPeriod | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPeriod, setNewPeriod] = useState<Partial<RentalPeriod>>({
    paymentMethod: 'CASH',
    isGapPeriod: false,
    amount: 0,
  });

  // Auto-generation state
  const [showAutoGeneration, setShowAutoGeneration] = useState(false);
  const [generatedPeriods, setGeneratedPeriods] = useState<GeneratedPeriod[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'PPP', { locale: fr });
  };

  const calculateDuration = (startDate: Date, endDate: Date) => {
    return differenceInDays(endDate, startDate) + 1;
  };

  const getPaymentMethodBadge = (method: string) => {
    const colors = {
      CASH: 'bg-green-100 text-green-800 border-green-200',
      CNAM: 'bg-blue-100 text-blue-800 border-blue-200',
      CHEQUE: 'bg-purple-100 text-purple-800 border-purple-200',
      BANK_TRANSFER: 'bg-orange-100 text-orange-800 border-orange-200',
      MAD: 'bg-pink-100 text-pink-800 border-pink-200',
      TRAITE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };

    const labels = {
      CASH: 'Espèces',
      CNAM: 'CNAM',
      CHEQUE: 'Chèque',
      BANK_TRANSFER: 'Virement',
      MAD: 'MAD',
      TRAITE: 'Traite',
    };

    return (
      <Badge variant="outline" className={colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'}>
        <CreditCard className="h-3 w-3 mr-1" />
        {labels[method as keyof typeof labels] || method}
      </Badge>
    );
  };

  const detectGaps = () => {
    if (periods.length === 0) return [];
    
    const sortedPeriods = [...periods].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const gaps = [];
    const rentalStart = new Date(rental.startDate);
    const rentalEnd = rental.endDate ? new Date(rental.endDate) : null;
    
    // Gap before first period
    if (sortedPeriods.length > 0) {
      const firstPeriodStart = new Date(sortedPeriods[0].startDate);
      if (isBefore(rentalStart, firstPeriodStart)) {
        const gapDays = differenceInDays(firstPeriodStart, rentalStart);
        if (gapDays > 0) {
          gaps.push({
            start: rentalStart,
            end: addDays(firstPeriodStart, -1),
            duration: gapDays,
          });
        }
      }
    }
    
    // Gaps between consecutive periods
    for (let i = 0; i < sortedPeriods.length - 1; i++) {
      const currentEnd = new Date(sortedPeriods[i].endDate);
      const nextStart = new Date(sortedPeriods[i + 1].startDate);
      
      if (isAfter(nextStart, addDays(currentEnd, 1))) {
        gaps.push({
          start: addDays(currentEnd, 1),
          end: addDays(nextStart, -1),
          duration: differenceInDays(nextStart, addDays(currentEnd, 1)),
        });
      }
    }
    
    // Gap after last period
    if (sortedPeriods.length > 0 && rentalEnd) {
      const lastPeriodEnd = new Date(sortedPeriods[sortedPeriods.length - 1].endDate);
      if (isAfter(rentalEnd, lastPeriodEnd)) {
        const gapDays = differenceInDays(rentalEnd, lastPeriodEnd);
        if (gapDays > 0) {
          gaps.push({
            start: addDays(lastPeriodEnd, 1),
            end: rentalEnd,
            duration: gapDays,
          });
        }
      }
    }
    
    return gaps;
  };

  const handleSaveNewPeriod = () => {
    if (!newPeriod.startDate || !newPeriod.endDate) {
      return;
    }

    const period: RentalPeriod = {
      id: `new-${Date.now()}`,
      startDate: newPeriod.startDate,
      endDate: newPeriod.endDate,
      amount: newPeriod.amount || 0,
      paymentMethod: newPeriod.paymentMethod || 'CASH',
      isGapPeriod: newPeriod.isGapPeriod || false,
      gapReason: newPeriod.gapReason,
      notes: newPeriod.notes,
    };

    const updatedPeriods = [...periods, period];
    setPeriods(updatedPeriods);
    onUpdate?.(updatedPeriods);
    setShowAddDialog(false);
    setNewPeriod({
      paymentMethod: 'CASH',
      isGapPeriod: false,
      amount: 0,
    });
  };

  const handleEditPeriod = (period: RentalPeriod) => {
    setEditingPeriod({ ...period });
  };

  const handleSaveEdit = () => {
    if (!editingPeriod) return;

    const updatedPeriods = periods.map(period => 
      period.id === editingPeriod.id ? editingPeriod : period
    );
    setPeriods(updatedPeriods);
    onUpdate?.(updatedPeriods);
    setEditingPeriod(null);
  };

  const handleDeletePeriod = async (periodId: string) => {
    console.log('Deleting period with ID:', periodId);
    console.log('Current periods:', periods.map(p => ({ id: p.id, start: p.startDate, end: p.endDate })));
    
    const periodToDelete = periods.find(p => p.id === periodId);
    if (!periodToDelete) {
      console.error('Period not found for deletion:', periodId);
      return;
    }
    
    const updatedPeriods = periods.filter(period => period.id !== periodId);
    console.log('Periods after deletion:', updatedPeriods.map(p => ({ id: p.id, start: p.startDate, end: p.endDate })));
    
    // Update local state first
    setPeriods(updatedPeriods);
    
    // Clear auto-generation if it was showing
    if (showAutoGeneration) {
      setShowAutoGeneration(false);
      setGeneratedPeriods([]);
    }
    
    // Call the parent update function
    try {
      if (onUpdate) {
        await onUpdate(updatedPeriods);
        console.log('Delete operation completed successfully');
      }
    } catch (error) {
      console.error('Error updating periods after deletion:', error);
      // Revert the local state if the update fails
      setPeriods(periods);
    }
  };

  const handleCreateGapPeriod = (gap: any) => {
    const gapPeriod: Partial<RentalPeriod> = {
      startDate: gap.start,
      endDate: gap.end,
      amount: 0,
      paymentMethod: 'CASH',
      isGapPeriod: true,
      gapReason: 'Gap automatiquement détecté',
    };
    setNewPeriod(gapPeriod);
    setShowAddDialog(true);
  };

  // Auto-generation functions
  const generatePeriods = () => {
    setIsGenerating(true);
    
    const cnamBonds = rental.cnamBonds || [];
    const rentalStart = new Date(rental.startDate);
    const rentalEnd = rental.endDate ? new Date(rental.endDate) : null;
    
    // Calculate daily rate from monthly rental price
    // Assuming rentalPrice is monthly, divide by 30 for daily rate
    const monthlyPrice = rental.medicalDevice?.rentalPrice ? parseFloat(rental.medicalDevice.rentalPrice) : 1500;
    const dailyRate = monthlyPrice / 30; // Convert monthly to daily rate
    
    // For gap periods, we should use patient responsibility rate
    // CNAM typically covers 70-80%, so patient pays 20-30%
    // Or we can use the CNAM bond daily rate as reference
    const getGapDailyRate = () => {
      // If we have CNAM bonds, calculate the patient's daily contribution based on CNAM coverage
      if (cnamBonds.length > 0) {
        const firstBond = cnamBonds[0];
        // Ensure we get a valid monthly amount
        let cnamMonthlyAmount = 0;
        if (firstBond.monthlyAmount) {
          cnamMonthlyAmount = parseFloat(firstBond.monthlyAmount);
        } else if (firstBond.totalAmount && firstBond.coveredMonths) {
          cnamMonthlyAmount = parseFloat(firstBond.totalAmount) / firstBond.coveredMonths;
        }
        
        // If CNAM amount is 0 or invalid, use equipment rate percentage
        if (!cnamMonthlyAmount || cnamMonthlyAmount === 0) {
          console.log('Invalid CNAM amount, using 20% of equipment rate');
          return dailyRate * 0.2;
        }
        
        const cnamDailyRate = cnamMonthlyAmount / 30;
        // Patient typically pays the difference or a small daily fee during gaps
        // Use 20% of equipment rate or CNAM daily rate, whichever is lower
        const calculatedRate = Math.min(dailyRate * 0.2, cnamDailyRate);
        console.log('Gap rate calculation:', {
          equipmentMonthly: monthlyPrice,
          equipmentDaily: dailyRate,
          equipment20Percent: dailyRate * 0.2,
          cnamMonthly: cnamMonthlyAmount,
          cnamDaily: cnamDailyRate,
          finalGapRate: calculatedRate
        });
        
        // Ensure we never return 0 or negative
        return Math.max(calculatedRate, 1); // Minimum 1 TND per day
      }
      // Default to 20% of equipment daily rate for gaps
      return dailyRate * 0.2;
    };
    
    const gapDailyRate = getGapDailyRate();
    
    const periods: GeneratedPeriod[] = [];

    if (cnamBonds.length === 0) {
      // No CNAM bonds - create simple cash period
      const endDate = rentalEnd || addDays(rentalStart, 30);
      const days = differenceInDays(endDate, rentalStart) + 1;
      
      periods.push({
        id: `cash-${Date.now()}`,
        startDate: rentalStart,
        endDate: endDate,
        amount: dailyRate * days,
        paymentMethod: 'CASH',
        isGapPeriod: false,
        source: 'GAP_AUTO',
        notes: 'Période sans couverture CNAM',
      });
    } else {
      // Process CNAM bonds and create periods
      const sortedBonds = cnamBonds
        .filter((bond: any) => bond.startDate && bond.endDate)
        .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      let currentDate = rentalStart;

      // Gap before first CNAM bond
      const firstBond = sortedBonds[0];
      if (firstBond && isBefore(currentDate, new Date(firstBond.startDate))) {
        const gapDays = differenceInDays(new Date(firstBond.startDate), currentDate);
        periods.push({
          id: `gap-pre-${firstBond.id}`,
          startDate: currentDate,
          endDate: addDays(new Date(firstBond.startDate), -1),
          amount: gapDailyRate * gapDays,  // Use gap daily rate
          paymentMethod: 'CASH',
          isGapPeriod: true,
          gapReason: 'CNAM_PENDING',
          source: 'GAP_AUTO',
          notes: `Gap avant couverture CNAM (${gapDays} jours × ${gapDailyRate.toFixed(2)} TND/jour)`,
        });
        currentDate = new Date(firstBond.startDate);
      }

      // Process each CNAM bond
      sortedBonds.forEach((bond: any, index: number) => {
        const bondStart = new Date(bond.startDate);
        const bondEnd = new Date(bond.endDate);
        
        // Add CNAM period
        periods.push({
          id: `cnam-${bond.id}`,
          startDate: bondStart,
          endDate: bondEnd,
          amount: parseFloat(bond.totalAmount) || 0,
          paymentMethod: 'CNAM',
          isGapPeriod: false,
          cnamBondId: bond.id,
          source: 'CNAM_BOND',
          notes: `Bon CNAM - ${bond.bondType}`,
        });

        currentDate = addDays(bondEnd, 1);

        // Gap to next bond
        const nextBond = sortedBonds[index + 1];
        if (nextBond && isBefore(currentDate, new Date(nextBond.startDate))) {
          const gapDays = differenceInDays(new Date(nextBond.startDate), currentDate);
          periods.push({
            id: `gap-between-${bond.id}-${nextBond.id}`,
            startDate: currentDate,
            endDate: addDays(new Date(nextBond.startDate), -1),
            amount: gapDailyRate * gapDays,  // Use gap daily rate
            paymentMethod: 'CASH',
            isGapPeriod: true,
            gapReason: 'CNAM_GAP',
            source: 'GAP_AUTO',
            notes: `Gap entre bons CNAM (${gapDays} jours × ${gapDailyRate.toFixed(2)} TND/jour)`,
          });
        }
      });

      // Gap after last CNAM bond
      if (rentalEnd && isAfter(rentalEnd, currentDate)) {
        const gapDays = differenceInDays(rentalEnd, currentDate) + 1;
        periods.push({
          id: `gap-post-${Date.now()}`,
          startDate: currentDate,
          endDate: rentalEnd,
          amount: gapDailyRate * gapDays,  // Use gap daily rate
          paymentMethod: 'CASH',
          isGapPeriod: true,
          gapReason: 'CNAM_EXPIRED',
          source: 'GAP_AUTO',
          notes: `Gap après expiration CNAM (${gapDays} jours × ${gapDailyRate.toFixed(2)} TND/jour)`,
        });
      }
    }

    setGeneratedPeriods(periods);
    setShowAutoGeneration(true);
    setIsGenerating(false);
  };

  const applyGeneratedPeriods = () => {
    const newPeriods = generatedPeriods.map(gp => ({
      id: gp.id,
      startDate: gp.startDate,
      endDate: gp.endDate,
      amount: gp.amount,
      paymentMethod: gp.paymentMethod,
      isGapPeriod: gp.isGapPeriod,
      gapReason: gp.gapReason,
      notes: gp.notes,
      cnamBondId: gp.cnamBondId,
    }));

    // Replace all existing periods with the generated ones to avoid duplicates
    const updatedPeriods = newPeriods;
    setPeriods(updatedPeriods);
    onUpdate?.(updatedPeriods);
    setShowAutoGeneration(false);
    setGeneratedPeriods([]);
  };

  const gaps = detectGaps();
  // Calculate total including gap periods (all periods contribute to total)
  const totalAmount = periods.reduce((sum, period) => {
    const amount = typeof period.amount === 'number' ? period.amount : parseFloat(period.amount) || 0;
    return sum + amount;
  }, 0);
  // Calculate CNAM coverage only
  const cnamAmount = periods.reduce((sum, period) => {
    if (period.paymentMethod === 'CNAM') {
      const amount = typeof period.amount === 'number' ? period.amount : parseFloat(period.amount) || 0;
      return sum + amount;
    }
    return sum;
  }, 0);
  // Calculate patient responsibility (gaps and cash payments)
  const patientAmount = periods.reduce((sum, period) => {
    if (period.isGapPeriod || period.paymentMethod === 'CASH') {
      const amount = typeof period.amount === 'number' ? period.amount : parseFloat(period.amount) || 0;
      return sum + amount;
    }
    return sum;
  }, 0);
  const totalDuration = periods.reduce((sum, period) => sum + calculateDuration(period.startDate, period.endDate), 0);

  return (
    <div className="space-y-6">
      {/* Info Alert for Gap Calculation */}
      {periods.some(p => p.isGapPeriod) && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Calcul des périodes Gap:</strong> Les périodes sans couverture CNAM utilisent un tarif réduit 
            (20% du tarif équipement ou tarif CNAM journalier). Les montants sont calculés automatiquement pour 
            refléter la contribution patient pendant les périodes d'attente.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Header with Add Button and Summary */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Gestion des Périodes de Location
          </h2>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <span>Total: {(totalAmount || 0).toFixed(2)} TND</span>
            {cnamAmount > 0 && patientAmount > 0 && (
              <span className="text-xs">
                (<span className="text-blue-600">CNAM: {cnamAmount.toFixed(2)}</span> + 
                <span className="text-orange-600 ml-1">Patient: {patientAmount.toFixed(2)}</span>)
              </span>
            )}
            <span>Durée: {totalDuration} jours</span>
            <span>Périodes: {periods.length}</span>
            {rental.cnamBonds?.length > 0 && (
              <span className="text-blue-600">Bons CNAM: {rental.cnamBonds.length}</span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={generatePeriods}
            disabled={isGenerating}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Auto-Génération
              </>
            )}
          </Button>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle Période
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter une nouvelle période</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Date de Début</Label>
                  <DatePicker
                    value={newPeriod.startDate}
                    onChange={(date) => setNewPeriod({ ...newPeriod, startDate: date })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="endDate">Date de Fin</Label>
                  <DatePicker
                    value={newPeriod.endDate}
                    onChange={(date) => setNewPeriod({ ...newPeriod, endDate: date })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="amount">Montant (TND)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={newPeriod.amount || 0}
                    onChange={(e) => setNewPeriod({ ...newPeriod, amount: parseFloat(e.target.value) || 0 })}
                    disabled={newPeriod.isGapPeriod}
                  />
                </div>
                
                <div>
                  <Label htmlFor="paymentMethod">Méthode de Paiement</Label>
                  <Select value={newPeriod.paymentMethod} onValueChange={(value) => setNewPeriod({ ...newPeriod, paymentMethod: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Espèces</SelectItem>
                      <SelectItem value="CNAM">CNAM</SelectItem>
                      <SelectItem value="CHEQUE">Chèque</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Virement</SelectItem>
                      <SelectItem value="MAD">MAD</SelectItem>
                      <SelectItem value="TRAITE">Traite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isGapPeriod"
                  checked={newPeriod.isGapPeriod}
                  onCheckedChange={(checked) => setNewPeriod({ 
                    ...newPeriod, 
                    isGapPeriod: !!checked,
                    amount: checked ? 0 : newPeriod.amount 
                  })}
                />
                <Label htmlFor="isGapPeriod">Période de gap (non facturée)</Label>
              </div>
              
              {newPeriod.isGapPeriod && (
                <div>
                  <Label htmlFor="gapReason">Raison du Gap</Label>
                  <Input
                    id="gapReason"
                    value={newPeriod.gapReason || ''}
                    onChange={(e) => setNewPeriod({ ...newPeriod, gapReason: e.target.value })}
                    placeholder="Ex: Patient hospitalisé, appareil en maintenance..."
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newPeriod.notes || ''}
                  onChange={(e) => setNewPeriod({ ...newPeriod, notes: e.target.value })}
                  placeholder="Notes additionnelles..."
                  rows={3}
                />
              </div>
              
              {newPeriod.startDate && newPeriod.endDate && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    Durée: {calculateDuration(newPeriod.startDate, newPeriod.endDate)} jours
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={handleSaveNewPeriod} className="flex items-center gap-1">
                  <Save className="h-3.5 w-3.5" />
                  Ajouter la Période
                </Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Gap Detection Alert */}
      {gaps.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex justify-between items-center">
              <span>{gaps.length} gap(s) détecté(s) entre les périodes de location.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateGapPeriod(gaps[0])}
                className="ml-2"
              >
                Créer Période de Gap
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Rental Periods Table */}
      {periods.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Période</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map((period) => (
                    <TableRow key={`period-${period.id}-${period.startDate}`}>
                      <TableCell>
                        <div className="text-sm">
                          <div>Du {formatDate(period.startDate)}</div>
                          <div>Au {formatDate(period.endDate)}</div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium">
                          {calculateDuration(period.startDate, period.endDate)} jours
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {(typeof period.amount === 'number' ? period.amount : parseFloat(period.amount) || 0).toFixed(2)} TND
                          </div>
                          {period.isGapPeriod && (
                            <Badge variant="outline" className="bg-orange-100 text-orange-800 text-xs">
                              Gap - Patient
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getPaymentMethodBadge(period.paymentMethod)}
                      </TableCell>
                      
                      <TableCell>
                        {period.isGapPeriod ? (
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Gap
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Facturé
                          </Badge>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPeriod(period)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              await handleDeletePeriod(period.id);
                            }}
                            className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune période définie</h3>
            <p className="text-gray-600 mb-4">
              Aucune période de location n'a été définie pour cette location.
            </p>
            <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2 mx-auto">
              <Plus className="h-4 w-4" />
              Ajouter une Période
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Period Dialog */}
      {editingPeriod && (
        <Dialog open={!!editingPeriod} onOpenChange={() => setEditingPeriod(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier la période</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editStartDate">Date de Début</Label>
                  <DatePicker
                    value={editingPeriod.startDate}
                    onChange={(date) => setEditingPeriod({ ...editingPeriod, startDate: date! })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="editEndDate">Date de Fin</Label>
                  <DatePicker
                    value={editingPeriod.endDate}
                    onChange={(date) => setEditingPeriod({ ...editingPeriod, endDate: date! })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="editAmount">Montant (TND)</Label>
                  <Input
                    id="editAmount"
                    type="number"
                    step="0.01"
                    value={editingPeriod.amount}
                    onChange={(e) => setEditingPeriod({ ...editingPeriod, amount: parseFloat(e.target.value) || 0 })}
                    disabled={editingPeriod.isGapPeriod}
                  />
                </div>
                
                <div>
                  <Label htmlFor="editPaymentMethod">Méthode de Paiement</Label>
                  <Select value={editingPeriod.paymentMethod} onValueChange={(value) => setEditingPeriod({ ...editingPeriod, paymentMethod: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Espèces</SelectItem>
                      <SelectItem value="CNAM">CNAM</SelectItem>
                      <SelectItem value="CHEQUE">Chèque</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Virement</SelectItem>
                      <SelectItem value="MAD">MAD</SelectItem>
                      <SelectItem value="TRAITE">Traite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editIsGapPeriod"
                  checked={editingPeriod.isGapPeriod}
                  onCheckedChange={(checked) => setEditingPeriod({ 
                    ...editingPeriod, 
                    isGapPeriod: !!checked,
                    amount: checked ? 0 : editingPeriod.amount 
                  })}
                />
                <Label htmlFor="editIsGapPeriod">Période de gap (non facturée)</Label>
              </div>
              
              {editingPeriod.isGapPeriod && (
                <div>
                  <Label htmlFor="editGapReason">Raison du Gap</Label>
                  <Input
                    id="editGapReason"
                    value={editingPeriod.gapReason || ''}
                    onChange={(e) => setEditingPeriod({ ...editingPeriod, gapReason: e.target.value })}
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="editNotes">Notes</Label>
                <Textarea
                  id="editNotes"
                  value={editingPeriod.notes || ''}
                  onChange={(e) => setEditingPeriod({ ...editingPeriod, notes: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} className="flex items-center gap-1">
                  <Save className="h-3.5 w-3.5" />
                  Sauvegarder
                </Button>
                <Button variant="outline" onClick={() => setEditingPeriod(null)}>
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Auto-generation Preview */}
      {showAutoGeneration && generatedPeriods.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                Périodes Générées Automatiquement
                <Badge variant="outline">{generatedPeriods.length} périodes</Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={applyGeneratedPeriods}
                  className="flex items-center gap-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  Remplacer les périodes ({generatedPeriods.length})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAutoGeneration(false)}
                  className="flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Annuler
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  ⚠️ Attention: Appliquer ces périodes remplacera toutes les périodes existantes
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {generatedPeriods.map((period, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium">
                        {formatDate(period.startDate)} → {formatDate(period.endDate)}
                      </div>
                      <Badge variant="outline" className={
                        period.isGapPeriod 
                          ? 'bg-orange-100 text-orange-800 border-orange-200'
                          : period.paymentMethod === 'CNAM' 
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-green-100 text-green-800 border-green-200'
                      }>
                        {period.isGapPeriod ? 'Gap' : period.paymentMethod}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {period.notes}
                    </div>
                    <div className="text-xs text-gray-500">
                      {differenceInDays(period.endDate, period.startDate) + 1} jours
                      {period.isGapPeriod && (
                        <span className="ml-2">
                          (Tarif réduit patient)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      {period.amount.toFixed(2)} TND
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-blue-900">Total estimé:</span>
                  <span className="font-bold text-xl text-blue-900">
                    {generatedPeriods.reduce((sum, p) => sum + p.amount, 0).toFixed(2)} TND
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gap Details */}
      {gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Gaps Détectés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gaps.map((gap, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <div>
                    <div className="font-medium">
                      Du {formatDate(gap.start)} au {formatDate(gap.end)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Durée: {gap.duration} jours
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCreateGapPeriod(gap)}
                    className="border-orange-200 text-orange-800 hover:bg-orange-100"
                  >
                    Créer Période
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}