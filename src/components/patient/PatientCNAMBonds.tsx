import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface CNAMBond {
  id: string;
  bonNumber?: string;
  dossierNumber?: string;
  bonType: string;
  bonAmount: any;
  devicePrice: any;
  complementAmount: any;
  status: string;
  category: string;
  currentStep?: number;
  coveredMonths?: number;
  createdAt: Date | string;
  sourceType?: string;
  sourceCode?: string;
}

interface PatientCNAMBondsProps {
  cnamBonds: CNAMBond[];
  isLoading?: boolean;
}

export const PatientCNAMBonds = ({ cnamBonds = [], isLoading = false }: PatientCNAMBondsProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'TERMINE':
        return 'bg-green-100 text-green-800';
      case 'EN_COURS':
        return 'bg-blue-100 text-blue-800';
      case 'EN_ATTENTE':
        return 'bg-amber-100 text-amber-800';
      case 'REFUSE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'Approuvé';
      case 'EN_ATTENTE':
        return 'En attente';
      case 'EN_COURS':
        return 'En cours';
      case 'TERMINE':
        return 'Terminé';
      case 'REFUSE':
        return 'Refusé';
      default:
        return status;
    }
  };

  const getBonTypeLabel = (bonType: string) => {
    switch (bonType) {
      case 'CONCENTRATEUR_OXYGENE':
        return 'Concentrateur Oxygène';
      case 'VNI':
        return 'VNI';
      case 'CPAP':
        return 'CPAP';
      case 'MASQUE':
        return 'Masque';
      case 'AUTRE':
        return 'Autre';
      default:
        return bonType;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'VENTE':
        return 'Vente';
      case 'LOCATION':
        return 'Location';
      default:
        return category;
    }
  };

  const formatAmount = (amount: any) => {
    if (!amount) return '0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toFixed(2);
  };

  const getProgressPercentage = (currentStep?: number) => {
    if (!currentStep) return 0;
    return (currentStep / 7) * 100; // 7 steps total
  };

  const getProgressLabel = (currentStep?: number) => {
    switch (currentStep) {
      case 1:
        return 'En attente approbation CNAM';
      case 2:
        return 'Accord avec patient';
      case 3:
        return 'Documents reçus de CNAM';
      case 4:
        return 'Préparation appareil';
      case 5:
        return 'Livraison au Technicien';
      case 6:
        return 'Signature Médecin';
      case 7:
        return 'Livraison finale Admin';
      default:
        return 'Non démarré';
    }
  };

  const sortedBonds = [...cnamBonds].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          Bons CNAM
        </CardTitle>
        <CardDescription>
          Tous les bons CNAM associés à ce patient
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : sortedBonds.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Bon</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Montant CNAM</TableHead>
                  <TableHead>Prix Appareil</TableHead>
                  <TableHead>Complément</TableHead>
                  <TableHead>Mois Couverts</TableHead>
                  <TableHead>Progression</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date Création</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBonds.map((bond) => {
                  const createdDate = new Date(bond.createdAt);
                  const progressPercentage = getProgressPercentage(bond.currentStep);

                  return (
                    <TableRow key={bond.id}>
                      <TableCell className="font-mono text-xs font-medium">
                        {bond.bonNumber || bond.dossierNumber || <span className="text-gray-400 italic">Non défini</span>}
                      </TableCell>
                      <TableCell>
                        {bond.sourceType && bond.sourceCode ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge
                              variant="outline"
                              className={bond.sourceType === 'Location' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'}
                            >
                              {bond.sourceType}
                            </Badge>
                            <span className="text-xs text-gray-500 font-mono">{bond.sourceCode}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getBonTypeLabel(bond.bonType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={bond.category === 'LOCATION' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}
                        >
                          {getCategoryLabel(bond.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-blue-600">
                        {formatAmount(bond.bonAmount)} DT
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatAmount(bond.devicePrice)} DT
                      </TableCell>
                      <TableCell className="font-semibold text-amber-600">
                        {formatAmount(bond.complementAmount)} DT
                      </TableCell>
                      <TableCell className="text-center">
                        {bond.coveredMonths || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[200px]">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-600">Étape {bond.currentStep || 0}/7</span>
                            <span className="font-medium">{Math.round(progressPercentage)}%</span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                          <p className="text-[10px] text-gray-500 truncate">
                            {getProgressLabel(bond.currentStep)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(bond.status)}>
                          {getStatusLabel(bond.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {createdDate.toLocaleDateString('fr-FR')}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Summary */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Bons</p>
                <p className="text-2xl font-bold text-gray-900">{sortedBonds.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Montant Total CNAM</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatAmount(
                    sortedBonds.reduce((sum, bond) => {
                      const amount = typeof bond.bonAmount === 'string' ? parseFloat(bond.bonAmount) : bond.bonAmount;
                      return sum + (amount || 0);
                    }, 0)
                  )} DT
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Complément Total</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatAmount(
                    sortedBonds.reduce((sum, bond) => {
                      const amount = typeof bond.complementAmount === 'string' ? parseFloat(bond.complementAmount) : bond.complementAmount;
                      return sum + (amount || 0);
                    }, 0)
                  )} DT
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>Aucun bon CNAM pour ce patient</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientCNAMBonds;
