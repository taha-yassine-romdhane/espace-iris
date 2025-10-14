import React from 'react';
import { Product } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ClipboardIcon, 
  PencilIcon, 
  TrashIcon, 
  ArchiveIcon,
  ShoppingCartIcon,
  ArrowRightLeftIcon,
  PrinterIcon
} from 'lucide-react';

interface ProductActionsProps {
  product: Product;
}

export const ProductActions: React.FC<ProductActionsProps> = ({ product }) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ClipboardIcon className="mr-2 h-5 w-5" />
          Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Button variant="outline" className="flex items-center justify-start">
            <PencilIcon className="mr-2 h-4 w-4" />
            Modifier
          </Button>
          
          <Button variant="outline" className="flex items-center justify-start">
            <ShoppingCartIcon className="mr-2 h-4 w-4" />
            Ajouter à une vente
          </Button>
          
          <Button variant="outline" className="flex items-center justify-start">
            <ArrowRightLeftIcon className="mr-2 h-4 w-4" />
            Transférer
          </Button>
          
          <Button variant="outline" className="flex items-center justify-start">
            <PrinterIcon className="mr-2 h-4 w-4" />
            Imprimer fiche
          </Button>
          
          {product.status === 'ACTIVE' ? (
            <Button variant="outline" className="flex items-center justify-start text-amber-600 hover:text-amber-700 hover:bg-amber-50">
              <ArchiveIcon className="mr-2 h-4 w-4" />
              Archiver
            </Button>
          ) : (
            <Button variant="outline" className="flex items-center justify-start text-green-600 hover:text-green-700 hover:bg-green-50">
              <ArchiveIcon className="mr-2 h-4 w-4" />
              Réactiver
            </Button>
          )}
          
          <Button variant="outline" className="flex items-center justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
            <TrashIcon className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
