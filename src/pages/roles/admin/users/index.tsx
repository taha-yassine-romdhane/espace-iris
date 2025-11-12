import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { UserPlus, Loader2, Upload, Download, Shield, Users as UsersIcon, Stethoscope, Briefcase, Lock } from "lucide-react";
import { Card, CardContent } from '@/components/ui/card';
import { Role as PrismaRole } from '@prisma/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as XLSX from 'xlsx';
import UsersExcelTable from './components/UsersExcelTable';

export interface User {
  id: string;
  name: string;
  email: string;
  role: PrismaRole;
  telephone?: string | null;
  address?: string | null;
  speciality?: string | null;
  isActive: boolean;
}

type Role = 'ADMIN' | 'MANAGER' | 'DOCTOR' | 'EMPLOYEE';

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('admin');
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load users. Please try again.",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleExport = useCallback(async () => {
    try {
      // Fetch default password from API
      const passwordResponse = await fetch('/api/users/default-password');
      if (!passwordResponse.ok) {
        throw new Error('Failed to fetch default password');
      }
      const { defaultPassword } = await passwordResponse.json();

      const exportData = users.map(user => ({
        'Prénom': user.name.split(' ')[0],
        'Nom': user.name.split(' ').slice(1).join(' '),
        'Email': user.email,
        'Mot de passe': defaultPassword,
        'Rôle': user.role,
        'Téléphone': user.telephone || '',
        'Adresse': user.address || '',
        'Spécialité': user.speciality || '',
        'Actif': user.isActive ? 'Oui' : 'Non'
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Utilisateurs');

      // Style the header row (optional)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'E7F3FF' } }
        };
      }

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Download file
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `utilisateurs_${new Date().toISOString().split('T')[0]}.xlsx`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: `${users.length} utilisateurs exportés avec succès`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Erreur",
        description: "Échec de l'export des utilisateurs",
        variant: "destructive",
      });
    }
  }, [users, toast]);

  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const usersToImport = jsonData.map((row: any) => ({
          firstName: String(row['Prénom'] || '').trim(),
          lastName: String(row['Nom'] || '').trim(),
          email: String(row['Email'] || '').trim(),
          password: String(row['Mot de passe'] || '').trim(),
          role: String(row['Rôle'] || 'EMPLOYEE').trim() as Role,
          telephone: String(row['Téléphone'] || '').trim(),
          address: String(row['Adresse'] || '').trim(),
          speciality: String(row['Spécialité'] || '').trim(),
          isActive: String(row['Actif'] || '').toLowerCase() === 'oui' || 
                   String(row['Actif'] || '').toLowerCase() === 'yes' || 
                   row['Actif'] === true
        }));

        const response = await fetch('/api/users/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: usersToImport }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Import failed');
        }

        const result = await response.json();
        
        if (result.errors && result.errors.length > 0) {
          toast({
            title: "Import partiel",
            description: `${result.imported} sur ${result.total} utilisateurs importés. Vérifiez les erreurs.`,
            variant: "default",
          });
          console.error('Import errors:', result.errors);
        } else {
          toast({
            title: "Import réussi",
            description: `${result.imported} utilisateurs importés avec succès`,
          });
        }
        
        fetchUsers();
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "Erreur d'import",
          description: error instanceof Error ? error.message : "Échec de l'import des utilisateurs",
          variant: "destructive",
        });
      }
    };
    
    reader.readAsBinaryString(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [toast, fetchUsers]);


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white">
        <div className="container mx-auto p-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-blue-900">Utilisateurs</h1>
            <Button variant="default" className="bg-blue-600 hover:bg-blue-700" disabled>
              <UserPlus className="w-5 h-5 mr-2" />
              Ajouter un utilisateur
            </Button>
          </div>
          <Card className="p-8">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-2 text-blue-600">Chargement...</span>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="mx-auto py-6 px-4 max-w-[98vw]">
        {/* Header Section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-900 flex items-center gap-2">
              <UsersIcon className="h-8 w-8" />
              Gestion des Utilisateurs
            </h1>
            <p className="text-slate-600 mt-1">Gérez les comptes utilisateurs par rôle dans des tableaux séparés</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exporter
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Importer
            </Button>
          </div>
        </div>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="bg-white/90 backdrop-blur border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-blue-700">Admins</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {users.filter(u => u.role === 'ADMIN').length}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-red-20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-600 rounded-lg">
                    <Stethoscope className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-red-700">Docteurs</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {users.filter(u => u.role === 'DOCTOR').length}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-green-200 ">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <Briefcase className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-green-700">Employés</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.role === 'EMPLOYEE').length}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-purple-200 ">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <Lock className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-purple-700">Managers</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {users.filter(u => u.role === 'MANAGER').length}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admins
                </TabsTrigger>
                <TabsTrigger value="doctor" className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Docteurs
                </TabsTrigger>
                <TabsTrigger value="employee" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Employés
                </TabsTrigger>
                <TabsTrigger
                  value="manager"
                  className="flex items-center gap-2 opacity-50 cursor-not-allowed"
                  disabled
                >
                  <Lock className="h-4 w-4" />
                  Managers
                </TabsTrigger>
              </TabsList>

              <TabsContent value="admin" className="mt-0">
                <UsersExcelTable key="admin" roleFilter="ADMIN" />
              </TabsContent>

              <TabsContent value="doctor" className="mt-0">
                <UsersExcelTable key="doctor" roleFilter="DOCTOR" />
              </TabsContent>

              <TabsContent value="employee" className="mt-0">
                <UsersExcelTable key="employee" roleFilter="EMPLOYEE" />
              </TabsContent>

              <TabsContent value="manager" className="mt-0">
                <div className="text-center py-12 text-gray-500">
                  <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Onglet verrouillé</p>
                  <p className="text-sm mt-2">La gestion des managers sera disponible prochainement</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleImport}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default UsersPage;