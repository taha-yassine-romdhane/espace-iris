import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, UserCog, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface EmployeeSelectorDialogProps {
  onSelect: (id: string, name: string) => void;
  selectedId?: string;
  selectedName?: string;
  trigger?: React.ReactNode;
  placeholder?: string;
  allowNone?: boolean;
}

export function EmployeeSelectorDialog({
  onSelect,
  selectedId,
  selectedName,
  trigger,
  placeholder = 'Sélectionner employé',
  allowNone = false
}: EmployeeSelectorDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch users (employees and admins only)
  const { data: users, isLoading } = useQuery({
    queryKey: ['users-employees-admins'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      // Filter only ADMIN, EMPLOYEE, and MANAGER roles (exclude DOCTOR)
      return data.users?.filter((user: any) =>
        ['ADMIN', 'EMPLOYEE', 'MANAGER'].includes(user.role)
      ) || [];
    },
  });

  // Filter and paginate data
  const filteredData = useMemo(() => {
    if (!users) return [];

    const searchLower = searchTerm.toLowerCase();
    return users.filter((user: any) => {
      return (
        user.firstName?.toLowerCase().includes(searchLower) ||
        user.lastName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.telephone?.includes(searchLower)
      );
    });
  }, [users, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSelect = (user: any) => {
    const name = `${user.firstName} ${user.lastName}`;
    onSelect(user.id, name);
    setOpen(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleSelectNone = () => {
    onSelect('', '');
    setOpen(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'MANAGER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'EMPLOYEE':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Admin';
      case 'MANAGER':
        return 'Manager';
      case 'EMPLOYEE':
        return 'Employé';
      default:
        return role;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="h-8 text-xs justify-start">
            {selectedName || placeholder}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Sélectionner un Employé
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher par nom, email, téléphone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto border rounded-lg">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="border-b">
                  <th className="px-4 py-2 text-left text-xs font-semibold">Nom</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Rôle</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Téléphone</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {allowNone && (
                  <tr className="border-b hover:bg-slate-50 bg-yellow-50">
                    <td className="px-4 py-2 font-medium text-gray-500 italic" colSpan={4}>
                      Non assigné
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Button
                        size="sm"
                        variant={!selectedId ? 'default' : 'outline'}
                        onClick={handleSelectNone}
                        className="h-7"
                      >
                        Sélectionner
                      </Button>
                    </td>
                  </tr>
                )}
                {paginatedData.map((user: any) => (
                  <tr key={user.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium">
                      {user.firstName} {user.lastName}
                      {!user.isActive && (
                        <Badge variant="outline" className="ml-2 text-xs bg-red-50 text-red-700 border-red-200">
                          Inactif
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className={`text-xs ${getRoleBadge(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-slate-600 text-xs">
                      {user.email}
                    </td>
                    <td className="px-4 py-2 text-slate-600 text-xs">
                      {user.telephone || '-'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Button
                        size="sm"
                        variant={selectedId === user.id ? 'default' : 'outline'}
                        onClick={() => handleSelect(user)}
                        className="h-7"
                        disabled={!user.isActive}
                      >
                        Sélectionner
                      </Button>
                    </td>
                  </tr>
                ))}
                {paginatedData.length === 0 && !allowNone && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Aucun employé trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t pt-3">
          <div className="text-sm text-slate-600">
            {filteredData.length} résultat(s) trouvé(s)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} sur {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
