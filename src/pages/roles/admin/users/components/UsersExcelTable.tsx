import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Eye,
  Edit,
  User,
  Mail,
  Phone,
  Shield,
  MapPin,
  Stethoscope,
  Users as UsersIcon,
  Package,
  Box,
  Warehouse,
  ClipboardList,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import UserForm from '@/components/forms/UserForm';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  telephone?: string | null;
  address?: string | null;
  speciality?: string | null;
  isActive: boolean;
  stats?: {
    patients: number;
    sales: number;
    diagnostics: number;
    tasks: number;
    stockLocations: number;
    devices: number;
    products: number;
  };
}

type Role = 'ADMIN' | 'MANAGER' | 'DOCTOR' | 'EMPLOYEE';

interface UsersExcelTableProps {
  roleFilter?: string;
}

export default function UsersExcelTable({ roleFilter }: UsersExcelTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<User>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [userRelations, setUserRelations] = useState<Record<string, number> | null>(null);
  const [hasRelations, setHasRelations] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
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

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Filter users by role
  const filteredUsers = useMemo(() => {
    if (!usersData || !usersData.users) return [];
    let filtered = usersData.users;

    // Apply role filter
    if (roleFilter && roleFilter !== 'all') {
      filtered = filtered.filter((user: User) => user.role === roleFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((user: User) =>
        statusFilter === 'active' ? user.isActive : !user.isActive
      );
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((user: User) =>
        (user.name && user.name.toLowerCase().includes(query)) ||
        (user.email && user.email.toLowerCase().includes(query)) ||
        (user.telephone && user.telephone.toLowerCase().includes(query)) ||
        (user.address && user.address.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [usersData, roleFilter, statusFilter, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<User> & { id: string }) => {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Success', description: 'User updated successfully' });
      setEditingId(null);
      setEditedData({});
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete user' }));
        throw new Error(error.error || 'Failed to delete user');
      }
      // 204 No Content response has no body, don't try to parse JSON
      return response.status === 204 ? null : response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Success', description: 'User deleted successfully' });
      setIsDeleteDialogOpen(false);
      setDeleteUserId(null);
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete user',
        variant: 'destructive'
      });
    },
  });

  const handleEdit = (user: User) => {
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
    setIsAddingNew(true);
  };

  const handleDelete = async (id: string) => {
    setDeleteUserId(id);
    try {
      const response = await fetch(`/api/users/${id}/relations`);
      if (!response.ok) throw new Error('Failed to fetch user relations');
      const data = await response.json();
      setUserRelations(data.relations);
      setHasRelations(data.hasRelations);
      setIsDeleteDialogOpen(true);
    } catch (error) {
      console.error('Error checking user relations:', error);
      toast({
        title: 'Erreur',
        description: "Impossible de vérifier les relations de l'utilisateur.",
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async (action: 'soft-delete' | 'hard-delete') => {
    if (!deleteUserId) return;

    if (action === 'soft-delete') {
      const userToUpdate = filteredUsers.find((user: User) => user.id === deleteUserId);
      if (!userToUpdate) return;

      const nameParts = userToUpdate.name.split(' ');
      await updateMutation.mutateAsync({
        ...userToUpdate,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' '),
        isActive: false,
      } as any);
      setIsDeleteDialogOpen(false);
    } else {
      deleteMutation.mutate(deleteUserId);
    }
  };

  const handleSave = async () => {
    if (!editingId || !editedData) return;

    const userToUpdate = filteredUsers.find((u: User) => u.id === editingId);
    if (!userToUpdate) return;

    const nameParts = userToUpdate.name.split(' ');

    updateMutation.mutate({
      ...userToUpdate,
      ...editedData,
      id: editingId,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' '),
    } as any);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedData({});
  };

  const handleInputChange = (field: string, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const response = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
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
        title: 'Success',
        description: `User ${isEditMode ? 'updated' : 'created'} successfully`,
      });

      setIsAddingNew(false);
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
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} user`,
        variant: 'destructive',
      });
    }
  };

  const handleFormInputChange = (name: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setIsAddingNew(false);
    setIsEditMode(false);
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
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-blue-600 text-white hover:bg-blue-700';
      case 'MANAGER': return 'bg-purple-600 text-white hover:bg-purple-700';
      case 'DOCTOR': return 'bg-red-600 text-white hover:bg-red-700';
      case 'EMPLOYEE': return 'bg-green-600 text-white hover:bg-green-700';
      default: return 'bg-gray-600 text-white hover:bg-gray-700';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Admin';
      case 'MANAGER': return 'Manager';
      case 'DOCTOR': return 'Docteur';
      case 'EMPLOYEE': return 'Employé';
      default: return role;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, email, téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] border-gray-300">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="inactive">Inactifs</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => {
          setIsEditMode(false);
          setIsAddingNew(true);
        }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau
        </Button>
      </div>

      {/* Excel-like Table */}
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 sticky left-0 bg-gray-100 z-10">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nom
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Téléphone
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Rôle
                  </div>
                </th>
                {(roleFilter === 'ADMIN' || roleFilter === 'DOCTOR' || roleFilter === 'all') && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Adresse
                    </div>
                  </th>
                )}
                {(roleFilter === 'DOCTOR' || roleFilter === 'all') && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Spécialité
                    </div>
                  </th>
                )}
                {roleFilter === 'EMPLOYEE' && (
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                    <div className="flex items-center justify-center gap-2">
                      <Warehouse className="h-4 w-4" />
                      Stock Location
                    </div>
                  </th>
                )}
                {(roleFilter === 'ADMIN' || roleFilter === 'DOCTOR') && (
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                    <div className="flex items-center justify-center gap-2">
                      <UsersIcon className="h-4 w-4" />
                      Patients
                    </div>
                  </th>
                )}
                {roleFilter === 'ADMIN' && (
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                    <div className="flex items-center justify-center gap-2">
                      <Box className="h-4 w-4" />
                      Appareils
                    </div>
                  </th>
                )}
                {roleFilter === 'EMPLOYEE' && (
                  <>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      <div className="flex items-center justify-center gap-2">
                        <UsersIcon className="h-4 w-4" />
                        Patients
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      <div className="flex items-center justify-center gap-2">
                        <Box className="h-4 w-4" />
                        Appareils
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      <div className="flex items-center justify-center gap-2">
                        <Warehouse className="h-4 w-4" />
                        Stocks
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      <div className="flex items-center justify-center gap-2">
                        <Package className="h-4 w-4" />
                        Produits
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      <div className="flex items-center justify-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Tâches
                      </div>
                    </th>
                  </>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  Statut
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider sticky right-0 bg-gray-100 z-10">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user: User, index: number) => (
                <tr
                  key={user.id}
                  className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3 border-r border-gray-200 sticky left-0 bg-inherit z-10">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-r border-gray-200">
                    <a href={`mailto:${user.email}`} className="text-blue-600 hover:underline">
                      {user.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 border-r border-gray-200 text-gray-700">
                    {user.telephone || <span className="text-gray-400 italic">-</span>}
                  </td>
                  <td className="px-4 py-3 border-r border-gray-200">
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </td>
                  {(roleFilter === 'ADMIN' || roleFilter === 'DOCTOR' || roleFilter === 'all') && (
                    <td className="px-4 py-3 border-r border-gray-200 text-gray-700">
                      {user.address || <span className="text-gray-400 italic">-</span>}
                    </td>
                  )}
                  {(roleFilter === 'DOCTOR' || roleFilter === 'all') && (
                    <td className="px-4 py-3 border-r border-gray-200 text-gray-700">
                      {user.speciality || <span className="text-gray-400 italic">-</span>}
                    </td>
                  )}
                  {roleFilter === 'EMPLOYEE' && (
                    <td className="px-4 py-3 border-r border-gray-200 text-center">
                      {(user.stats?.stockLocations ?? 0) > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="text-green-700 font-medium">Oui</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="text-red-700 font-medium">Non</span>
                        </div>
                      )}
                    </td>
                  )}
                  {(roleFilter === 'ADMIN' || roleFilter === 'DOCTOR') && (
                    <td className="px-4 py-3 border-r border-gray-200 text-center">
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                        {user.stats?.patients || 0}
                      </Badge>
                    </td>
                  )}
                  {roleFilter === 'ADMIN' && (
                    <td className="px-4 py-3 border-r border-gray-200 text-center">
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                        {user.stats?.devices || 0}
                      </Badge>
                    </td>
                  )}
                  {roleFilter === 'EMPLOYEE' && (
                    <>
                      <td className="px-4 py-3 border-r border-gray-200 text-center">
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                          {user.stats?.patients || 0}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 border-r border-gray-200 text-center">
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                          {user.stats?.devices || 0}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 border-r border-gray-200 text-center">
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                          {user.stats?.stockLocations || 0}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 border-r border-gray-200 text-center">
                        <Badge className="bg-teal-100 text-teal-700 border-teal-200">
                          {user.stats?.products || 0}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 border-r border-gray-200 text-center">
                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                          {user.stats?.tasks || 0}
                        </Badge>
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 border-r border-gray-200">
                    <Badge
                      variant={user.isActive ? 'default' : 'secondary'}
                      className={user.isActive
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'}
                    >
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 sticky right-0 bg-inherit z-10">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(user)}
                        className="h-8 px-2 hover:bg-blue-100 hover:text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                        className="h-8 px-2 hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Affichage de <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> à{' '}
            <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> sur{' '}
            <span className="font-semibold">{filteredUsers.length}</span> utilisateurs
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Lignes par page:</span>
            <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}>
              <SelectTrigger className="w-[80px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddingNew} onOpenChange={setIsAddingNew}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}</DialogTitle>
          </DialogHeader>
          <UserForm
            formData={formData}
            onChange={handleFormInputChange}
            onSubmit={handleSubmit}
            onCancel={resetForm}
            isEditMode={isEditMode}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hasRelations ? 'Action Requise' : 'Confirmation de Suppression'}
            </DialogTitle>
            <DialogDescription>
              {hasRelations ? (
                <div className="space-y-4">
                  <p className="text-red-600 font-semibold">
                    Cet utilisateur est lié à des données importantes et ne peut pas être supprimé directement :
                  </p>
                  <ul className="list-disc list-inside bg-gray-100 p-3 rounded-md">
                    {userRelations && Object.entries(userRelations).map(([key, value]) => (
                      <li key={key}>{`${key}: ${value}`}</li>
                    ))}
                  </ul>
                  <p>
                    La suppression permanente entraînera la perte de ces données. Nous vous recommandons de désactiver l'utilisateur à la place.
                  </p>
                </div>
              ) : (
                'Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ? Cette action est irréversible.'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </Button>
            {hasRelations ? (
              <>
                <Button variant="destructive" onClick={() => confirmDelete('hard-delete')}>
                  Supprimer quand même
                </Button>
                <Button onClick={() => confirmDelete('soft-delete')}>
                  Désactiver (Recommandé)
                </Button>
              </>
            ) : (
              <Button variant="destructive" onClick={() => confirmDelete('hard-delete')}>
                Supprimer Définitivement
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
