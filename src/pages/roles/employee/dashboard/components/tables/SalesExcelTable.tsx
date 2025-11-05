import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Eye,
  CreditCard,
  User,
  Building2,
  Calendar
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/utils/priceUtils';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Sale {
  id: string;
  saleCode: string;
  invoiceNumber?: string;
  saleDate: string;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  status: string;
  notes: string;
  patientId?: string;
  companyId?: string;
  processedById: string;
  assignedToId?: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    patientCode: string;
    telephone: string;
  };
  company?: {
    id: string;
    companyName: string;
    telephone: string;
  };
  processedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  items?: any[];
}

const STATUSES = [
  { value: 'PENDING', label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'CONFIRMED', label: 'Confirmée', color: 'bg-blue-100 text-blue-800' },
  { value: 'COMPLETED', label: 'Terminée', color: 'bg-green-100 text-green-800' },
  { value: 'CANCELLED', label: 'Annulée', color: 'bg-red-100 text-red-800' }
];

export default function EmployeeSalesExcelTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  const router = useRouter();

  // Fetch sales (filtered by API based on role)
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['employee-sales'],
    queryFn: async () => {
      const response = await fetch('/api/sales');
      if (!response.ok) throw new Error('Failed to fetch sales');
      const data = await response.json();
      return data?.sales || [];
    },
  });

  const sales = salesData || [];

  // Filter and search sales
  const filteredSales = useMemo(() => {
    if (!Array.isArray(sales)) return [];
    return sales.filter((sale: Sale) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        sale.saleCode?.toLowerCase().includes(searchLower) ||
        sale.invoiceNumber?.toLowerCase().includes(searchLower) ||
        sale.patient?.firstName?.toLowerCase().includes(searchLower) ||
        sale.patient?.lastName?.toLowerCase().includes(searchLower) ||
        sale.company?.companyName?.toLowerCase().includes(searchLower) ||
        sale.notes?.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;

      // Client filter
      const matchesClient =
        clientFilter === 'all' ||
        (clientFilter === 'patient' && sale.patientId) ||
        (clientFilter === 'company' && sale.companyId);

      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [sales, searchTerm, statusFilter, clientFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, clientFilter]);

  const getStatusBadge = (status: string) => {
    const statusObj = STATUSES.find(s => s.value === status);
    if (!statusObj) return <Badge>{status}</Badge>;
    return <Badge className={statusObj.color}>{statusObj.label}</Badge>;
  };

  const handleViewDetails = (saleId: string) => {
    router.push(`/roles/employee/sales/${saleId}`);
  };

  const getClientDisplay = (sale: Sale) => {
    if (sale.patient) {
      return (
        <div className="flex items-center gap-2">
          <User className="h-3 w-3 text-blue-600" />
          <span className="text-xs">{`${sale.patient.firstName} ${sale.patient.lastName}`}</span>
        </div>
      );
    }
    if (sale.company) {
      return (
        <div className="flex items-center gap-2">
          <Building2 className="h-3 w-3 text-purple-600" />
          <span className="text-xs">{sale.company.companyName}</span>
        </div>
      );
    }
    return <span className="text-xs text-gray-400">-</span>;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3 bg-gray-50 p-4 rounded-lg border">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par code, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Filtres:</span>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Type client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              <SelectItem value="patient">Patients</SelectItem>
              <SelectItem value="company">Sociétés</SelectItem>
            </SelectContent>
          </Select>

          {(statusFilter !== 'all' || clientFilter !== 'all' || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setClientFilter('all');
                setSearchTerm('');
              }}
              className="h-9"
            >
              <X className="h-4 w-4 mr-1" />
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b sticky top-0">
              <tr>
                <th className="px-2 py-3 text-left font-medium text-xs">Code</th>
                <th className="px-2 py-3 text-left font-medium text-xs">N° Facture</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Client</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Date</th>
                <th className="px-2 py-3 text-right font-medium text-xs">Montant Total</th>
                <th className="px-2 py-3 text-right font-medium text-xs">Remise</th>
                <th className="px-2 py-3 text-right font-medium text-xs">Montant Final</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Statut</th>
                <th className="px-2 py-3 text-left font-medium text-xs">Notes</th>
                <th className="px-2 py-3 text-center font-medium text-xs sticky right-0 bg-gray-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    {isLoading ? 'Chargement...' : 'Aucune vente trouvée'}
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale: Sale) => (
                  <tr key={sale.id} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-2">
                      <Badge variant="outline" className="text-xs font-mono bg-green-50 text-green-700 border-green-200">
                        {sale.saleCode}
                      </Badge>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-xs">{sale.invoiceNumber || '-'}</span>
                    </td>
                    <td className="px-2 py-2">{getClientDisplay(sale)}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-xs">
                          {format(new Date(sale.saleDate), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <span className="text-xs font-medium">{formatCurrency(sale.totalAmount)}</span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <span className="text-xs text-orange-600">
                        {sale.discount > 0 ? `-${formatCurrency(sale.discount)}` : '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <span className="text-xs font-bold text-green-700">{formatCurrency(sale.finalAmount)}</span>
                    </td>
                    <td className="px-2 py-2">{getStatusBadge(sale.status)}</td>
                    <td className="px-2 py-2">
                      <span className="text-xs truncate max-w-[150px] block">{sale.notes || '-'}</span>
                    </td>
                    <td className="px-2 py-2 sticky right-0 bg-white">
                      <div className="flex gap-1 justify-center">
                        <Button
                          onClick={() => handleViewDetails(sale.id)}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Détails
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Afficher</span>
          <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {startIndex + 1}-{Math.min(endIndex, filteredSales.length)} sur {filteredSales.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            size="sm"
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} sur {totalPages || 1}
          </span>
          <Button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            size="sm"
            variant="outline"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
