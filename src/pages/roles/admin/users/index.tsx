import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import UserForm from '@/components/forms/UserForm';
import { useToast } from "@/components/ui/use-toast";
import { UserPlus, Loader2, Upload, Download, FileUp, Users, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Role as PrismaRole } from '@prisma/client';
import { columns } from './components/columns';
import { UsersTable } from './components/UsersTable';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as XLSX from 'xlsx';

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
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [userRelations, setUserRelations] = useState<Record<string, number> | null>(null);
  const [hasRelations, setHasRelations] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    telephone: '',
    role: '' as Role,
    isActive: true,
    address: '',
    speciality: '',
  });

  const resetForm = () => {
    setFormData({
      id: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      telephone: '',
      role: '' as Role,
      isActive: true,
      address: '',
      speciality: '',
    });
    setIsEditMode(false);
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data || []);
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

  const handleEdit = useCallback((user: User) => {
    const [firstName = '', ...lastNameParts] = user.name.split(' ');
    const lastName = lastNameParts.join(' ');

    setFormData({
      id: user.id,
      firstName,
      lastName,
      email: user.email,
      password: '',
      telephone: user.telephone || '',
      role: user.role as Role,
      isActive: user.isActive,
      address: user.address || '',
      speciality: user.speciality || '',
    });
    setIsEditMode(true);
    setIsOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setDeleteUserId(id);
    try {
      const response = await fetch(`/api/users/${id}/relations`);
      if (!response.ok) {
        throw new Error('Failed to fetch user relations');
      }
      const data = await response.json();
      setUserRelations(data.relations);
      setHasRelations(data.hasRelations);
      setIsDeleteDialogOpen(true);
    } catch (error) {
      console.error('Error checking user relations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier les relations de l'utilisateur.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const confirmAction = useCallback(async (action: 'soft-delete' | 'hard-delete') => {
    if (!deleteUserId) return;

    if (action === 'soft-delete') {
      try {
        const userToUpdate = users.find(user => user.id === deleteUserId);
        if (!userToUpdate) throw new Error("User not found");

        const nameParts = userToUpdate.name.split(' ');
        const updatedUserPayload = {
          ...userToUpdate,
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' '),
          isActive: false,
        };
        delete (updatedUserPayload as any).name;

        const response = await fetch(`/api/users`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUserPayload),
        });

        if (!response.ok) throw new Error((await response.json()).error || 'Failed to deactivate user');

        toast({ title: "Succès", description: "Utilisateur désactivé avec succès" });
        fetchUsers();
        setIsDeleteDialogOpen(false);
      } catch (error) {
        console.error('Error deactivating user:', error);
        toast({ title: "Erreur", description: error instanceof Error ? error.message : "Échec de la désactivation", variant: "destructive" });
      }
    } else if (action === 'hard-delete') {
      try {
        const response = await fetch(`/api/users?id=${deleteUserId}`, { method: 'DELETE' });

        if (!response.ok) throw new Error((await response.json()).error || 'Failed to delete user');

        toast({ title: "Succès", description: "Utilisateur supprimé définitivement" });
        fetchUsers();
        setIsDeleteDialogOpen(false);
      } catch (error) {
        console.error('Error deleting user permanently:', error);
        toast({ title: "Erreur", description: error instanceof Error ? error.message : "Échec de la suppression définitive", variant: "destructive" });
      }
    }
  }, [deleteUserId, users, toast, fetchUsers]);

  const cancelDelete = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setDeleteUserId(null);
    setUserRelations(null);
    setHasRelations(false);
  }, []);

  const userColumns = useMemo(() => columns(handleEdit, handleDelete), [handleEdit, handleDelete]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(() => {
    try {
      const exportData = users.map(user => ({
        'Prénom': user.name.split(' ')[0],
        'Nom': user.name.split(' ').slice(1).join(' '),
        'Email': user.email,
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

  const handleSubmit = async () => {
    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const response = await fetch('/api/users', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          password: formData.password || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${isEditMode ? 'update' : 'create'} user`);
      }

      toast({
        title: "Success",
        description: `User ${isEditMode ? 'updated' : 'created'} successfully`,
      });

      setIsOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} user`,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleInputChange = (name: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

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
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Section */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-3xl font-bold flex items-center gap-2">
                  <Users className="h-8 w-8" />
                  Gestion des Utilisateurs
                </CardTitle>
                <CardDescription className="text-blue-100 mt-2">
                  Gérez les comptes utilisateurs, leurs rôles et permissions
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={handleExport}
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exporter
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Importer
                </Button>
                <Button 
                  onClick={() => {
                    resetForm();
                    setIsOpen(true);
                  }} 
                  className="bg-white text-blue-600 hover:bg-blue-50"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Nouveau
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-white/90 backdrop-blur border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-700">{users.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {users.filter(u => u.role === 'ADMIN').length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-purple-200 bg-purple-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Managers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {users.filter(u => u.role === 'MANAGER').length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-red-200 bg-red-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Docteurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {users.filter(u => u.role === 'DOCTOR').length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-green-200 bg-green-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Employés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {users.filter(u => u.role === 'EMPLOYEE').length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Inactifs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {users.filter(u => !u.isActive).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Import Instructions */}
        <Alert className="bg-blue-50 border-blue-200">
          <FileUp className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <strong>Format d'import Excel:</strong> Colonnes requises - Prénom, Nom, Email, Mot de passe, Rôle (ADMIN/MANAGER/DOCTOR/EMPLOYEE), Téléphone, Adresse, Spécialité, Actif (Oui/Non)
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Create template Excel file
                  const templateData = [
                    {
                      'Prénom': 'Jean',
                      'Nom': 'Dupont',
                      'Email': 'jean.dupont@example.com',
                      'Mot de passe': 'MotDePasse123',
                      'Rôle': 'EMPLOYEE',
                      'Téléphone': '0123456789',
                      'Adresse': '123 Rue de la Paix, Paris',
                      'Spécialité': '',
                      'Actif': 'Oui'
                    },
                    {
                      'Prénom': 'Marie',
                      'Nom': 'Martin',
                      'Email': 'marie.martin@example.com',
                      'Mot de passe': 'SecurePass456',
                      'Rôle': 'DOCTOR',
                      'Téléphone': '0987654321',
                      'Adresse': '456 Avenue des Champs',
                      'Spécialité': 'Cardiologie',
                      'Actif': 'Oui'
                    }
                  ];
                  
                  const ws = XLSX.utils.json_to_sheet(templateData);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Template');
                  
                  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                  
                  const link = document.createElement('a');
                  const url = URL.createObjectURL(blob);
                  link.setAttribute('href', url);
                  link.setAttribute('download', 'template_utilisateurs_import.xlsx');
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="ml-4"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Télécharger le modèle Excel
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        {/* Table Section */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <UsersTable columns={userColumns} data={users} />
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

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}</DialogTitle>
            </DialogHeader>
            <UserForm
              formData={formData}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isEditMode={isEditMode}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {hasRelations ? 'Action Requise' : 'Confirmation de Suppression'}
              </DialogTitle>
              <DialogDescription>
                {hasRelations ? (
                  <div className="space-y-4">
                    <p className="text-red-600 font-semibold">Cet utilisateur est lié à des données importantes et ne peut pas être supprimé directement :</p>
                    <ul className="list-disc list-inside bg-gray-100 p-3 rounded-md">
                      {userRelations && Object.entries(userRelations).map(([key, value]) => (
                        <li key={key}>{`${key}: ${value}`}</li>
                      ))}
                    </ul>
                    <p>La suppression permanente entraînera la perte de ces données. Nous vous recommandons de désactiver l'utilisateur à la place.</p>
                  </div>
                ) : (
                  'Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ? Cette action est irréversible.'
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button variant="outline" onClick={cancelDelete}>Annuler</Button>
              {hasRelations ? (
                <>
                  <Button variant="destructive" onClick={() => confirmAction('hard-delete')}>Supprimer quand même</Button>
                  <Button onClick={() => confirmAction('soft-delete')}>Désactiver (Recommandé)</Button>
                </>
              ) : (
                <Button variant="destructive" onClick={() => confirmAction('hard-delete')}>Supprimer Définitivement</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UsersPage;