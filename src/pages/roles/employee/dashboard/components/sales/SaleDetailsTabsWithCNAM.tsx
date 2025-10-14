import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useCNAMDossiers } from '@/hooks/useCNAMDossiers';
import SaleDetailsCNAMTab from './SaleDetailsCNAMTab';

import SaleInvoice from '@/components/sales/SaleInvoice';

interface SaleDetailsTabsWithCNAMProps {
  saleId: string;
  isReadOnly?: boolean;
  children: React.ReactNode;
  sale?: any; // Add sale prop for invoice rendering
}

/**
 * Enhanced sale details tabs component that adds a CNAM dossier management tab
 * when the sale has CNAM payments with pending dossiers.
 */
const SaleDetailsTabsWithCNAM: React.FC<SaleDetailsTabsWithCNAMProps> = ({
  saleId,
  isReadOnly = false,
  children,
  sale
}) => {
  const [activeTab, setActiveTab] = useState<string>('details');
  
  // Use our custom hook to check if there are pending CNAM dossiers
  const { pendingDossiers, isLoading } = useCNAMDossiers({ saleId });
  const hasPendingDossiers = pendingDossiers.length > 0;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="details">Détails de la vente</TabsTrigger>
        <TabsTrigger value="cnam" className="relative">
          Dossiers CNAM
          {hasPendingDossiers && !isLoading && (
            <Badge className="ml-2 bg-amber-500">
              {pendingDossiers.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="facture">Facture</TabsTrigger>
      </TabsList>
      
      <TabsContent value="details">
        {children}
      </TabsContent>
      
      <TabsContent value="cnam">
        <SaleDetailsCNAMTab 
          saleId={saleId} 
          isReadOnly={isReadOnly} 
        />
      </TabsContent>

      <TabsContent value="facture">
        {sale ? <SaleInvoice sale={sale} /> : <div>Aucune donnée de vente pour la facture.</div>}
      </TabsContent>
    </Tabs>
  );
};

export default SaleDetailsTabsWithCNAM;
