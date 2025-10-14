import React, { useState } from 'react';
import { format } from 'date-fns';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';

interface EnhancedRentalOverviewProps {
  rental: any;
  onUpdate?: (updatedData: any) => void;
}

export default function EnhancedRentalOverview({ rental, onUpdate }: EnhancedRentalOverviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    startDate: rental.startDate ? new Date(rental.startDate) : null,
    endDate: rental.endDate ? new Date(rental.endDate) : null,
    notes: rental.notes || '',
    status: rental.status || 'ACTIVE',
  });

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

  const clientName = rental.patient 
    ? `${rental.patient.firstName} ${rental.patient.lastName}`
    : rental.company?.companyName || "Client inconnu";

  const clientType = rental.patient ? "patient" : "company";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Client Information */}
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
            <div>
              <div className="font-medium text-lg">{clientName}</div>
              <div className="text-sm text-gray-600">
                {clientType === "patient" ? "Patient" : "Entreprise"}
              </div>
              {rental.patient?.cnamId && (
                <div className="text-sm text-blue-600 mt-1">
                  CNAM: {rental.patient.cnamId}
                </div>
              )}
              {rental.patient?.telephone && (
                <div className="text-sm text-gray-600 mt-1">
                  Tél: {rental.patient.telephone}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Appareil Médical</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-blue-600 mt-1" />
            <div className="flex-1">
              <div className="font-medium text-lg">{rental.medicalDevice?.name || "Appareil inconnu"}</div>
              <div className="text-sm text-gray-600">{rental.medicalDevice?.type || "Type inconnu"}</div>
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
            </div>
          </div>
          
          {/* Accessories Section */}
          {rental.accessories && rental.accessories.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm font-medium text-gray-700 mb-2">Accessoires inclus:</div>
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

      {/* Rental Period */}
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

      {/* Summary Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Résumé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          
          {rental.configuration?.urgentRental && (
            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Location Urgente
            </Badge>
          )}
          
          {rental.configuration?.totalPaymentAmount && (
            <div>
              <div className="text-sm text-gray-600">Montant Total</div>
              <div className="font-medium text-lg text-blue-600">
                {rental.configuration.totalPaymentAmount} TND
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}