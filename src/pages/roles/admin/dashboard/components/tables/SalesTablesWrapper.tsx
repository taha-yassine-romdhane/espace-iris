import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Bell } from 'lucide-react';
import { SalesTable } from './SalesTable';
import CNAMRappelsTable from '@/pages/roles/admin/sales/components/CNAMRappelsTable';

interface SalesTablesWrapperProps {
  onViewDetails?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function SalesTablesWrapper({ onViewDetails, onEdit }: SalesTablesWrapperProps) {
  const [activeTab, setActiveTab] = useState('sales');

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Ventes
            </TabsTrigger>
            <TabsTrigger value="rappels" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Rappels CNAM
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="mt-0">
            <SalesTable onViewDetails={onViewDetails} onEdit={onEdit} />
          </TabsContent>

          <TabsContent value="rappels" className="mt-0">
            <CNAMRappelsTable />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default SalesTablesWrapper;
