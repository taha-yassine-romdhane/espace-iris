import React from 'react';
import { Product } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PackageIcon, TagIcon, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface ProductHeaderProps {
  product: Product;
}

export const ProductHeader: React.FC<ProductHeaderProps> = ({ product }) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <PackageIcon className="mr-2 h-5 w-5" />
            {product.name}
          </CardTitle>
          <Badge variant={product.status === 'ACTIVE' ? 'success' : 'destructive'}>
            {product.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Type</span>
            <span className="font-medium">{product.type}</span>
          </div>
          
          {product.brand && (
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Marque</span>
              <span className="font-medium">{product.brand}</span>
            </div>
          )}
          
          {product.model && (
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Modèle</span>
              <span className="font-medium">{product.model}</span>
            </div>
          )}
          
          {product.serialNumber && (
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Numéro de série</span>
              <div className="flex items-center">
                <TagIcon className="mr-1 h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{product.serialNumber}</span>
              </div>
            </div>
          )}
          
          {product.purchasePrice && (
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Prix d'achat</span>
              <span className="font-medium">{product.purchasePrice.toFixed(2)} DT</span>
            </div>
          )}
          
          {product.sellingPrice && (
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Prix de vente</span>
              <span className="font-medium">{product.sellingPrice.toFixed(2)} DT</span>
            </div>
          )}
          
          {product.purchaseDate && (
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Date d'achat</span>
              <div className="flex items-center">
                <CalendarIcon className="mr-1 h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{format(new Date(product.purchaseDate), 'dd/MM/yyyy')}</span>
              </div>
            </div>
          )}
          
          {product.warrantyExpiration && (
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Expiration de garantie</span>
              <div className="flex items-center">
                <CalendarIcon className="mr-1 h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{format(new Date(product.warrantyExpiration), 'dd/MM/yyyy')}</span>
              </div>
            </div>
          )}
        </div>
        
        {product.notes && (
          <div className="mt-4">
            <span className="text-sm text-muted-foreground">Notes</span>
            <p className="mt-1 text-sm">{product.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
