import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { History, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PatientHistoryProps {
  history: any[];
  isLoading?: boolean;
}

export const PatientHistory = ({ history = [], isLoading = false }: PatientHistoryProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'DIAGNOSTIC':
        return 'bg-purple-100 text-purple-800';
      case 'RENTAL':
        return 'bg-amber-100 text-amber-800';
      case 'PAYMENT':
        return 'bg-indigo-100 text-indigo-800';
      case 'SALE':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    const actionLabels: Record<string, string> = {
      'CREATE': 'Création',
      'UPDATE': 'Mise à jour',
      'DELETE': 'Suppression',
      'DIAGNOSTIC': 'Diagnostic',
      'RENTAL': 'Location',
      'PAYMENT': 'Paiement',
      'SALE': 'Vente',
    };
    return actionLabels[actionType] || actionType;
  };

  const renderDeviceReplacementDetails = (details: any) => {
    if (!details || details.action !== 'DEVICE_REPLACEMENT') return null;

    return (
      <div className="bg-gray-50 p-4 rounded-lg space-y-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Old Device */}
          <div className="bg-white p-3 rounded border border-red-200">
            <h4 className="font-semibold text-red-700 mb-2">Ancien Appareil</h4>
            <div className="space-y-1 text-gray-700">
              <p><span className="font-medium">Nom:</span> {details.oldDevice?.name}</p>
              {details.oldDevice?.deviceCode && (
                <p><span className="font-medium">Code:</span> {details.oldDevice.deviceCode}</p>
              )}
              {details.oldDevice?.serialNumber && (
                <p><span className="font-medium">Numéro de série:</span> {details.oldDevice.serialNumber}</p>
              )}
              {details.oldDevice?.brand && (
                <p><span className="font-medium">Marque:</span> {details.oldDevice.brand}</p>
              )}
              {details.oldDevice?.model && (
                <p><span className="font-medium">Modèle:</span> {details.oldDevice.model}</p>
              )}
              {details.oldDevice?.stockLocationName && (
                <p><span className="font-medium">Emplacement d'origine:</span> {details.oldDevice.stockLocationName}</p>
              )}
              {details.oldDevice?.returnedToLocationName && (
                <p className="text-green-700 font-medium">
                  <span className="font-semibold">→ Retourné à:</span> {details.oldDevice.returnedToLocationName}
                </p>
              )}
            </div>
          </div>

          {/* New Device */}
          <div className="bg-white p-3 rounded border border-green-200">
            <h4 className="font-semibold text-green-700 mb-2">Nouveau Appareil</h4>
            <div className="space-y-1 text-gray-700">
              <p><span className="font-medium">Nom:</span> {details.newDevice?.name}</p>
              {details.newDevice?.deviceCode && (
                <p><span className="font-medium">Code:</span> {details.newDevice.deviceCode}</p>
              )}
              {details.newDevice?.serialNumber && (
                <p><span className="font-medium">Numéro de série:</span> {details.newDevice.serialNumber}</p>
              )}
              {details.newDevice?.brand && (
                <p><span className="font-medium">Marque:</span> {details.newDevice.brand}</p>
              )}
              {details.newDevice?.model && (
                <p><span className="font-medium">Modèle:</span> {details.newDevice.model}</p>
              )}
              {details.newDevice?.stockLocationName && (
                <p><span className="font-medium">Emplacement:</span> {details.newDevice.stockLocationName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Rental Period with Old Device */}
        {details.rentalPeriodWithOldDevice && (
          <div className="bg-blue-50 p-3 rounded">
            <h4 className="font-semibold text-blue-700 mb-2">Période avec l'ancien appareil</h4>
            <div className="space-y-1 text-gray-700">
              <p><span className="font-medium">Début:</span> {new Date(details.rentalPeriodWithOldDevice.startDate).toLocaleDateString('fr-FR')}</p>
              <p><span className="font-medium">Remplacement:</span> {new Date(details.rentalPeriodWithOldDevice.replacementDate).toLocaleDateString('fr-FR')}</p>
              <p><span className="font-medium">Durée:</span> {details.rentalPeriodWithOldDevice.daysUsed} jours</p>
            </div>
          </div>
        )}

        {/* Replacement Reason */}
        {details.replacementReason && (
          <div className="bg-yellow-50 p-3 rounded">
            <h4 className="font-semibold text-yellow-700 mb-2">Raison du remplacement</h4>
            <p className="text-gray-700">{details.replacementReason}</p>
          </div>
        )}

        {/* Old Configuration */}
        {details.oldConfiguration && (
          <div className="bg-purple-50 p-3 rounded">
            <h4 className="font-semibold text-purple-700 mb-2">Configuration précédente</h4>
            <div className="space-y-1 text-gray-700">
              {details.oldConfiguration.rentalRate && (
                <p><span className="font-medium">Tarif:</span> {details.oldConfiguration.rentalRate} DT / {details.oldConfiguration.billingCycle}</p>
              )}
              {details.oldConfiguration.cnamEligible !== undefined && (
                <p><span className="font-medium">Éligible CNAM:</span> {details.oldConfiguration.cnamEligible ? 'Oui' : 'Non'}</p>
              )}
            </div>
          </div>
        )}

        {/* Rental Code and User Info */}
        <div className="text-xs text-gray-500 space-y-1">
          {details.rentalCode && (
            <p><span className="font-medium">Code de location:</span> {details.rentalCode}</p>
          )}
          {details.replacedBy?.role && (
            <p><span className="font-medium">Rôle de l'utilisateur:</span> {details.replacedBy.role === 'EMPLOYEE' ? 'Employé' : 'Administrateur'}</p>
          )}
        </div>
      </div>
    );
  };

  const getDescription = (item: any) => {
    // Check if this is a device replacement
    if (item.details?.action === 'DEVICE_REPLACEMENT') {
      return 'Remplacement d\'appareil médical';
    }

    // Default descriptions
    return item.details?.description || item.description || (
      item.actionType === 'SALE' ? 'Vente créée' :
      item.actionType === 'RENTAL' ? 'Location créée' :
      item.actionType === 'DIAGNOSTIC' ? 'Diagnostic effectué' :
      item.actionType === 'PAYMENT' ? 'Paiement reçu' :
      item.actionType === 'UPDATE' ? 'Mise à jour des informations' :
      item.actionType === 'CREATE' ? 'Patient créé' :
      'Action effectuée'
    );
  };

  const hasExpandableDetails = (item: any) => {
    return item.details?.action === 'DEVICE_REPLACEMENT';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-blue-500" />
          Historique du patient
        </CardTitle>
        <CardDescription>
          Toutes les actions liées à ce patient
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : history.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Effectué par</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item, index) => (
                  <React.Fragment key={index}>
                    <TableRow className={hasExpandableDetails(item) ? 'cursor-pointer hover:bg-gray-50' : ''}>
                      <TableCell>
                        {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionTypeColor(item.actionType)}>{getActionTypeLabel(item.actionType)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-between">
                          <span>{getDescription(item)}</span>
                          {hasExpandableDetails(item) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRow(index)}
                              className="ml-2"
                            >
                              {expandedRows.has(index) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.performedBy?.name || 'Système'}</TableCell>
                    </TableRow>
                    {expandedRows.has(index) && hasExpandableDetails(item) && (
                      <TableRow>
                        <TableCell colSpan={4} className="bg-gray-50">
                          {renderDeviceReplacementDetails(item.details)}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>Aucun historique disponible pour ce patient</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientHistory;
