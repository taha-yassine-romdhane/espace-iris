import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addDays, addMonths } from "date-fns";
import { 
  Loader2, 
  AlertTriangle,
  X
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  RentalPaymentPeriod,
  CNAMBondLocation,
  RentalPaymentStepProps,
  PaymentData,
  ExistingRentalData
} from "./types";
import {
  analyzePaymentGaps,
  autoGeneratePaymentPeriods,
  calculateTotalPaymentAmount,
  validateCnamBondCoverage,
  generatePaymentPeriodsWithCnamValidation
} from "./utils";
import { CNAMBondsTab } from "./CNAMBondsTab";
import { PaymentPeriodsTab } from "./PaymentPeriodsTab";
import { DepositTab } from "./DepositTab";
import { SummaryTab } from "./SummaryTab";

export function RentalPaymentStep({
  selectedProducts,
  selectedClient,
  rentalDetails,
  calculateTotal,
  onBack,
  onComplete,
  isSubmitting = false,
  existingPaymentData, // Add this prop to preserve data
  existingRentalData // Add existing rental import data
}: RentalPaymentStepProps) {
  // Initialize state with existing data if available
  const [paymentPeriods, setPaymentPeriods] = useState<RentalPaymentPeriod[]>(
    existingPaymentData?.paymentPeriods || []
  );
  const [cnamBonds, setCnamBonds] = useState<CNAMBondLocation[]>(
    existingPaymentData?.cnamBonds || []
  );
  const [activeCnamBond, setActiveCnamBond] = useState<string>(
    existingPaymentData?.activeCnamBond || ''
  );
  const [activePaymentPeriod, setActivePaymentPeriod] = useState<string>(
    existingPaymentData?.activePaymentPeriod || ''
  );
  const [activeTab, setActiveTab] = useState<string>(
    existingPaymentData?.activeTab === 'gaps' ? 'cnam' : (existingPaymentData?.activeTab || 'cnam')
  );
  const [showTimeline, setShowTimeline] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(
    existingPaymentData?.depositAmount || 0
  );
  const [depositMethod, setDepositMethod] = useState<string>(
    existingPaymentData?.depositMethod || 'CASH'
  );
  const [paymentNotes, setPaymentNotes] = useState<string>(
    existingPaymentData?.notes || ''
  );
  const [patientStatus, setPatientStatus] = useState<'ACTIVE' | 'HOSPITALIZED' | 'DECEASED' | 'PAUSED'>(
    existingPaymentData?.patientStatus || 'ACTIVE'
  );

  // Track visited tabs to ensure user sees all sections
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    new Set(existingPaymentData?.visitedTabs || ['cnam']) // Start with first tab visited
  );

  // Payment gaps analysis for validation
  const paymentGaps = analyzePaymentGaps(paymentPeriods);
  
  // CNAM bond validation
  const cnamValidations = cnamBonds.map(bond => ({
    bond,
    validation: validateCnamBondCoverage(bond)
  }));
  
  const invalidCnamBonds = cnamValidations.filter(cv => !cv.validation.isValid);

  // Check for potential duplicates
  const hasPotentialDuplicates = () => {
    const periodMap = new Map();
    return paymentPeriods.some(period => {
      const key = `${period.startDate.getTime()}-${period.endDate.getTime()}-${period.amount}-${period.isGapPeriod}`;
      if (periodMap.has(key)) {
        return true;
      }
      periodMap.set(key, true);
      return false;
    });
  };

  const handleAutoGeneratePaymentPeriods = () => {
    // Use the new CNAM validation function with existing periods check
    const generatedPeriods = generatePaymentPeriodsWithCnamValidation(
      cnamBonds,
      rentalDetails,
      selectedProducts,
      calculateTotal,
      existingRentalData,
      paymentPeriods // Pass existing periods to prevent duplicates
    );
    
    if (generatedPeriods.length === 0) {
      toast({
        title: "Aucune période générée",
        description: "Toutes les périodes nécessaires existent déjà ou aucun gap détecté",
        variant: "default"
      });
      return;
    }
    
    // Add generated periods to existing ones
    setPaymentPeriods([...paymentPeriods, ...generatedPeriods]);
    
    toast({
      title: "Périodes générées",
      description: `${generatedPeriods.length} période(s) de paiement ont été générées en tenant compte du statut CNAM`
    });
  };

  // Function to remove duplicate payment periods
  const handleRemoveDuplicates = () => {
    const deduplicatePaymentPeriods = (periods: RentalPaymentPeriod[]): RentalPaymentPeriod[] => {
      const uniquePeriods: RentalPaymentPeriod[] = [];
      
      periods.forEach(period => {
        const isDuplicate = uniquePeriods.some(existing => 
          existing.startDate.getTime() === period.startDate.getTime() &&
          existing.endDate.getTime() === period.endDate.getTime() &&
          existing.amount === period.amount &&
          existing.isGapPeriod === period.isGapPeriod
        );
        
        if (!isDuplicate) {
          uniquePeriods.push(period);
        }
      });
      
      return uniquePeriods;
    };

    const originalCount = paymentPeriods.length;
    const deduplicatedPeriods = deduplicatePaymentPeriods(paymentPeriods);
    const duplicatesRemoved = originalCount - deduplicatedPeriods.length;

    if (duplicatesRemoved > 0) {
      setPaymentPeriods(deduplicatedPeriods);
      toast({
        title: "Doublons supprimés",
        description: `${duplicatesRemoved} période(s) en double ont été supprimées`
      });
    } else {
      toast({
        title: "Aucun doublon trouvé",
        description: "Toutes les périodes de paiement sont uniques",
        variant: "default"
      });
    }
  };

  // Initialize payment periods based on rental details and existing rental data
  useEffect(() => {
    if (rentalDetails?.productPeriods) {
      const initialPeriods: RentalPaymentPeriod[] = [];
      
      // Determine the effective start date for calculations
      const effectiveStartDate = existingRentalData?.isExistingRental && existingRentalData.importDate 
        ? existingRentalData.importDate 
        : new Date(rentalDetails.globalStartDate);
      
      const totalCost = calculateTotal();
      const endDate = rentalDetails.globalEndDate ? new Date(rentalDetails.globalEndDate) : addMonths(effectiveStartDate, 1);
      
      // Handle existing rental with current unpaid amount
      if (existingRentalData?.isExistingRental && existingRentalData.currentUnpaidAmount && existingRentalData.currentUnpaidAmount > 0) {
        initialPeriods.push({
          id: `unpaid-existing-${Date.now()}`,
          productIds: selectedProducts.map(p => p.id),
          startDate: effectiveStartDate,
          endDate: addDays(effectiveStartDate, 1), // 1 day period for unpaid amount
          amount: existingRentalData.currentUnpaidAmount,
          paymentMethod: 'CASH',
          isGapPeriod: true,
          gapReason: 'OTHER',
          notes: 'Montant impayé existant à régulariser'
        });
      }

      // Handle existing CNAM coverage
      if (existingRentalData?.isExistingRental && existingRentalData.hasActiveCnam && existingRentalData.cnamExpirationDate) {
        const cnamEndDate = existingRentalData.cnamExpirationDate;
        
        // If CNAM expires before rental end, create gap after expiration
        if (cnamEndDate < endDate) {
          initialPeriods.push({
            id: `gap-cnam-expired-${Date.now()}`,
            productIds: selectedProducts.map(p => p.id),
            startDate: addDays(cnamEndDate, 1),
            endDate: endDate,
            amount: totalCost * Math.ceil((endDate.getTime() - cnamEndDate.getTime()) / (1000 * 60 * 60 * 24)),
            paymentMethod: 'CASH',
            isGapPeriod: true,
            gapReason: 'CNAM_EXPIRED',
            notes: 'Période après expiration CNAM'
          });
        }
      } else {
        // New rental logic
        initialPeriods.push({
          id: `period-${Date.now()}`,
          productIds: selectedProducts.map(p => p.id),
          startDate: effectiveStartDate,
          endDate,
          amount: totalCost,
          paymentMethod: selectedClient?.cnamId ? 'CNAM' : 'CASH',
          isGapPeriod: false,
          notes: ''
        });

        // If CNAM client, create potential gap periods for NEW rentals only
        if (selectedClient?.cnamId && !existingRentalData?.isExistingRental) {
          // Gap before CNAM approval (if urgent rental)
          if (rentalDetails.urgentRental) {
            initialPeriods.unshift({
              id: `gap-pre-${Date.now()}`,
              productIds: selectedProducts.map(p => p.id),
              startDate: effectiveStartDate,
              endDate: addDays(effectiveStartDate, 7), // Estimated 7 days for CNAM approval
              amount: totalCost * 7, // 7 days worth (totalCost is already daily)
              paymentMethod: 'CASH',
              isGapPeriod: true,
              gapReason: 'CNAM_PENDING',
              notes: 'Période avant approbation CNAM'
            });
          }
        }
      }

      setPaymentPeriods(initialPeriods);
      if (initialPeriods.length > 0) {
        setActivePaymentPeriod(initialPeriods[0].id);
      }
    }
  }, [rentalDetails, selectedClient, selectedProducts, existingRentalData]);

  // Handle tab change and track visited tabs
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setVisitedTabs(prev => new Set([...prev, newTab]));
  };

  // Check if all required tabs have been visited
  const requiredTabs = ['cnam', 'periods', 'deposit', 'summary'];
  const allTabsVisited = requiredTabs.every(tab => visitedTabs.has(tab));

  // Get next tab in sequence
  const getNextTab = () => {
    const tabOrder = ['cnam', 'periods', 'deposit', 'summary'];
    const currentIndex = tabOrder.indexOf(activeTab);
    return currentIndex < tabOrder.length - 1 ? tabOrder[currentIndex + 1] : null;
  };

  const handleContinue = () => {
    const nextTab = getNextTab();
    
    if (nextTab) {
      // Navigate to next tab
      handleTabChange(nextTab);
      return;
    }
    
    // If on summary tab, proceed with validation and submission
    if (activeTab === 'summary') {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    // Check if all tabs have been visited
    if (!allTabsVisited) {
      const unvisitedTabs = requiredTabs.filter(tab => !visitedTabs.has(tab));
      const tabNames = {
        'cnam': 'Bonds CNAM',
        'periods': 'Paiements',
        'deposit': 'Caution',
        'summary': 'Récapitulatif'
      };
      
      toast({
        title: "Sections non visitées",
        description: `Veuillez consulter: ${unvisitedTabs.map(tab => tabNames[tab as keyof typeof tabNames]).join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    // Validation
    if (!paymentPeriods || paymentPeriods.length === 0) {
      toast({
        title: "Périodes de paiement requises",
        description: "Veuillez configurer au moins une période de paiement",
        variant: "destructive"
      });
      return;
    }
    
    // Validate that all payment periods have valid amounts
    const invalidPeriods = paymentPeriods.filter(period => !period.amount || period.amount <= 0);
    if (invalidPeriods.length > 0) {
      toast({
        title: "Montants invalides",
        description: "Toutes les périodes de paiement doivent avoir un montant supérieur à 0",
        variant: "destructive"
      });
      return;
    }
    
    const paymentData: PaymentData = {
      paymentPeriods,
      cnamBonds,
      depositAmount,
      depositMethod,
      totalAmount: calculateTotalPaymentAmount(paymentPeriods, depositAmount),
      notes: paymentNotes,
      gaps: [], // Empty since gaps analysis was removed
      upcomingAlerts: [], // Empty since alerts were removed
      patientStatus,
      cnamEligible: selectedClient?.cnamId ? true : false,
      autoCalculatedGaps: false, // Set to false since gaps tab was removed
      isRental: true
    };

    onComplete(paymentData);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">
            Gestion des Paiements de Location
          </h2>
          <div className="text-sm text-gray-600">
            Sections visitées: {visitedTabs.size}/{requiredTabs.length}
            {allTabsVisited && (
              <span className="ml-2 text-green-600 font-medium">✓ Toutes visitées</span>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">

      {/* CNAM Bond Validation Warnings */}
      {invalidCnamBonds.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Problèmes de Couverture CNAM ({invalidCnamBonds.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invalidCnamBonds.map((cv, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <Badge variant="destructive">
                    {cv.bond.bondType}
                  </Badge>
                  <span className="text-red-700">{cv.validation.reason}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-red-600">
              <strong>Impact:</strong> Les périodes non couvertes par CNAM seront à la charge du patient.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Gaps Analysis */}
      {paymentGaps.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Analyse des Gaps ({paymentGaps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {paymentGaps.map((gap, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <Badge variant={gap.type === 'cnam_expiring' ? 'destructive' : 'secondary'}>
                    {gap.type === 'cnam_expiring' ? 'CNAM' : 'Gap'}
                  </Badge>
                  <span>{gap.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Duplicate Periods Warning */}
      {hasPotentialDuplicates() && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Périodes Dupliquées Détectées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-orange-700">
              Certaines périodes de paiement semblent être dupliquées (mêmes dates, montants et type).
            </div>
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemoveDuplicates}
                className="bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200"
              >
                <X className="h-4 w-4 mr-2" />
                Supprimer les doublons
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cnam" className="relative">
            Bonds CNAM
            {visitedTabs.has('cnam') && (
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full"></div>
            )}
          </TabsTrigger>
          <TabsTrigger value="periods" className="relative">
            Paiements
            {visitedTabs.has('periods') && (
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full"></div>
            )}
          </TabsTrigger>
          <TabsTrigger value="deposit" className="relative">
            Caution
            {visitedTabs.has('deposit') && (
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full"></div>
            )}
          </TabsTrigger>
          <TabsTrigger value="summary" className="relative">
            Récapitulatif
            {visitedTabs.has('summary') && (
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full"></div>
            )}
          </TabsTrigger>
        </TabsList>

        {/* CNAM Bonds de Location Tab */}
        <TabsContent value="cnam" className="space-y-4">
          <CNAMBondsTab
            cnamBonds={cnamBonds}
            setCnamBonds={setCnamBonds}
            activeCnamBond={activeCnamBond}
            setActiveCnamBond={setActiveCnamBond}
            selectedClient={selectedClient}
            selectedProducts={selectedProducts}
            onAutoGeneratePaymentPeriods={handleAutoGeneratePaymentPeriods}
            onRemoveDuplicates={handleRemoveDuplicates}
            paymentPeriodsCount={paymentPeriods.length}
          />
        </TabsContent>

        <TabsContent value="periods" className="space-y-4">
          <PaymentPeriodsTab
            paymentPeriods={paymentPeriods}
            setPaymentPeriods={setPaymentPeriods}
            activePaymentPeriod={activePaymentPeriod}
            setActivePaymentPeriod={setActivePaymentPeriod}
            selectedClient={selectedClient}
            selectedProducts={selectedProducts}
            calculateTotal={calculateTotal}
          />
        </TabsContent>


        <TabsContent value="deposit" className="space-y-4">
          <DepositTab
            depositAmount={depositAmount}
            setDepositAmount={setDepositAmount}
            depositMethod={depositMethod}
            setDepositMethod={setDepositMethod}
          />
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <SummaryTab
            cnamBonds={cnamBonds}
            paymentPeriods={paymentPeriods}
            comprehensiveGaps={[]} // Empty array since gaps analysis was removed
            depositAmount={depositAmount}
            depositMethod={depositMethod}
            patientStatus={patientStatus}
            paymentNotes={paymentNotes}
            setPaymentNotes={setPaymentNotes}
            calculateTotalPaymentAmount={() => calculateTotalPaymentAmount(paymentPeriods, depositAmount)}
            rentalDetails={rentalDetails}
            selectedProducts={selectedProducts}
            calculateTotal={calculateTotal}
          />
        </TabsContent>
      </Tabs>
      </div>

      {/* Navigation - Fixed at bottom */}
      <div className="flex-shrink-0 flex justify-between pt-4 border-t bg-white">
        <Button type="button" variant="outline" onClick={onBack}>
          ← Retour
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={
            isSubmitting || 
            paymentPeriods.length === 0 || 
            (activeTab === 'summary' && !allTabsVisited)
          }
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Traitement...
            </>
          ) : (() => {
            const nextTab = getNextTab();
            const tabNames = {
              'periods': 'Paiements',
              'deposit': 'Caution',
              'summary': 'Récapitulatif'
            };
            
            if (nextTab) {
              return `Continuer vers ${tabNames[nextTab as keyof typeof tabNames]} →`;
            } else if (activeTab === 'summary') {
              return allTabsVisited ? "Terminer le paiement →" : "Visiter toutes les sections d'abord";
            }
            return "Continuer →";
          })()}
        </Button>
      </div>
    </div>
  );
}