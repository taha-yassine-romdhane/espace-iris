import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmployeeLayout from '../EmployeeLayout';

import MyStockInventory from './components/MyStockInventory';
import GlobalStockView from './components/GlobalStockView';
import StockTransferRequests from './components/StockTransferRequests';

const EmployeeStockPage = () => {
  const [activeTab, setActiveTab] = useState("my-stock");

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-green-700">Mon Stock</h1>
          <p className="text-gray-500">Gérez votre stock local et consultez l'inventaire global</p>
        </div>
      </div>

      <Tabs defaultValue={activeTab} className="space-y-4" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="my-stock" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
            Mon Inventaire
          </TabsTrigger>
          <TabsTrigger value="global-stock" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
            Stock Global
          </TabsTrigger>
          <TabsTrigger value="transfers" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
            Mes Transferts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-stock" className="space-y-4">
          <MyStockInventory />
        </TabsContent>

        <TabsContent value="global-stock" className="space-y-4">
          <GlobalStockView />
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <StockTransferRequests />
        </TabsContent>
      </Tabs>
    </div>
  );
};

EmployeeStockPage.getLayout = (page: React.ReactNode) => (
  <EmployeeLayout>{page}</EmployeeLayout>
);

export default EmployeeStockPage;