import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Package, 
  MapPin, 
  Phone, 
  User, 
  Building2,
  Shield,
  Edit,
  Save,
  X,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  CalendarRange,
  FileText,
  Activity
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DatePicker } from '@/components/ui/date-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmployeeRentalOverviewProps {
  rental: any;
  onUpdate?: (data: any) => void;
  onNavigateToTab?: (tab: string) => void;
}

export default function EmployeeRentalOverview({ 
  rental, 
  onUpdate, 
  onNavigateToTab 
}: EmployeeRentalOverviewProps) {
  
  const [isEditing, setIsEditing] = useState(false);
  
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Non défini';
    try {
      return format(new Date(date), 'PPP', { locale: fr });
    } catch (error) {
      return 'Date invalide';
    }
  };

  // Device type detection
  const detectDeviceType = (deviceName: string): string => {
    if (!deviceName) return 'MEDICAL_DEVICE';
    
    const searchText = deviceName.toLowerCase();
    
    if (searchText.includes('cpap') || 
        searchText.includes('pression positive continue')) {
      return 'CPAP';
    }
    
    if (searchText.includes('vni') ||
        searchText.includes('ventil') ||
        searchText.includes('bi-level') ||
        searchText.includes('bipap') ||
        searchText.includes('vi') ||
        searchText.includes('yuwell')) {
      return 'VNI';
    }
    
    if (searchText.includes('concentrateur') || 
        searchText.includes('oxygène') ||
        searchText.includes('oxygen') ||
        searchText.includes('o2') ||
        searchText.includes('invacare') ||
        searchText.includes('philips') ||
        searchText.includes('devilbiss')) {
      return 'O2';
    }
    
    return 'MEDICAL_DEVICE';
  };

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

  // Basic operational summary (no sensitive financial data)
  const operationalSummary = useMemo(() => {
    const totalDays = rental.rentalPeriods?.reduce((sum: number, period: any) => {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }, 0) || 0;
    
    const cnamPeriods = rental.rentalPeriods?.filter((period: any) => 
      period.paymentMethod === 'CNAM' && !period.isGapPeriod
    ).length || 0;
    
    const gapPeriods = rental.rentalPeriods?.filter((period: any) => 
      period.isGapPeriod
    ).length || 0;
    
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
      totalDays,
      cnamPeriods,
      gapPeriods,
      cnamDays,
      timeCoveragePercentage
    };
  }, [rental]);

  const handleEdit = () => {
    setIsEditing(true);
  };

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Actif</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">En attente</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Terminé</Badge>;
      case 'SUSPENDED':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Suspendu</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Client Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {rental.patient ? (
              <>
                <User className="h-5 w-5 text-blue-600" />
                Informations Patient
              </>
            ) : (
              <>
                <Building2 className="h-5 w-5 text-blue-600" />
                Informations Société
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rental.patient ? (
              <>
                <div>
                  <div className="text-sm font-medium text-gray-500">Nom Complet</div>
                  <div className="text-base font-semibold">
                    {rental.patient.firstName} {rental.patient.lastName}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Téléphone</div>
                  <div className="text-base font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {rental.patient.telephone}
                  </div>
                </div>
                {rental.patient.patientCode && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">Code Patient</div>
                    <Badge variant="secondary">{rental.patient.patientCode}</Badge>
                  </div>
                )}
                {rental.patient.cnamId && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">CNAM ID</div>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      {rental.patient.cnamId}
                    </Badge>
                  </div>
                )}
                {rental.patient.detailedAddress && (
                  <div className="col-span-full">
                    <div className="text-sm font-medium text-gray-500">Adresse</div>
                    <div className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      {rental.patient.detailedAddress}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <div className="text-sm font-medium text-gray-500">Nom de l'Entreprise</div>
                  <div className="text-base font-semibold">{rental.company?.companyName}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Contact</div>
                  <div className="text-base font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {rental.company?.telephone}
                  </div>
                </div>
                {rental.company?.address && (
                  <div className="col-span-full">
                    <div className="text-sm font-medium text-gray-500">Adresse</div>
                    <div className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      {rental.company.address}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Equipment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Équipement Loué
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <div className="text-sm font-medium text-gray-500">Nom de l'Appareil</div>
              <div className="text-base font-semibold">{rental.medicalDevice?.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Type d'Équipement</div>
              <Badge variant="outline" className="w-fit">
                {getDeviceTypeLabel(detectDeviceType(rental.medicalDevice?.name || ''))}
              </Badge>
            </div>
            {rental.medicalDevice?.brand && (
              <div>
                <div className="text-sm font-medium text-gray-500">Marque</div>
                <div className="text-base font-semibold">{rental.medicalDevice.brand}</div>
              </div>
            )}
            {rental.medicalDevice?.model && (
              <div>
                <div className="text-sm font-medium text-gray-500">Modèle</div>
                <div className="text-base font-semibold">{rental.medicalDevice.model}</div>
              </div>
            )}
            {rental.medicalDevice?.serialNumber && (
              <div>
                <div className="text-sm font-medium text-gray-500">Numéro de Série</div>
                <Badge variant="outline">{rental.medicalDevice.serialNumber}</Badge>
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-gray-500">Statut de l'Équipement</div>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                {rental.medicalDevice?.status || 'ACTIVE'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rental Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-blue-600" />
            Informations de Location
          </CardTitle>
          <div className="flex gap-2">
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            )}
            {isEditing && (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Date de Début</div>
                {isEditing ? (
                  <DatePicker
                    value={editData.startDate || undefined}
                    onChange={(date) => setEditData({ ...editData, startDate: date || null })}
                  />
                ) : (
                  <div className="text-base font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {formatDate(rental.startDate)}
                  </div>
                )}
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500">Date de Fin</div>
                {isEditing ? (
                  <DatePicker
                    value={editData.endDate || undefined}
                    onChange={(date) => setEditData({ ...editData, endDate: date || null })}
                  />
                ) : (
                  <div className="text-base font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {rental.endDate ? formatDate(rental.endDate) : (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        Location ouverte
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Statut</div>
                {isEditing ? (
                  <Select value={editData.status} onValueChange={(value) => setEditData({ ...editData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Actif</SelectItem>
                      <SelectItem value="PENDING">En attente</SelectItem>
                      <SelectItem value="SUSPENDED">Suspendu</SelectItem>
                      <SelectItem value="COMPLETED">Terminé</SelectItem>
                      <SelectItem value="CANCELLED">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  getStatusBadge(rental.status)
                )}
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500">Durée Total</div>
                <div className="text-base font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {operationalSummary.totalDays} jours
                </div>
              </div>
            </div>
            
            <div className="col-span-full">
              <div className="text-sm font-medium text-gray-500">Notes</div>
              {isEditing ? (
                <Textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="Ajouter des notes sur cette location..."
                  rows={3}
                />
              ) : (
                <div className="text-base">
                  {rental.notes || (
                    <span className="text-gray-400 italic">Aucune note ajoutée</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operational Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Résumé Opérationnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600">Périodes Totales</div>
              <div className="text-2xl font-bold text-blue-800">
                {rental.rentalPeriods?.length || 0}
              </div>
              <div className="text-xs text-blue-700">{operationalSummary.totalDays} jours</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600">Périodes CNAM</div>
              <div className="text-2xl font-bold text-green-800">
                {operationalSummary.cnamPeriods}
              </div>
              <div className="text-xs text-green-700">{operationalSummary.cnamDays} jours</div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-orange-600">Périodes Gap</div>
              <div className="text-2xl font-bold text-orange-800">
                {operationalSummary.gapPeriods}
              </div>
              <div className="text-xs text-orange-700">
                {operationalSummary.totalDays - operationalSummary.cnamDays} jours
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600">Couverture CNAM</div>
              <div className="text-2xl font-bold text-purple-800">
                {operationalSummary.timeCoveragePercentage.toFixed(1)}%
              </div>
              <div className="text-xs text-purple-700">Couverture temporelle</div>
            </div>
          </div>

          {/* CNAM Coverage Progress */}
          {operationalSummary.timeCoveragePercentage > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Couverture CNAM (Temps)</span>
                <span className="font-medium">
                  {operationalSummary.timeCoveragePercentage.toFixed(1)}% 
                  <span className="text-xs text-gray-500 ml-1">
                    ({operationalSummary.cnamDays}/{operationalSummary.totalDays} jours)
                  </span>
                </span>
              </div>
              <Progress value={operationalSummary.timeCoveragePercentage} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Configuration & Statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">CNAM Éligible</span>
                {rental.configuration?.cnamEligible ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <Shield className="h-3 w-3 mr-1" />
                    Oui
                  </Badge>
                ) : (
                  <Badge variant="outline">Non</Badge>
                )}
              </div>
              
              {rental.accessories?.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Accessoires</span>
                  <Badge variant="outline">{rental.accessories.length} Accessoire{rental.accessories.length > 1 ? 's' : ''}</Badge>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Créé le</span>
                <div className="font-medium">{formatDate(rental.createdAt)}</div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Modifié le</span>
                <div className="font-medium">{formatDate(rental.updatedAt)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Actions Rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => onNavigateToTab?.('configuration')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurer la Location
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => onNavigateToTab?.('periods')}
              >
                <CalendarRange className="h-4 w-4 mr-2" />
                Gérer les Périodes
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => onNavigateToTab?.('gap-analysis')}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Analyser les Gaps
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => onNavigateToTab?.('parameters')}
              >
                <Package className="h-4 w-4 mr-2" />
                Paramètres de l'Équipement
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}