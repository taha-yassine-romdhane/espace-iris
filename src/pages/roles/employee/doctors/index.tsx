import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import UserForm from '@/components/forms/UserForm';
import { useToast } from "@/components/ui/use-toast";
import { UserPlus, Loader2, Users, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Role as PrismaRole } from '@prisma/client';
import { columns } from '@/pages/roles/admin/users/components/columns';
import { UsersTable } from '@/pages/roles/admin/users/components/UsersTable';
import EmployeeLayout from '../EmployeeLayout';

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

type Role = 'DOCTOR';

const DoctorsPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
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
    role: 'DOCTOR' as Role,
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
      role: 'DOCTOR' as Role,
      isActive: true,
      address: '',
      speciality: '',
    });
    setIsEditMode(false);
  };

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users/doctors');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch doctors');
      }
      const data = await response.json();
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec du chargement des médecins. Veuillez réessayer.",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

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
      role: 'DOCTOR' as Role,
      isActive: user.isActive,
      address: user.address || '',
      speciality: user.speciality || '',
    });
    setIsEditMode(true);
    setIsOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    // Employees cannot delete doctors, only view and add
    toast({
      title: "Action non autorisée",
      description: "Vous n'êtes pas autorisé à supprimer des médecins.",
      variant: "destructive",
    });
  }, [toast]);

  const userColumns = useMemo(() => columns(handleEdit, handleDelete), [handleEdit, handleDelete]);

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
        throw new Error(error.error || `Failed to ${isEditMode ? 'update' : 'create'} doctor`);
      }

      toast({
        title: "Succès",
        description: `Médecin ${isEditMode ? 'modifié' : 'créé'} avec succès`,
      });

      setIsOpen(false);
      resetForm();
      fetchDoctors();
    } catch (error) {
      console.error('Error saving doctor:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : `Échec de ${isEditMode ? 'modification' : 'création'} du médecin`,
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
            <h1 className="text-3xl font-bold text-green-900">Médecins</h1>
            <Button variant="default" className="bg-green-600 hover:bg-green-700" disabled>
              <UserPlus className="w-5 h-5 mr-2" />
              Ajouter un médecin
            </Button>
          </div>
          <Card className="p-8">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              <span className="ml-2 text-green-600">Chargement...</span>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Section */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-3xl font-bold flex items-center gap-2">
                  <Stethoscope className="h-8 w-8" />
                  Gestion des Médecins
                </CardTitle>
                <CardDescription className="text-green-100 mt-2">
                  Consultez et gérez les médecins de l'établissement
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    resetForm();
                    setIsOpen(true);
                  }}
                  className="bg-white text-green-600 hover:bg-green-50"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Nouveau Médecin
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/90 backdrop-blur border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Médecins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-700">{users.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-green-200 bg-green-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Actifs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {users.filter(u => u.isActive).length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Inactifs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {users.filter(u => !u.isActive).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Section */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <UsersTable columns={userColumns} data={users} />
          </CardContent>
        </Card>

        <Dialog open={isOpen} onOpenChange={(open) => !open && setIsOpen(false)}>
          <DialogContent onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Modifier le médecin' : 'Ajouter un médecin'}</DialogTitle>
            </DialogHeader>
            <UserForm
              formData={formData}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isEditMode={isEditMode}
              restrictRole="DOCTOR"
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

DoctorsPage.getLayout = function getLayout(page: React.ReactElement) {
  return <EmployeeLayout>{page}</EmployeeLayout>;
};

export default DoctorsPage;
