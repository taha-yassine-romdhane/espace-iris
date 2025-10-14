import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "@/components/settings/UserManagement";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { Card } from "@/components/ui/card";
import { Settings, Users, Database } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { BackupRestore } from "@/components/settings/BackupRestoreNew";
import AdminLayout from "../AdminLayout";

function SettingsPage() {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center mb-6">
        <Settings className="h-6 w-6 mr-2 text-blue-600" />
        <h1 className="text-2xl font-bold">Paramètres du Système</h1>
      </div>
      
      <Separator className="my-4" />
      
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="p-4 md:w-64 h-fit">
          <Tabs 
            defaultValue="users" 
            orientation="vertical" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="flex flex-col h-auto bg-transparent space-y-1">
              <TabsTrigger 
                value="users" 
                className="w-full justify-start text-left px-3 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                <Users className="h-4 w-4 mr-2" />
                Gestion des Utilisateurs
              </TabsTrigger>
              <TabsTrigger 
                value="general" 
                className="w-full justify-start text-left px-3 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                <Settings className="h-4 w-4 mr-2" />
                Paramètres Généraux
              </TabsTrigger>
              <TabsTrigger 
                value="backup" 
                className="w-full justify-start text-left px-3 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                <Database className="h-4 w-4 mr-2" />
                Restauration
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </Card>
        <div className="flex-1">
          {activeTab === "users" && <UserManagement />}
          {activeTab === "general" && <GeneralSettings />}
          {activeTab === "backup" && <BackupRestore/>}
        </div>
      </div>
    </div>
  );
}

// Add layout wrapper
SettingsPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AdminLayout>{page}</AdminLayout>;
};

export default SettingsPage;