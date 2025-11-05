import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SalesExcelTable from './components/SalesExcelTable';
import ArticlesExcelTable from './components/ArticlesExcelTable';
import PaymentsExcelTable from './components/PaymentsExcelTable';
import CNAMBonsExcelTable from './components/CNAMBonsExcelTable';
import CNAMRappelsTable from './components/CNAMRappelsTable';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, ShoppingCart, CreditCard, FileText, Package, Bell } from 'lucide-react';

export default function SalesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('sales');

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="mx-auto py-6 px-2 max-w-[98vw]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Gestion des Ventes</h1>
          <p className="text-slate-600 mt-1">Gérer toutes les ventes, paiements et bons CNAM dans des tableaux séparés</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="sales" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Ventes
              </TabsTrigger>
              <TabsTrigger value="articles" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Articles
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Paiements
              </TabsTrigger>
              <TabsTrigger value="cnam-bons" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Bons CNAM
              </TabsTrigger>
              <TabsTrigger value="rappels-cnam" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Rappels CNAM
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="mt-0">
              <SalesExcelTable key={`sales-${refreshKey}`} />
            </TabsContent>

            <TabsContent value="articles" className="mt-0">
              <ArticlesExcelTable key={`articles-${refreshKey}`} />
            </TabsContent>

            <TabsContent value="payments" className="mt-0">
              <PaymentsExcelTable key={`payments-${refreshKey}`} />
            </TabsContent>

            <TabsContent value="cnam-bons" className="mt-0">
              <CNAMBonsExcelTable key={`cnam-${refreshKey}`} />
            </TabsContent>

            <TabsContent value="rappels-cnam" className="mt-0">
              <CNAMRappelsTable key={`rappels-${refreshKey}`} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
