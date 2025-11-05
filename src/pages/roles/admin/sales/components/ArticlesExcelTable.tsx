import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Save,
  X,
  Edit,
  Package,
  Search,
  Users,
  Settings,
  Building2,
  Filter,
  User,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/utils/priceUtils';
import ArticleSelectionDialog from '@/components/sales/ArticleSelectionDialog';
import ProductParameterDialog from '@/pages/roles/admin/dashboard/components/steps/product/ProductParameterDialog';

interface SaleItem {
  id: string;
  saleId: string;
  productId?: string;
  medicalDeviceId?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  itemTotal: number;
  serialNumber?: string;
  warranty?: string;
  description?: string;
  configuration?: any;
  sale?: {
    id: string;
    saleCode: string;
    invoiceNumber?: string;
    assignedTo?: {
      id: string;
      firstName: string;
      lastName: string;
      stockLocation?: {
        id: string;
        name: string;
      };
    };
    patient?: {
      id: string;
      firstName: string;
      lastName: string;
    };
    company?: {
      id: string;
      companyName: string;
    };
  };
  product?: {
    id: string;
    name: string;
    productCode: string;
    type?: string;
  };
  medicalDevice?: {
    id: string;
    name: string;
    deviceCode?: string;
    serialNumber: string;
    type?: string;
  };
}

