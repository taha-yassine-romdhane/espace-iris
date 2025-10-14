import React, { useState, useMemo } from 'react';
import { format, differenceInDays, addDays, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CalendarIcon,
  Building2,
  User,
  Edit,
  Save,
  X,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle,
  Shield,
  CreditCard,
  TrendingUp,
  MapPin,
  Phone,
  FileText,
  Settings,
  Zap,
  Target,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';

interface ComprehensiveRentalOverviewProps {
  rental: any;
  onUpdate?: (updatedData: any) => void;
  onNavigateToTab?: (tab: string) => void;
}

export default function ComprehensiveRentalOverview({ 
  rental, 
  onUpdate,
  onNavigateToTab 
}: ComprehensiveRentalOverviewProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Device type detection function
  const detectDeviceType = (deviceName: string = ''): string => {
    const searchText = deviceName.toLowerCase().trim();
    
    // CPAP detection patterns
    if (searchText.includes('cpap') || 
        searchText.includes('airstart') || 
        searchText.includes('airsense') ||
        searchText.includes('aircurve') ||
        searchText.includes('resmed') ||
        searchText.includes('philips dreamstation')) {
      return 'CPAP';
    }
    
    // VNI detection patterns (including "Vi" devices)
    if (searchText.includes('vni') || 
        searchText.includes('bipap') ||
        searchText.includes('trilogy') ||
        searchText.includes('stellar') ||
        searchText.includes('ventilateur') ||
        searchText === 'vi' ||
        searchText.startsWith('vi ') ||
        searchText.includes(' vi ') ||
        searchText.endsWith(' vi')) {
      return 'VNI';
    }
    
    // Oxygen therapy detection
    if (searchText.includes('o2') || 
        searchText.includes('oxygen') ||
        searchText.includes('concentrateur') ||
        searchText.includes('invacare') ||
        searchText.includes('philips everflo') ||
        searchText.includes('devilbiss')) {
      return 'O2';
    }
    
    // Nebulizers and respiratory therapy
    if (searchText.includes('nebulizer') || 
        searchText.includes('nebuliseur') ||
        searchText.includes('aerosol') ||
        searchText.includes('omron') ||
        searchText.includes('pari')) {
      return 'NEBULIZER';
    }
    
    // Diagnostic devices
    if (searchText.includes('polygraph') || 
        searchText.includes('polysomnograph') ||
        searchText.includes('diagnostic') ||
        searchText.includes('sleep study') ||
        searchText.includes('alice') ||
        searchText.includes('embletta')) {
      return 'DIAGNOSTIC';
    }
    
    // Default fallback
    return 'MEDICAL_DEVICE';
  };

  // Get display label for device type
  const getDeviceTypeLabel = (deviceType: string): string => {
    switch (deviceType) {
      case 'CPAP':
        return 'CPAP (Pression Positive Continue)';
      case 'VNI':
        return 'VNI (Ventilation Non Invasive)';
      case 'O2':
        return 'Oxygénothérapie';
      case 'NEBULIZER':
        return 'Nébuliseur';
      case 'DIAGNOSTIC':
        return 'Appareil Diagnostique';
      case 'MEDICAL_DEVICE':
        return 'Appareil Médical';
      default:
        return deviceType || 'Type inconnu';
    }
  };
  const [editData, setEditData] = useState({
    startDate: rental.startDate ? new Date(rental.startDate) : null,
    endDate: rental.endDate ? new Date(rental.endDate) : null,
    notes: rental.notes || '',
    status: rental.status || 'ACTIVE',
  });

  // Financial calculations
  const financialSummary = useMemo(() => {
    // CNAM amount from periods (not bonds, as bonds are just declarations)
    const cnamPeriodsAmount = rental.rentalPeriods?.reduce((sum: number, period: any) => {
      if (period.paymentMethod === 'CNAM' && !period.isGapPeriod) {
        return sum + (parseFloat(period.amount) || 0);
      }
      return sum;
    }, 0) || 0;
    
    // Total CNAM bonds amount (for reference)
    const cnamBondsAmount = rental.cnamBonds?.reduce((sum: number, bond: any) => 
      sum + (parseFloat(bond.totalAmount) || 0), 0) || 0;
    
    // Get deposit amount from payment or configuration
    let depositAmount = parseFloat(rental.configuration?.depositAmount) || 0;
    if (depositAmount === 0 && rental.payment?.isDepositPayment) {
      depositAmount = parseFloat(rental.payment.amount) || 0;
    }
    
    // Calculate total from all rental periods (including gaps)
    const periodsAmount = rental.rentalPeriods?.reduce((sum: number, period: any) => 
      sum + (parseFloat(period.amount) || 0), 0) || 0;
    
    // Calculate only gap periods
    const gapAmount = rental.rentalPeriods?.reduce((sum: number, period: any) => 
      sum + (period.isGapPeriod ? (parseFloat(period.amount) || 0) : 0), 0) || 0;
    
    // Calculate patient payment (gaps + cash payments)
    const patientPeriodsAmount = rental.rentalPeriods?.reduce((sum: number, period: any) => {
      if (period.isGapPeriod || (period.paymentMethod !== 'CNAM')) {
        return sum + (parseFloat(period.amount) || 0);
      }
      return sum;
    }, 0) || 0;
    
    // Calculate coverage percentage based on total cost
    const totalCost = periodsAmount + depositAmount;
    const cnamCoveragePercentage = totalCost > 0 ? (cnamPeriodsAmount / totalCost) * 100 : 0;
    
    // Calculate time coverage percentage (days covered by CNAM)
    const totalDays = rental.rentalPeriods?.reduce((sum: number, period: any) => {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }, 0) || 0;
    
    const cnamDays = rental.rentalPeriods?.reduce((sum: number, period: any) => {
      if (period.paymentMethod === 'CNAM' && !period.isGapPeriod) {
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);
        return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }
      return sum;
    }, 0) || 0;
    
    const timeCoveragePercentage = totalDays > 0 ? (cnamDays / totalDays) * 100 : 0;
    
    return {
      cnamAmount: cnamPeriodsAmount,
      cnamBondsAmount,
      depositAmount,
      periodsAmount,
      gapAmount,
      patientPeriodsAmount,
      totalPatientPayment: depositAmount + patientPeriodsAmount,
      totalExpectedRevenue: periodsAmount + depositAmount,
      cnamCoveragePercentage,
      timeCoveragePercentage,
      totalDays,
      cnamDays
    };
  }, [rental]);

  // Gap analysis - Calculate actual coverage gaps
  const gapAnalysis = useMemo(() => {
    const rentalPeriods = rental.rentalPeriods || [];
    const gaps: any[] = [];
    const rentalStart = new Date(rental.startDate);
    const rentalEnd = rental.endDate ? new Date(rental.endDate) : null;
    
    if (rentalPeriods.length > 0 && rentalEnd) {
      const sortedPeriods = [...rentalPeriods]
        .filter(period => period.startDate && period.endDate && !period.isGapPeriod)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      
      let currentDate = rentalStart;
      
      // Gap before first rental period
      const firstPeriod = sortedPeriods[0];
      if (firstPeriod) {
        const firstPeriodStart = new Date(firstPeriod.startDate);
        const gapHours = (firstPeriodStart.getTime() - currentDate.getTime()) / (1000 * 60 * 60);
        
        if (gapHours > 1) { // Only gaps > 1 hour to avoid micro-gaps
          const gapDays = differenceInDays(firstPeriodStart, currentDate);
          gaps.push({
            type: 'coverage_gap',
            startDate: currentDate,
            endDate: new Date(firstPeriodStart.getTime() - 24 * 60 * 60 * 1000), // day before
            days: gapDays,
            amount: (parseFloat(firstPeriod.amount) / 30) * gapDays,
            severity: gapDays > 7 ? 'critical' : gapDays > 3 ? 'high' : 'medium'
          });
        }
        currentDate = new Date(firstPeriod.endDate);
      }
      
      // Gaps between rental periods
      for (let i = 1; i < sortedPeriods.length; i++) {
        const prevPeriodEnd = new Date(sortedPeriods[i - 1].endDate);
        const currentPeriodStart = new Date(sortedPeriods[i].startDate);
        const gapHours = (currentPeriodStart.getTime() - prevPeriodEnd.getTime()) / (1000 * 60 * 60);
        
        if (gapHours > 25) { // Gap > 1 day (accounting for day boundaries)
          const gapDays = differenceInDays(currentPeriodStart, prevPeriodEnd) - 1;
          if (gapDays > 0) {
            gaps.push({
              type: 'coverage_gap',
              startDate: new Date(prevPeriodEnd.getTime() + 24 * 60 * 60 * 1000), // day after
              endDate: new Date(currentPeriodStart.getTime() - 24 * 60 * 60 * 1000), // day before  
              days: gapDays,
              amount: (parseFloat(sortedPeriods[i].amount) / 30) * gapDays,
              severity: gapDays > 7 ? 'critical' : gapDays > 3 ? 'high' : 'medium'
            });
          }
        }
      }
      
      // Gap after last rental period
      const lastPeriod = sortedPeriods[sortedPeriods.length - 1];
      if (lastPeriod) {
        const lastPeriodEnd = new Date(lastPeriod.endDate);
        const gapHours = (rentalEnd.getTime() - lastPeriodEnd.getTime()) / (1000 * 60 * 60);
        
        if (gapHours > 25) { // Gap > 1 day
          const gapDays = differenceInDays(rentalEnd, lastPeriodEnd);
          gaps.push({
            type: 'coverage_gap',
            startDate: new Date(lastPeriodEnd.getTime() + 24 * 60 * 60 * 1000), // day after
            endDate: rentalEnd,
            days: gapDays,
            amount: (parseFloat(lastPeriod.amount) / 30) * gapDays,
            severity: gapDays > 7 ? 'critical' : gapDays > 3 ? 'high' : 'medium'
          });
        }
      }
    }
    
    const criticalGaps = gaps.filter((gap: any) => gap.severity === 'critical');
    
    return {
      totalGaps: gaps.length,
      criticalGaps: criticalGaps.length,
      gapDays: gaps.reduce((sum: number, gap: any) => sum + gap.days, 0),
      gapAmount: gaps.reduce((sum: number, gap: any) => sum + gap.amount, 0),
    };
  }, [rental]);

  // Important dates
  const importantDates = useMemo(() => {
    const dates: any[] = [];
    const today = new Date();
    
    // CNAM expiration warnings
    rental.cnamBonds?.forEach((bond: any) => {
      if (bond.endDate) {
        const endDate = new Date(bond.endDate);
        const daysUntil = differenceInDays(endDate, today);
        if (daysUntil <= 30 && daysUntil >= 0) {
          dates.push({
            date: endDate,
            type: 'cnam_expiry',
            description: `Expiration bon CNAM ${bond.bondType}`,
            priority: daysUntil <= 7 ? 'critical' : daysUntil <= 15 ? 'high' : 'medium',
            daysUntil,
          });
        }
      }
    });
    
    // Rental end date
    if (rental.endDate) {
      const endDate = new Date(rental.endDate);
      const daysUntil = differenceInDays(endDate, today);
      if (daysUntil <= 7 && daysUntil >= 0) {
        dates.push({
          date: endDate,
          type: 'rental_end',
          description: 'Fin de location prévue',
          priority: 'medium',
          daysUntil,
        });
      }
    }
    
    return dates.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [rental]);

  const handleSave = () => {
    onUpdate?.(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      startDate: rental.startDate ? new Date(rental.startDate) : null,
      endDate: rental.endDate ? new Date(rental.endDate) : null,
      notes: rental.notes || '',
      status: rental.status || 'ACTIVE',
    });
    setIsEditing(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'PPP', { locale: fr });
  };

  const calculateDuration = () => {
    if (!rental.startDate || !rental.endDate) return '-';
    const start = new Date(rental.startDate);
    const end = new Date(rental.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} jours`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Actif
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      case 'PAUSED':
        return (
          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Suspendu
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Terminé
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Annulé
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
            {status}
          </Badge>
        );
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  const clientName = rental.patient 
    ? `${rental.patient.firstName} ${rental.patient.lastName}`
    : rental.company?.companyName || "Client inconnu";

  const clientType = rental.patient ? "patient" : "company";

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {(gapAnalysis.criticalGaps > 0 || importantDates.some(d => d.priority === 'critical')) && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <div className="space-y-1">
              {gapAnalysis.criticalGaps > 0 && (
                <p><strong>Gaps critiques:</strong> {gapAnalysis.criticalGaps} période(s) à risque ({gapAnalysis.gapAmount.toFixed(2)} TND)</p>
              )}
              {importantDates.filter(d => d.priority === 'critical').map((date, i) => (
                <p key={i}><strong>Urgent:</strong> {date.description} dans {date.daysUntil} jour{date.daysUntil > 1 ? 's' : ''}</p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Information - Enhanced */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Informations Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              {clientType === "patient" ? (
                <User className="h-5 w-5 text-blue-600 mt-1" />
              ) : (
                <Building2 className="h-5 w-5 text-blue-600 mt-1" />
              )}
              <div className="flex-1">
                <div className="font-medium text-lg">{clientName}</div>
                <div className="text-sm text-gray-600">
                  {clientType === "patient" ? "Patient" : "Entreprise"}
                  {rental.patient?.patientCode && (
                    <span className="ml-2 text-blue-600 font-medium">
                      Code: {rental.patient.patientCode}
                    </span>
                  )}
                </div>
                {rental.patient?.cnamId && (
                  <div className="flex items-center gap-2 mt-1">
                    <Shield className="h-3 w-3 text-green-600" />
                    <span className="text-sm text-blue-600">CNAM: {rental.patient.cnamId}</span>
                  </div>
                )}
                {rental.patient?.telephone && (
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="h-3 w-3 text-gray-600" />
                    <span className="text-sm text-gray-600">{rental.patient.telephone}</span>
                  </div>
                )}
                {rental.patient?.address && (
                  <div className="flex items-start gap-2 mt-1">
                    <MapPin className="h-3 w-3 text-gray-600 mt-0.5" />
                    <span className="text-sm text-gray-600">{rental.patient.address}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device Information - Enhanced */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Appareil Médical</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-blue-600 mt-1" />
              <div className="flex-1">
                <div className="font-medium text-lg">{rental.medicalDevice?.name || "Appareil inconnu"}</div>
                <div className="text-sm text-gray-600">
                  {getDeviceTypeLabel(detectDeviceType(rental.medicalDevice?.name))}
                </div>
                {rental.medicalDevice?.serialNumber && (
                  <div className="text-sm text-gray-600">
                    Série: {rental.medicalDevice.serialNumber}
                  </div>
                )}
                {rental.medicalDevice?.rentalPrice && (
                  <div className="text-sm text-blue-600 font-medium mt-1">
                    {rental.medicalDevice.rentalPrice} TND/jour
                  </div>
                )}
                
                {/* Quick Parameter Access */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateToTab?.('parameters')}
                  className="mt-2 p-0 h-auto text-blue-600 hover:text-blue-800"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Voir paramètres
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
            
            {/* Accessories Section */}
            {rental.accessories && rental.accessories.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Accessoires inclus ({rental.accessories.length}):
                </div>
                <div className="space-y-2">
                  {rental.accessories.map((accessory: any, index: number) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        • {accessory.product?.name || `Accessoire ${accessory.productId}`} 
                        {accessory.quantity > 1 && ` (x${accessory.quantity})`}
                      </span>
                      <span className="text-gray-500">
                        {accessory.unitPrice > 0 ? `${accessory.unitPrice} TND/jour` : 'Inclus'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rental Period & Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Période de Location</CardTitle>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1"
              >
                <Edit className="h-3.5 w-3.5" />
                Modifier
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Date de début</Label>
                    <DatePicker
                      value={editData.startDate || undefined}
                      onChange={(date) => setEditData({ ...editData, startDate: date || null })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Date de fin</Label>
                    <DatePicker
                      value={editData.endDate || undefined}
                      onChange={(date) => setEditData({ ...editData, endDate: date || null })}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="status">Statut</Label>
                  <Select value={editData.status} onValueChange={(value) => setEditData({ ...editData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Actif</SelectItem>
                      <SelectItem value="PENDING">En attente</SelectItem>
                      <SelectItem value="PAUSED">Suspendu</SelectItem>
                      <SelectItem value="COMPLETED">Terminé</SelectItem>
                      <SelectItem value="CANCELLED">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={editData.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    rows={3}
                    placeholder="Ajouter des notes..."
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex items-center gap-1">
                    <Save className="h-3.5 w-3.5" />
                    Sauvegarder
                  </Button>
                  <Button variant="outline" onClick={handleCancel} className="flex items-center gap-1">
                    <X className="h-3.5 w-3.5" />
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-sm text-gray-600">Date de début</div>
                    <div className="font-medium">{formatDate(rental.startDate)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-red-600" />
                  <div>
                    <div className="text-sm text-gray-600">Date de fin</div>
                    <div className="font-medium">{rental.endDate ? formatDate(rental.endDate) : "Indéterminée"}</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600">Durée</div>
                  <div className="font-medium">{calculateDuration()}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Statut</div>
                  <div className="mt-1">{getStatusBadge(rental.status)}</div>
                </div>

                {rental.notes && (
                  <div>
                    <div className="text-sm text-gray-600">Notes</div>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm">{rental.notes}</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Configuration & Statut</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Configuration Badges */}
            <div className="flex flex-wrap gap-2">
              {rental.configuration?.urgentRental && (
                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Location Urgente
                </Badge>
              )}
              {rental.configuration?.isGlobalOpenEnded && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Durée Indéterminée
                </Badge>
              )}
              {rental.configuration?.cnamEligible && (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  <Shield className="h-3 w-3 mr-1" />
                  CNAM Éligible
                </Badge>
              )}
              {rental.accessories?.length > 0 && (
                <Badge variant="outline">
                  <Package className="h-3 w-3 mr-1" />
                  {rental.accessories.length} Accessoire{rental.accessories.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Créé le</div>
                <div className="font-medium">{formatDate(rental.createdAt)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Modifié le</div>
                <div className="font-medium">{formatDate(rental.updatedAt)}</div>
              </div>
            </div>

            {/* Coverage Indicator */}
            {(financialSummary.cnamCoveragePercentage > 0 || financialSummary.timeCoveragePercentage > 0) && (
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Couverture CNAM (Montant)</span>
                    <span className="font-medium">{financialSummary.cnamCoveragePercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={financialSummary.cnamCoveragePercentage} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Couverture CNAM (Temps)</span>
                    <span className="font-medium">
                      {financialSummary.timeCoveragePercentage.toFixed(1)}% 
                      <span className="text-xs text-gray-500 ml-1">
                        ({financialSummary.cnamDays}/{financialSummary.totalDays} jours)
                      </span>
                    </span>
                  </div>
                  <Progress value={financialSummary.timeCoveragePercentage} className="h-2 bg-blue-100" />
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateToTab?.('configuration')}
                className="text-blue-600 hover:text-blue-800"
              >
                <Settings className="h-3 w-3 mr-1" />
                Configuration
              </Button>
              {gapAnalysis.totalGaps > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateToTab?.('gap-analysis')}
                  className="text-orange-600 hover:text-orange-800"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Gaps ({gapAnalysis.totalGaps})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Résumé Financier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-green-600">Couverture CNAM</div>
              <div className="font-bold text-green-800">{financialSummary.cnamAmount.toFixed(2)} TND</div>
              {rental.cnamBonds?.length > 0 && (
                <div className="text-xs text-green-700">{rental.cnamBonds.length} bon{rental.cnamBonds.length > 1 ? 's' : ''}</div>
              )}
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-600">Contribution Patient</div>
              <div className="font-bold text-blue-800">{financialSummary.patientPeriodsAmount.toFixed(2)} TND</div>
              <div className="text-xs text-blue-700">
                {financialSummary.gapAmount > 0 && `Gaps: ${financialSummary.gapAmount.toFixed(2)} TND`}
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="text-sm text-orange-600">Gaps Détectés</div>
              <div className="font-bold text-orange-800">{gapAnalysis.gapAmount.toFixed(2)} TND</div>
              <div className="text-xs text-orange-700">{gapAnalysis.totalGaps} période{gapAnalysis.totalGaps > 1 ? 's' : ''}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Total Attendu</div>
              <div className="font-bold text-gray-800">{financialSummary.totalExpectedRevenue.toFixed(2)} TND</div>
              <div className="text-xs text-gray-700">Patient + CNAM</div>
            </div>
          </div>

          {/* Quick Financial Actions */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToTab?.('periods')}
              className="flex items-center gap-1"
            >
              <CalendarIcon className="h-3 w-3" />
              Gérer Périodes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToTab?.('auto-generation')}
              className="flex items-center gap-1"
            >
              <Zap className="h-3 w-3" />
              Auto-Génération
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Important Dates & Alerts */}
      {importantDates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Dates Importantes & Alertes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {importantDates.map((dateItem, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      dateItem.priority === 'critical' ? 'bg-red-500' : 
                      dateItem.priority === 'high' ? 'bg-orange-500' :
                      dateItem.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <div className="text-sm font-medium">
                        {format(dateItem.date, "dd MMMM yyyy", { locale: fr })}
                      </div>
                      <div className="text-sm text-gray-600">{dateItem.description}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={dateItem.priority === 'critical' ? 'destructive' : 'secondary'}>
                      {dateItem.daysUntil <= 0 ? 'Expiré' : `${dateItem.daysUntil} jour${dateItem.daysUntil > 1 ? 's' : ''}`}
                    </Badge>
                    {dateItem.type === 'cnam_expiry' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigateToTab?.('cnam')}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}