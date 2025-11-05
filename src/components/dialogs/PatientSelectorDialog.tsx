import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, User, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface PatientSelectorDialogProps {
  onSelect: (type: 'patient' | 'company', id: string, name: string) => void;
  selectedId?: string;
  selectedName?: string;
  trigger?: React.ReactNode;
}

export function PatientSelectorDialog({
  onSelect,
  selectedId,
  selectedName,
  trigger
}: PatientSelectorDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'patients' | 'companies'>('patients');
  const itemsPerPage = 10;

  // Fetch patients
  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const response = await fetch('/api/patients');
      if (!response.ok) throw new Error('Failed to fetch patients');
      return response.json();
    },
  });

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await fetch('/api/societes');
      if (!response.ok) throw new Error('Failed to fetch companies');
      return response.json();
    },
  });

  // Filter and paginate data
  const filteredData = useMemo(() => {
    const data = activeTab === 'patients' ? patients : companies;
    if (!data) return [];

    const searchLower = searchTerm.toLowerCase();
    return data.filter((item: any) => {
      if (activeTab === 'patients') {
        return (
          item.firstName?.toLowerCase().includes(searchLower) ||
          item.lastName?.toLowerCase().includes(searchLower) ||
          item.patientCode?.toLowerCase().includes(searchLower) ||
          item.telephone?.includes(searchLower)
        );
      } else {
        return (
          item.companyName?.toLowerCase().includes(searchLower) ||
          item.telephone?.includes(searchLower)
        );
      }
    });
  }, [activeTab, patients, companies, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSelect = (type: 'patient' | 'company', item: any) => {
    const id = item.id;
    const name = type === 'patient'
      ? `${item.firstName} ${item.lastName}`
      : item.companyName;
    onSelect(type, id, name);
    setOpen(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleTabChange = (tab: 'patients' | 'companies') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchTerm('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="h-8 text-xs justify-start">
            {selectedName || 'Sélectionner client'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sélectionner un Client</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <Button
            variant={activeTab === 'patients' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('patients')}
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            Patients ({patients?.length || 0})
          </Button>
          <Button
            variant={activeTab === 'companies' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('companies')}
            className="flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" />
            Sociétés ({companies?.length || 0})
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher par nom, code, téléphone..."
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
          {activeTab === 'patients' ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="border-b">
                  <th className="px-4 py-2 text-left text-xs font-semibold">Code</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Nom</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Téléphone</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((patient: any) => (
                  <tr key={patient.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {patient.patientCode || 'N/A'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 font-medium">
                      {patient.firstName} {patient.lastName}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {patient.telephone}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Button
                        size="sm"
                        variant={selectedId === patient.id ? 'default' : 'outline'}
                        onClick={() => handleSelect('patient', patient)}
                        className="h-7"
                      >
                        Sélectionner
                      </Button>
                    </td>
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      Aucun patient trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="border-b">
                  <th className="px-4 py-2 text-left text-xs font-semibold">Nom de la société</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Téléphone</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((company: any) => (
                  <tr key={company.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium">
                      {company.companyName}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {company.telephone || 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Button
                        size="sm"
                        variant={selectedId === company.id ? 'default' : 'outline'}
                        onClick={() => handleSelect('company', company)}
                        className="h-7"
                      >
                        Sélectionner
                      </Button>
                    </td>
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      Aucune société trouvée
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