export default function ArticlesExcelTable() {
  const [articles, setArticles] = useState<SaleItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<SaleItem>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('all');
  const [articleTypeFilter, setArticleTypeFilter] = useState<string>('all');
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<{type: 'patient' | 'company', id: string, name: string} | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<{
    type: 'product' | 'medical-device' | 'accessory' | 'spare-part' | 'diagnostic';
    id: string;
    name: string;
    code?: string;
    serialNumber?: string;
    unitPrice: number;
  } | null>(null);
  const [newArticle, setNewArticle] = useState({
    saleId: '',
    productId: '',
    medicalDeviceId: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    serialNumber: '',
    description: '',
    stockLocationId: '', // For admin to select stock location
  });
  const [parameterDialogOpen, setParameterDialogOpen] = useState(false);
  const [configuringDevice, setConfiguringDevice] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [availableStock, setAvailableStock] = useState<number>(0);
  const itemsPerPage = 50;

  // Ref to track if we've already set default stock location
  const stockLocationInitialized = useRef(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sale items
  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['sale-items'],
    queryFn: async () => {
      const response = await fetch('/api/sale-items');
      if (!response.ok) throw new Error('Failed to fetch articles');
      const data = await response.json();
      return data.items || [];
    },
  });

  // Fetch sales for dropdown
  const { data: salesResponse } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const response = await fetch('/api/sales');
      if (!response.ok) throw new Error('Failed to fetch sales');
      return response.json();
    },
  });

  const salesData = salesResponse?.sales || [];

  // Fetch products for dropdown
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  // Fetch medical devices for dropdown
  const { data: medicalDevices } = useQuery({
    queryKey: ['medical-devices'],
    queryFn: async () => {
      const response = await fetch('/api/medical-devices');
      if (!response.ok) throw new Error('Failed to fetch medical devices');
      return response.json();
    },
  });

  // Fetch patients for client selector
  const { data: patientsData } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const response = await fetch('/api/patients');
      if (!response.ok) throw new Error('Failed to fetch patients');
      const data = await response.json();
      return data.patients || data || [];
    },
  });

  // Fetch companies for client selector
  const { data: companiesData } = useQuery({
    queryKey: ['societes'],
    queryFn: async () => {
      const response = await fetch('/api/societes');
      if (!response.ok) throw new Error('Failed to fetch companies');
      const data = await response.json();
      return data.companies || data.societes || data || [];
    },
  });

  const patients = Array.isArray(patientsData) ? patientsData : [];
  const companies = Array.isArray(companiesData) ? companiesData : [];

  // Fetch current user info and stock locations
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/session');
      if (!response.ok) throw new Error('Failed to fetch user session');
      return response.json();
    },
  });

  // Fetch stock locations
  const { data: stockLocations } = useQuery({
    queryKey: ['stock-locations'],
    queryFn: async () => {
      const response = await fetch('/api/stock/locations');
      if (!response.ok) throw new Error('Failed to fetch stock locations');
      return response.json();
    },
  });

  useEffect(() => {
    if (articlesData && Array.isArray(articlesData)) {
      setArticles(articlesData);
    }
  }, [articlesData]);

  // Set user role and default stock location
  useEffect(() => {
    if (currentUser?.user) {
      setUserRole(currentUser.user.role);
      // Set default stock location for admin (their own location) - only once
      if (currentUser.user.role === 'ADMIN' && currentUser.user.stockLocationId && !stockLocationInitialized.current) {
        stockLocationInitialized.current = true;
        setNewArticle(prev => ({
          ...prev,
          stockLocationId: currentUser.user.stockLocationId
        }));
      }
    }
  }, [currentUser?.user?.role, currentUser?.user?.stockLocationId]);

  // Filter sales when client is selected - use useMemo to avoid infinite loops
  const clientSales = useMemo(() => {
    if (selectedClient && salesData) {
      return salesData.filter((sale: any) => {
        if (selectedClient.type === 'patient') {
          return sale.patientId === selectedClient.id;
        } else {
          return sale.companyId === selectedClient.id;
        }
      });
    }
    return [];
  }, [selectedClient, salesData]);

  // Fetch available stock when product and location are selected
  useEffect(() => {
    const fetchStock = async () => {
      if (newArticle.productId && newArticle.stockLocationId) {
        try {
          const response = await fetch(`/api/stocks?locationId=${newArticle.stockLocationId}&productId=${newArticle.productId}`);
          if (response.ok) {
            const data = await response.json();
            setAvailableStock(data.stock?.quantity || 0);
          } else {
            setAvailableStock(0);
          }
        } catch (error) {
          console.error('Error fetching stock:', error);
          setAvailableStock(0);
        }
      } else {
        setAvailableStock(0);
      }
    };

    fetchStock();
  }, [newArticle.productId, newArticle.stockLocationId]);

  // Filter articles
  const filteredArticles = useMemo(() => {
    if (!Array.isArray(articles)) return [];

    return articles.filter(article => {
      const searchLower = searchTerm.toLowerCase();

      // Client search
      const clientName = article.sale?.patient
        ? `${article.sale.patient.firstName} ${article.sale.patient.lastName}`.toLowerCase()
        : article.sale?.company?.companyName?.toLowerCase() || '';

      const matchesSearch = (
        article.sale?.saleCode?.toLowerCase().includes(searchLower) ||
        article.sale?.invoiceNumber?.toLowerCase().includes(searchLower) ||
        clientName.includes(searchLower) ||
        article.product?.name?.toLowerCase().includes(searchLower) ||
        article.product?.productCode?.toLowerCase().includes(searchLower) ||
        article.medicalDevice?.name?.toLowerCase().includes(searchLower) ||
        article.medicalDevice?.serialNumber?.toLowerCase().includes(searchLower) ||
        article.serialNumber?.toLowerCase().includes(searchLower)
      );

      // Client type filter
      const matchesClientType = (() => {
        if (clientTypeFilter === 'all') return true;
        if (clientTypeFilter === 'patient') return !!article.sale?.patient;
        if (clientTypeFilter === 'company') return !!article.sale?.company;
        return true;
      })();

      // Article type filter
      const matchesArticleType = (() => {
        if (articleTypeFilter === 'all') return true;
        if (articleTypeFilter === 'product') return !!article.productId;
        if (articleTypeFilter === 'medical-device') return !!article.medicalDeviceId;
        return true;
      })();

      return matchesSearch && matchesClientType && matchesArticleType;
    });
  }, [articles, searchTerm, clientTypeFilter, articleTypeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedArticles = filteredArticles.slice(startIndex, endIndex);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (articleData: any) => {
      const response = await fetch('/api/sale-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articleData),
      });
      if (!response.ok) throw new Error('Failed to create article');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-items'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({ title: 'Succès', description: 'Article ajouté avec succès' });
      setIsAddingNew(false);
      setSelectedClient(null);
      setSelectedArticle(null);
      setNewArticle({
        saleId: '',
        productId: '',
        medicalDeviceId: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        serialNumber: '',
        description: '',
        stockLocationId: '',
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter l\'article',
        variant: 'destructive'
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/sale-items/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete article');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-items'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({ title: 'Succès', description: 'Article supprimé avec succès' });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'article',
        variant: 'destructive'
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/sale-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update article');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-items'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({ title: 'Succès', description: 'Article modifié avec succès' });
      setEditingId(null);
      setEditedData({});
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier l\'article',
        variant: 'destructive'
      });
    },
  });

  const handleEdit = (article: SaleItem) => {
    setEditingId(article.id);
    setEditedData({
      quantity: article.quantity,
      unitPrice: article.unitPrice,
      discount: article.discount || 0,
      description: article.description || '',
      saleId: article.saleId,
      productId: article.productId || '',
      medicalDeviceId: article.medicalDeviceId || '',
      serialNumber: article.serialNumber || '',
    });

    // Set selected client and article for editing
    if (article.sale?.patient) {
      setSelectedClient({
        type: 'patient',
        id: article.sale.patient.id,
        name: `${article.sale.patient.firstName} ${article.sale.patient.lastName}`
      });
    } else if (article.sale?.company) {
      setSelectedClient({
        type: 'company',
        id: article.sale.company.id,
        name: article.sale.company.companyName
      });
    }

    if (article.product) {
      setSelectedArticle({
        type: 'product',
        id: article.product.id,
        name: article.product.name,
        code: article.product.productCode,
        unitPrice: article.unitPrice,
      });
    } else if (article.medicalDevice) {
      setSelectedArticle({
        type: 'medical-device',
        id: article.medicalDevice.id,
        name: article.medicalDevice.name,
        code: article.medicalDevice.deviceCode,
        serialNumber: article.medicalDevice.serialNumber,
        unitPrice: article.unitPrice,
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedData({});
    setSelectedClient(null);
    setSelectedArticle(null);
  };

  const handleSaveEdit = (articleId: string) => {
    const finalQuantity = editedData.medicalDeviceId ? 1 : (editedData.quantity || 1);
    const itemTotal = ((editedData.unitPrice || 0) * finalQuantity) - (editedData.discount || 0);

    // Validate itemTotal
    if (itemTotal > 99999999.99) {
      toast({
        title: 'Erreur',
        description: 'Le montant total est trop élevé',
        variant: 'destructive'
      });
      return;
    }

    const updatePayload: any = {
      quantity: finalQuantity,
      unitPrice: editedData.unitPrice,
      discount: editedData.discount || 0,
      description: editedData.description || '',
      itemTotal,
    };

    // Include sale change if modified
    if (editedData.saleId) {
      updatePayload.saleId = editedData.saleId;
    }

    // Include product/device changes
    if (editedData.productId) {
      updatePayload.productId = editedData.productId;
    }
    if (editedData.medicalDeviceId) {
      updatePayload.medicalDeviceId = editedData.medicalDeviceId;
    }

    // Include serial number
    if (editedData.serialNumber !== undefined) {
      updatePayload.serialNumber = editedData.serialNumber;
    }

    updateMutation.mutate({
      id: articleId,
      data: updatePayload
    });
  };

  const handleSaveNew = () => {
    if (!newArticle.saleId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une vente',
        variant: 'destructive'
      });
      return;
    }

    if (!newArticle.productId && !newArticle.medicalDeviceId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un article',
        variant: 'destructive'
      });
      return;
    }

    // For medical devices, quantity is always 1
    const finalQuantity = newArticle.medicalDeviceId ? 1 : newArticle.quantity;
    const itemTotal = (newArticle.unitPrice * finalQuantity) - (newArticle.discount || 0);

    // Validate itemTotal is within database limits (Decimal(10,2) = max 99999999.99)
    if (itemTotal > 99999999.99) {
      toast({
        title: 'Erreur',
        description: 'Le montant total est trop élevé',
        variant: 'destructive'
      });
      return;
    }

    createMutation.mutate({
      ...newArticle,
      quantity: finalQuantity,
      itemTotal,
    });
  };

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setSelectedClient(null);
    setSelectedArticle(null);
    setNewArticle({
      saleId: '',
      productId: '',
      medicalDeviceId: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      serialNumber: '',
      description: '',
      stockLocationId: '',
    });
  };

  const handleClientSelect = (type: 'patient' | 'company', id: string, name: string) => {
    setSelectedClient({ type, id, name });
    setClientDialogOpen(false);
    setClientSearchTerm('');

    // If in edit mode, reset the sale selection since client changed
    if (editingId) {
      setEditedData({
        ...editedData,
        saleId: '',
      });
    }
  };

  const handleArticleSelect = (article: {
    type: 'product' | 'medical-device' | 'accessory' | 'spare-part' | 'diagnostic';
    id: string;
    name: string;
    serialNumber?: string;
    unitPrice: number;
  }) => {
    setSelectedArticle(article);

    if (editingId) {
      // In edit mode, update edited data
      setEditedData({
        ...editedData,
        productId: article.type === 'product' || article.type === 'accessory' || article.type === 'spare-part' ? article.id : '',
        medicalDeviceId: article.type === 'medical-device' || article.type === 'diagnostic' ? article.id : '',
        serialNumber: article.serialNumber || '',
        unitPrice: article.unitPrice,
      });
    } else {
      // In add mode, update new article
      setNewArticle({
        ...newArticle,
        productId: article.type === 'product' || article.type === 'accessory' || article.type === 'spare-part' ? article.id : '',
        medicalDeviceId: article.type === 'medical-device' || article.type === 'diagnostic' ? article.id : '',
        serialNumber: article.serialNumber || '',
        unitPrice: article.unitPrice,
      });
    }
  };

  const handleConfigureParameters = () => {
    if (selectedArticle && (selectedArticle.type === 'medical-device' || selectedArticle.type === 'diagnostic')) {
      setConfiguringDevice({
        id: selectedArticle.id,
        name: selectedArticle.name,
        serialNumber: selectedArticle.serialNumber,
        type: selectedArticle.type === 'diagnostic' ? 'DIAGNOSTIC_DEVICE' : 'MEDICAL_DEVICE',
      });
      setParameterDialogOpen(true);
    }
  };

  // Get initial parameters for dialog
  const getInitialParameters = () => {
    // Parameters functionality disabled - SaleItem doesn't have parameters field
    return null;
  };

  const handleSaveParameters = (deviceId: string, parameters: any) => {
    // Parameters functionality disabled - SaleItem doesn't have parameters field
    // Configuration should be handled through SaleConfiguration relation
    console.warn('Parameters saving is disabled - use SaleConfiguration instead');
  };

  // Note: Parameter configuration has been disabled as SaleItem doesn't have parameters field
  // Configuration should be handled through SaleConfiguration relation

  // Filter clients for search
  const filteredClients = useMemo(() => {
    const searchLower = clientSearchTerm.toLowerCase();
    const patientsList = (patients || []).map((p: any) => ({
      type: 'patient' as const,
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      code: p.patientCode,
    }));
    const companiesList = (companies || []).map((c: any) => ({
      type: 'company' as const,
      id: c.id,
      name: c.companyName,
      code: c.companyCode,
    }));

    const allClients = [...patientsList, ...companiesList];

    if (!searchLower) return allClients;

    return allClients.filter(client =>
      client.name.toLowerCase().includes(searchLower) ||
      client.code?.toLowerCase().includes(searchLower)
    );
  }, [patients, companies, clientSearchTerm]);

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedData({});
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  const isEditing = (id: string) => editingId === id;
  const currentData = (article: SaleItem) => isEditing(article.id) ? { ...article, ...editedData } : article;

  // Count active filters
  const activeFiltersCount = [
    searchTerm !== '',
    clientTypeFilter !== 'all',
    articleTypeFilter !== 'all',
  ].filter(Boolean).length;

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setClientTypeFilter('all');
    setArticleTypeFilter('all');
  };

  return (
    <div className="space-y-4">
      {/* Add New Article Button */}
      {!isAddingNew && (
        <div className="mb-4">
          <Button onClick={() => setIsAddingNew(true)} className="gap-2 bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4" />
            Ajouter Article
          </Button>
        </div>
      )}

      {/* Central Filter Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Filtres de Recherche</h3>
              <p className="text-sm text-slate-600">
                {filteredArticles.length} article(s) sur {articles.length} au total
                {activeFiltersCount > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    ({activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''})
                  </span>
                )}
              </p>
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <X className="h-4 w-4 mr-2" />
              Réinitialiser les filtres
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher par vente, produit, code, numéro de série, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-white border-slate-300 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Client Type Filter */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Type de Client</label>
            <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
              <SelectTrigger className="w-full bg-white border-slate-300">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les clients</SelectItem>
                <SelectItem value="patient">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    Patients
                  </div>
                </SelectItem>
                <SelectItem value="company">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    Sociétés
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Article Type Filter */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Type d'Article</label>
            <Select value={articleTypeFilter} onValueChange={setArticleTypeFilter}>
              <SelectTrigger className="w-full bg-white border-slate-300">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les articles</SelectItem>
                <SelectItem value="product">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-green-600" />
                    Produits
                  </div>
                </SelectItem>
                <SelectItem value="medical-device">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-red-600" />
                    Appareils Médicaux
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Code Vente</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Facture</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[180px]">Client</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Type</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[200px]">Article</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">N° Série</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[300px]">Description</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[200px]">Stock</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[400px]">Config</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[80px]">Qté</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Prix U.</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[100px]">Remise</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700 border-r border-slate-200 min-w-[120px]">Total</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 sticky right-0 bg-slate-50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* New Article Row */}
              {isAddingNew && (
                <tr className="bg-green-50 border-b-2 border-green-200">
                  {/* Client Selector */}
                  <td colSpan={2} className="px-3 py-2.5 border-r border-slate-100">
                    <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="h-8 w-full text-xs justify-start">
                          <Users className="h-4 w-4 mr-2" />
                          {selectedClient ? selectedClient.name : 'Sélectionner Client'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[600px]">
                        <DialogHeader>
                          <DialogTitle>Sélectionner un Client</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Search */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Rechercher par nom ou code..."
                              value={clientSearchTerm}
                              onChange={(e) => setClientSearchTerm(e.target.value)}
                              className="pl-10"
                            />
                          </div>

                          {/* Clients List */}
                          <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                            {filteredClients.map((client) => (
                              <div
                                key={`${client.type}-${client.id}`}
                                className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                                onClick={() => handleClientSelect(client.type, client.id, client.name)}
                              >
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className={client.type === 'patient' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-orange-50 text-orange-700 border-orange-200'}>
                                    {client.type === 'patient' ? 'Patient' : 'Société'}
                                  </Badge>
                                  <div>
                                    <div className="font-medium">{client.name}</div>
                                    <div className="text-xs text-gray-500">{client.code}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </td>

                  {/* Sale & Invoice */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    {selectedClient ? (
                      <Select value={newArticle.saleId} onValueChange={(value) => setNewArticle({...newArticle, saleId: value})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Sélectionner vente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientSales.map((sale: any) => (
                            <SelectItem key={sale.id} value={sale.id}>
                              {sale.saleCode} - {sale.invoiceNumber || 'N/A'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input disabled placeholder="Sélectionner client d'abord" className="h-8 text-xs bg-gray-100" />
                    )}
                  </td>

                  {/* Article Selector Button - spans Type and Article columns */}
                  <td colSpan={2} className="px-3 py-2.5 border-r border-slate-100">
                    <Button
                      variant="outline"
                      className="h-8 w-full text-xs justify-start overflow-hidden"
                      onClick={() => setArticleDialogOpen(true)}
                      disabled={!newArticle.saleId}
                    >
                      <Package className="h-4 w-4 mr-2 shrink-0" />
                      {selectedArticle ? (
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {selectedArticle.code && (
                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-xs font-mono shrink-0">
                              {selectedArticle.code}
                            </Badge>
                          )}
                          <span className="truncate">{selectedArticle.name}</span>
                        </div>
                      ) : (
                        'Sélectionner Article'
                      )}
                    </Button>
                  </td>

                  {/* Serial Number */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    {selectedArticle?.serialNumber ? (
                      <Input
                        type="text"
                        value={selectedArticle.serialNumber}
                        disabled
                        className="h-8 text-xs bg-gray-100"
                      />
                    ) : (
                      <div className="text-xs text-center text-gray-400">-</div>
                    )}
                  </td>

                  {/* Description */}
                  <td className="px-3 py-2.5 border-r border-slate-100 min-w-[200px]">
                    <textarea
                      value={newArticle.description}
                      onChange={(e) => setNewArticle({...newArticle, description: e.target.value})}
                      placeholder="Description ou note..."
                      className="w-full h-8 text-xs border border-gray-300 rounded px-2 py-1 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={1}
                    />
                  </td>

                  {/* Stock Location - Always render column for table alignment */}
                  <td className="px-3 py-2.5 border-r border-slate-100 min-w-[200px]">
                    {selectedArticle && selectedArticle.type !== 'medical-device' && selectedArticle.type !== 'diagnostic' && userRole === 'ADMIN' ? (
                      <div className="space-y-1">
                        <Select
                          value={newArticle.stockLocationId}
                          onValueChange={(value) => setNewArticle({...newArticle, stockLocationId: value})}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Sélectionner stock" />
                          </SelectTrigger>
                          <SelectContent>
                            {stockLocations?.map((location: any) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {availableStock > 0 && (
                          <div className="text-xs text-green-600 font-medium">
                            Disponible: {availableStock}
                          </div>
                        )}
                        {newArticle.stockLocationId && availableStock === 0 && (
                          <div className="text-xs text-red-600 font-medium">
                            Stock épuisé
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-center text-gray-400">-</div>
                    )}
                  </td>

                  {/* Configuration */}
                  <td className="px-3 py-2.5 border-r border-slate-100 min-w-[400px]">
                    {selectedArticle && (selectedArticle.type === 'medical-device' || selectedArticle.type === 'diagnostic') ? (
                      <div className="flex items-center gap-2">
                        {/* Parameters functionality disabled - SaleItem doesn't have parameters field */}
                        {false && (
                          <div className="text-xs text-slate-700 bg-green-50 px-2 py-1 rounded border border-green-200 whitespace-nowrap overflow-x-auto flex-1">
                            {(() => {
                              const params: any = null;
                              const paramList = [];
                              // CPAP parameters
                              if (params.pression) paramList.push(`P: ${params.pression}`);
                              if (params.pressionRampe) paramList.push(`P.Rampe: ${params.pressionRampe}`);
                              if (params.dureeRampe) paramList.push(`Durée: ${params.dureeRampe}min`);
                              if (params.epr) paramList.push(`EPR: ${params.epr}`);
                              // VNI parameters
                              if (params.ipap) paramList.push(`IPAP: ${params.ipap}`);
                              if (params.epap) paramList.push(`EPAP: ${params.epap}`);
                              if (params.aid) paramList.push(`AID: ${params.aid}`);
                              if (params.mode) paramList.push(`Mode: ${params.mode}`);
                              if (params.frequenceRespiratoire) paramList.push(`FR: ${params.frequenceRespiratoire}`);
                              if (params.volumeCourant) paramList.push(`VT: ${params.volumeCourant}`);
                              // Oxygen concentrator
                              if (params.debit) paramList.push(`Débit: ${params.debit}`);
                              return paramList.length > 0 ? paramList.join(' • ') : 'Configuré';
                            })()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-center text-gray-400">-</div>
                    )}
                  </td>

                  {/* Quantity */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    {selectedArticle && (selectedArticle.type === 'medical-device' || selectedArticle.type === 'diagnostic') ? (
                      <div className="text-xs text-center text-gray-400">-</div>
                    ) : (
                      <Input
                        type="number"
                        value={newArticle.quantity}
                        onChange={(e) => setNewArticle({...newArticle, quantity: parseInt(e.target.value) || 1})}
                        className="h-8 text-xs text-center"
                        min="1"
                      />
                    )}
                  </td>

                  {/* Unit Price */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Input
                      type="number"
                      value={newArticle.unitPrice}
                      onChange={(e) => setNewArticle({...newArticle, unitPrice: parseFloat(e.target.value) || 0})}
                      className="h-8 text-xs text-right"
                      step="0.01"
                    />
                  </td>

                  {/* Discount */}
                  <td className="px-3 py-2.5 border-r border-slate-100">
                    <Input
                      type="number"
                      value={newArticle.discount}
                      onChange={(e) => setNewArticle({...newArticle, discount: parseFloat(e.target.value) || 0})}
                      className="h-8 text-xs text-right"
                      step="0.01"
                    />
                  </td>

                  {/* Total */}
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-green-700 border-r border-slate-100">
                    {formatCurrency((newArticle.unitPrice * newArticle.quantity) - (newArticle.discount || 0))}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5 sticky right-0 bg-green-50">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveNew}
                        className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700"
                        title="Sauvegarder"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelNew}
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                        title="Annuler"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {paginatedArticles.length === 0 && !isAddingNew ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-slate-500">
                    Aucun article trouvé
                  </td>
                </tr>
              ) : (
                paginatedArticles.map((article, index) => {
                  const data = currentData(article);

                  // Get article name
                  const getArticleName = () => {
                    return article.product?.name || article.medicalDevice?.name || '-';
                  };

                  // Format configuration for display
                  const formatConfiguration = (config: any) => {
                    if (!config) return null;
                    const paramList = [];
                    // CPAP parameters
                    if (config.pression) paramList.push(`P: ${config.pression}`);
                    if (config.pressionRampe) paramList.push(`P.Rampe: ${config.pressionRampe}`);
                    if (config.dureeRampe) paramList.push(`Durée: ${config.dureeRampe}min`);
                    if (config.epr) paramList.push(`EPR: ${config.epr}`);
                    // VNI parameters
                    if (config.ipap) paramList.push(`IPAP: ${config.ipap}`);
                    if (config.epap) paramList.push(`EPAP: ${config.epap}`);
                    if (config.aid) paramList.push(`AID: ${config.aid}`);
                    if (config.mode) paramList.push(`Mode: ${config.mode}`);
                    if (config.frequenceRespiratoire) paramList.push(`FR: ${config.frequenceRespiratoire}`);
                    if (config.volumeCourant) paramList.push(`VT: ${config.volumeCourant}`);
                    // Oxygen concentrator
                    if (config.debit) paramList.push(`Débit: ${config.debit}`);
                    return paramList.length > 0 ? paramList.join(', ') : null;
                  };

                  return (
                    <tr
                      key={article.id}
                      className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      {/* Sale Code / Client Selector in Edit */}
                      {editingId === article.id ? (
                        <td colSpan={2} className="px-3 py-2.5 border-r border-slate-100">
                          <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="h-8 w-full text-xs justify-start">
                                <Users className="h-4 w-4 mr-2" />
                                {selectedClient ? selectedClient.name : 'Changer Client'}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[600px]">
                              <DialogHeader>
                                <DialogTitle>Sélectionner un Client</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <Input
                                    placeholder="Rechercher par nom ou code..."
                                    value={clientSearchTerm}
                                    onChange={(e) => setClientSearchTerm(e.target.value)}
                                    className="pl-10"
                                  />
                                </div>
                                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                                  {filteredClients.map((client) => (
                                    <div
                                      key={`${client.type}-${client.id}`}
                                      className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                                      onClick={() => handleClientSelect(client.type, client.id, client.name)}
                                    >
                                      <div className="flex items-center gap-3">
                                        <Badge variant="outline" className={client.type === 'patient' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-orange-50 text-orange-700 border-orange-200'}>
                                          {client.type === 'patient' ? 'Patient' : 'Société'}
                                        </Badge>
                                        <div>
                                          <div className="font-medium">{client.name}</div>
                                          <div className="text-xs text-gray-500">{client.code}</div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </td>
                      ) : (
                        <>
                          {/* Sale Code */}
                          <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                            <Badge variant="outline" className="text-xs font-mono">
                              {article.sale?.saleCode || 'N/A'}
                            </Badge>
                          </td>

                          {/* Invoice Number */}
                          <td className="px-3 py-2.5 text-xs border-r border-slate-100 whitespace-nowrap">
                            <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
                              {article.sale?.invoiceNumber || 'N/A'}
                            </Badge>
                          </td>
                        </>
                      )}

                      {/* Client / Sale Selector in Edit */}
                      {editingId === article.id ? (
                        <td className="px-3 py-2.5 border-r border-slate-100">
                          {selectedClient ? (
                            <Select value={editedData.saleId} onValueChange={(value) => setEditedData({...editedData, saleId: value})}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Sélectionner vente" />
                              </SelectTrigger>
                              <SelectContent>
                                {clientSales.map((sale: any) => (
                                  <SelectItem key={sale.id} value={sale.id}>
                                    {sale.saleCode} - {sale.invoiceNumber || 'N/A'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input disabled placeholder="Sélectionner client d'abord" className="h-8 text-xs bg-gray-100" />
                          )}
                        </td>
                      ) : (
                        <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                          {article.sale?.patient ? (
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <Users className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                              <span className="text-xs font-medium">
                                {article.sale.patient.lastName.toUpperCase()} {article.sale.patient.firstName}
                              </span>
                            </div>
                          ) : article.sale?.company ? (
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <Building2 className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                              <span className="text-xs font-medium">
                                {article.sale.company.companyName}
                              </span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      )}

                      {/* Type & Article - Editable */}
                      {editingId === article.id ? (
                        <td colSpan={2} className="px-3 py-2.5 border-r border-slate-100">
                          <Button
                            variant="outline"
                            className="h-8 w-full text-xs justify-start overflow-hidden"
                            onClick={() => setArticleDialogOpen(true)}
                          >
                            <Package className="h-4 w-4 mr-2 shrink-0" />
                            {selectedArticle ? (
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                {selectedArticle.code && (
                                  <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-xs font-mono shrink-0">
                                    {selectedArticle.code}
                                  </Badge>
                                )}
                                <span className="truncate">{selectedArticle.name}</span>
                              </div>
                            ) : (
                              'Changer Article'
                            )}
                          </Button>
                        </td>
                      ) : (
                        <>
                          {/* Type */}
                          <td className="px-3 py-2.5 text-xs border-r border-slate-100">
                            {article.productId && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                Produit
                              </Badge>
                            )}
                            {article.medicalDeviceId && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                Appareil
                              </Badge>
                            )}
                            {!article.productId && !article.medicalDeviceId && '-'}
                          </td>

                          {/* Article Name */}
                          <td className="px-3 py-2.5 text-sm text-slate-900 border-r border-slate-100">
                            <div className="flex items-center gap-2">
                              {(article.product?.productCode || article.medicalDevice?.deviceCode) && (
                                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-xs font-mono shrink-0">
                                  {article.product?.productCode || article.medicalDevice?.deviceCode}
                                </Badge>
                              )}
                              <span>{getArticleName()}</span>
                            </div>
                          </td>
                        </>
                      )}

                      {/* Serial Number */}
                      <td className="px-3 py-2.5 text-xs font-mono text-slate-600 border-r border-slate-100">
                        {article.medicalDevice?.serialNumber || article.serialNumber || '-'}
                      </td>

                      {/* Description */}
                      <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100 min-w-[300px]">
                        {editingId === article.id ? (
                          <textarea
                            value={editedData.description || ''}
                            onChange={(e) => setEditedData({...editedData, description: e.target.value})}
                            placeholder="Description ou note..."
                            className="w-full h-8 text-xs border border-gray-300 rounded px-2 py-1 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={1}
                          />
                        ) : (
                          <div className="text-xs text-slate-600 truncate" title={article.description || ''}>
                            {article.description || '-'}
                          </div>
                        )}
                      </td>

                      {/* Stock - Show source location for sold articles */}
                      <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100">
                        {article.sale?.assignedTo?.stockLocation?.name ? (
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500">Sortie de:</span>
                            <span className="text-xs font-medium text-blue-600">
                              {article.sale.assignedTo.stockLocation.name}
                            </span>
                          </div>
                        ) : (
                          <div className="text-center text-gray-400">-</div>
                        )}
                      </td>

                      {/* Configuration */}
                      <td className="px-3 py-2.5 text-xs text-slate-600 border-r border-slate-100 min-w-[400px]">
                        {editingId === article.id ? (
                          selectedArticle && (selectedArticle.type === 'medical-device' || selectedArticle.type === 'diagnostic') ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs shrink-0"
                                onClick={handleConfigureParameters}
                              >
                                <Settings className="h-3 w-3 mr-1" />
                                {article.configuration ? 'Modifier' : 'Config'}
                              </Button>
                              {article.configuration && (
                                <div className="text-xs text-slate-700 bg-green-50 px-2 py-1 rounded border border-green-200 whitespace-nowrap overflow-x-auto flex-1">
                                  {formatConfiguration(article.configuration) || 'Configuré'}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-center text-gray-400">-</div>
                          )
                        ) : (
                          article.configuration ? (
                            <div className="text-xs text-slate-700 bg-green-50 px-2 py-1 rounded border border-green-200 whitespace-nowrap overflow-x-auto">
                              {formatConfiguration(article.configuration) || 'Configuré'}
                            </div>
                          ) : (
                            <div className="text-center">-</div>
                          )
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="px-3 py-2.5 text-center text-sm border-r border-slate-100">
                        {editingId === article.id ? (
                          article.medicalDeviceId ? (
                            <div className="text-xs text-center text-gray-400">-</div>
                          ) : (
                            <Input
                              type="number"
                              value={editedData.quantity}
                              onChange={(e) => setEditedData({...editedData, quantity: parseInt(e.target.value) || 1})}
                              className="h-8 text-xs text-center"
                              min="1"
                            />
                          )
                        ) : (
                          article.medicalDeviceId ? '-' : article.quantity
                        )}
                      </td>

                      {/* Unit Price */}
                      <td className="px-3 py-2.5 text-right text-sm text-slate-900 border-r border-slate-100">
                        {editingId === article.id ? (
                          <Input
                            type="number"
                            value={editedData.unitPrice}
                            onChange={(e) => setEditedData({...editedData, unitPrice: parseFloat(e.target.value) || 0})}
                            className="h-8 text-xs text-right"
                            step="0.01"
                          />
                        ) : (
                          formatCurrency(Number(article.unitPrice))
                        )}
                      </td>

                      {/* Discount */}
                      <td className="px-3 py-2.5 text-right text-xs text-slate-600 border-r border-slate-100">
                        {editingId === article.id ? (
                          <Input
                            type="number"
                            value={editedData.discount}
                            onChange={(e) => setEditedData({...editedData, discount: parseFloat(e.target.value) || 0})}
                            className="h-8 text-xs text-right"
                            step="0.01"
                          />
                        ) : (
                          article.discount ? formatCurrency(Number(article.discount)) : '-'
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-3 py-2.5 text-right text-sm font-bold text-green-700 border-r border-slate-100">
                        {formatCurrency(Number(article.itemTotal))}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5 sticky right-0 bg-inherit shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-center gap-1">
                          {editingId === article.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSaveEdit(article.id)}
                                className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700"
                                title="Sauvegarder"
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
                                className="h-8 w-8 p-0 hover:bg-gray-100 hover:text-gray-700"
                                title="Annuler"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(article)}
                                className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                                title="Modifier"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(article.id)}
                                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          {filteredArticles.length} article(s) au total
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Précédent
          </Button>
          <span className="text-sm text-slate-600">
            Page {currentPage} sur {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Suivant
          </Button>
        </div>
      </div>

      {/* Article Selection Dialog */}
      <ArticleSelectionDialog
        open={articleDialogOpen}
        onClose={() => setArticleDialogOpen(false)}
        onSelect={handleArticleSelect}
      />

      {/* Parameter Configuration Dialog */}
      {configuringDevice && (
        <ProductParameterDialog
          isOpen={parameterDialogOpen}
          onClose={() => {
            setParameterDialogOpen(false);
            setConfiguringDevice(null);
          }}
          product={configuringDevice}
          onSaveParameters={handleSaveParameters}
          initialParameters={getInitialParameters()}
        />
      )}
    </div>
  );
}
