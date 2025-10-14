import React from 'react';
import { Product, StockTransfer, SaleItem } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowRightIcon, ShoppingCartIcon, ArrowLeftRightIcon } from 'lucide-react';
import { format } from 'date-fns';

interface MovementHistoryProps {
  product: Product & {
    transfers?: StockTransfer[];
    saleItems?: SaleItem[];
  };
}

export const MovementHistory: React.FC<MovementHistoryProps> = ({ product }) => {
  // Combine transfers and sales into a single timeline
  const movements = [
    ...(product.transfers?.map(transfer => ({
      type: 'transfer',
      date: new Date(transfer.transferDate),
      data: transfer,
    })) || []),
    ...(product.saleItems?.map(saleItem => ({
      type: 'sale',
      date: new Date(saleItem.createdAt),
      data: saleItem,
    })) || []),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date descending

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ArrowLeftRightIcon className="mr-2 h-5 w-5" />
          Historique des mouvements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {movements.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Détails</TableHead>
                <TableHead>Quantité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement, index) => {
                if (movement.type === 'transfer') {
                  const transfer = movement.data as StockTransfer;
                  return (
                    <TableRow key={`transfer-${transfer.id}`}>
                      <TableCell>{format(movement.date, 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center w-fit">
                          <ArrowRightIcon className="mr-1 h-4 w-4" />
                          Transfert
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transfer.fromLocationId && transfer.toLocationId ? (
                          <span>
                            De <strong>{transfer.fromLocationId}</strong> à <strong>{transfer.toLocationId}</strong>
                          </span>
                        ) : (
                          <span>Transfert de stock</span>
                        )}
                      </TableCell>
                      <TableCell>{transfer.quantity}</TableCell>
                    </TableRow>
                  );
                } else if (movement.type === 'sale') {
                  const saleItem = movement.data as SaleItem;
                  return (
                    <TableRow key={`sale-${saleItem.id}`}>
                      <TableCell>{format(movement.date, 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center w-fit bg-blue-50">
                          <ShoppingCartIcon className="mr-1 h-4 w-4" />
                          Vente
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {saleItem.saleId ? (
                          <span>
                            Vente <strong>#{saleItem.saleId}</strong>
                          </span>
                        ) : (
                          <span>Vente</span>
                        )}
                      </TableCell>
                      <TableCell>{saleItem.quantity}</TableCell>
                    </TableRow>
                  );
                }
                return null;
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground">Aucun mouvement enregistré pour ce produit.</p>
        )}
      </CardContent>
    </Card>
  );
};
