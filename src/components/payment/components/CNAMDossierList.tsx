import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileCheck, AlertCircle } from 'lucide-react';
import { PaymentData } from '../context/PaymentContext';
import CNAMDossierManager from './CNAMDossierManager';

interface CNAMDossierListProps {
  payments: PaymentData[];
  onUpdatePayment: (updatedPayment: PaymentData) => void;
  readOnly?: boolean;
}

const CNAMDossierList: React.FC<CNAMDossierListProps> = ({ 
  payments, 
  onUpdatePayment, 
  readOnly = false 
}) => {
  const [activeTab, setActiveTab] = useState<string>('pending');
  
  // Filter CNAM payments
  const cnamPayments = payments.filter(payment => payment.type === 'cnam');
  
  // Separate pending and completed dossiers
  const pendingDossiers = cnamPayments.filter(
    payment => payment.isPending !== false && !['accepte', 'refuse'].includes(payment.etatDossier || '')
  );
  
  const completedDossiers = cnamPayments.filter(
    payment => payment.isPending === false || ['accepte', 'refuse'].includes(payment.etatDossier || '')
  );

  if (cnamPayments.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader className="bg-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Suivi des Dossiers CNAM</CardTitle>
          </div>
          <div className="flex gap-2">
            {pendingDossiers.length > 0 && (
              <Badge className="bg-amber-500">
                {pendingDossiers.length} en attente
              </Badge>
            )}
            {completedDossiers.length > 0 && (
              <Badge className="bg-green-500">
                {completedDossiers.length} finalisé{completedDossiers.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        {cnamPayments.length > 0 ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="pending" className="relative">
                En attente
                {pendingDossiers.length > 0 && (
                  <span className="absolute top-0 right-1 transform translate-x-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs text-white">
                    {pendingDossiers.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed">
                Finalisés
                {completedDossiers.length > 0 && (
                  <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-xs text-white">
                    {completedDossiers.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="space-y-4">
              {pendingDossiers.length > 0 ? (
                pendingDossiers.map((payment, index) => (
                  <CNAMDossierManager
                    key={payment.id || index}
                    payment={payment}
                    onUpdate={onUpdatePayment}
                    readOnly={readOnly}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Aucun dossier CNAM en attente</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-4">
              {completedDossiers.length > 0 ? (
                completedDossiers.map((payment, index) => (
                  <CNAMDossierManager
                    key={payment.id || index}
                    payment={payment}
                    onUpdate={onUpdatePayment}
                    readOnly={true}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Aucun dossier CNAM finalisé</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>Aucun dossier CNAM trouvé pour cette vente</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CNAMDossierList;
