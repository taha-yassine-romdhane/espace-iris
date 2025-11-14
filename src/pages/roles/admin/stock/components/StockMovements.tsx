import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, ArrowLeftRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StockMovement {
  id: string;
  productId: string;
  locationId: string;
  type: 'ENTREE' | 'SORTIE' | 'TRANSFERT';
  quantity: number;
  notes: string | null;
  createdById: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    productCode: string | null;
  };
  location: {
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface StockMovementsResponse {
  movements: StockMovement[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function StockMovements() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data, isLoading } = useQuery<StockMovementsResponse>({
    queryKey: ['stock-movements', page, pageSize, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(typeFilter !== 'all' && { type: typeFilter }),
      });
      const response = await fetch(`/api/stock-movements?${params}`);
      if (!response.ok) throw new Error('Failed to fetch stock movements');
      return response.json();
    },
  });

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'ENTREE':
        return <TrendingUp className="h-4 w-4" />;
      case 'SORTIE':
        return <TrendingDown className="h-4 w-4" />;
      case 'TRANSFERT':
        return <ArrowLeftRight className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'ENTREE':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Entrée</Badge>;
      case 'SORTIE':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Sortie</Badge>;
      case 'TRANSFERT':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Transfert</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Mouvements de Stock</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type de mouvement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les mouvements</SelectItem>
                <SelectItem value="ENTREE">Entrées</SelectItem>
                <SelectItem value="SORTIE">Sorties</SelectItem>
                <SelectItem value="TRANSFERT">Transferts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Emplacement</TableHead>
                    <TableHead className="w-[100px] text-right">Quantité</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Utilisateur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Aucun mouvement de stock trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="text-xs">
                          {format(new Date(movement.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMovementIcon(movement.type)}
                            {getMovementBadge(movement.type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{movement.product.name}</span>
                            {movement.product.productCode && (
                              <span className="text-xs text-gray-500">{movement.product.productCode}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">
                              {movement.type === 'ENTREE' ? 'Entrée à:' : movement.type === 'SORTIE' ? 'Sortie de:' : 'Transfert:'}
                            </span>
                            <span className="text-sm font-medium">{movement.location.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${
                            movement.type === 'ENTREE' ? 'text-green-600' :
                            movement.type === 'SORTIE' ? 'text-red-600' :
                            'text-blue-600'
                          }`}>
                            {movement.type === 'ENTREE' ? '+' : movement.type === 'SORTIE' ? '-' : ''}
                            {movement.quantity}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-600">{movement.notes || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {movement.createdBy.firstName} {movement.createdBy.lastName}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Affichage de {((page - 1) * pageSize) + 1} à {Math.min(page * pageSize, data.total)} sur {data.total} mouvements
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={pageSize.toString()} onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {page} sur {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= data.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
