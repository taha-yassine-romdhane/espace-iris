import React from 'react';
import { Product, Stock, StockLocation } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { WarehouseIcon, AlertCircleIcon } from 'lucide-react';

interface StockInfoProps {
  product: Product & {
    stocks?: Stock[];
    stockLocation?: StockLocation | null;
  };
}

export const StockInfo: React.FC<StockInfoProps> = ({ product }) => {
  // Calculate total quantity across all stocks
  const totalQuantity = product.stocks?.reduce((sum, stock) => sum + stock.quantity, 0) || 0;
  
  // Determine if stock is low (less than 5 items)
  const isLowStock = totalQuantity > 0 && totalQuantity < 5;
  
  // Determine if out of stock
  const isOutOfStock = totalQuantity === 0;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <WarehouseIcon className="mr-2 h-5 w-5" />
            Information de stock
          </CardTitle>
          {isOutOfStock ? (
            <Badge variant="destructive" className="flex items-center">
              <AlertCircleIcon className="mr-1 h-4 w-4" />
              Rupture de stock
            </Badge>
          ) : isLowStock ? (
            <Badge variant="warning" className="flex items-center">
              <AlertCircleIcon className="mr-1 h-4 w-4" />
              Stock faible
            </Badge>
          ) : (
            <Badge variant="success">En stock</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">Quantité totale:</span>
            <span className="text-lg font-bold">{totalQuantity}</span>
          </div>
          
          {product.stockLocation && (
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">Emplacement principal:</span>
              <span className="ml-2">{product.stockLocation.name}</span>
            </div>
          )}
        </div>
        
        {product.stocks && product.stocks.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Emplacement</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.stocks.map((stock) => (
                <TableRow key={stock.id}>
                  <TableCell>{stock.locationId || 'Non spécifié'}</TableCell>
                  <TableCell>{stock.quantity}</TableCell>
                  <TableCell>
                    {stock.quantity === 0 ? (
                      <Badge variant="destructive">Rupture</Badge>
                    ) : stock.quantity < 5 ? (
                      <Badge variant="warning">Faible</Badge>
                    ) : (
                      <Badge variant="success">Disponible</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground">Aucune information de stock disponible.</p>
        )}
      </CardContent>
    </Card>
  );
};
