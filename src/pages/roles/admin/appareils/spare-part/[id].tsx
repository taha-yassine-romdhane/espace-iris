import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import prisma from '@/lib/db';
import { Product, Stock, StockLocation } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SparePartDetailProps {
  product: Product & {
    stocks: (Stock & {
      location: StockLocation;
    })[];
  };
}

export default function SparePartDetail({ product }: SparePartDetailProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <div className="container mx-auto p-4">Chargement...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-4"
          onClick={() => router.back()}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <h1 className="text-3xl font-bold">Détails de la pièce de rechange</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations Générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="font-semibold">Nom:</span>
              <span>{product.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Marque:</span>
              <span>{product.brand || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Modèle:</span>
              <span>{product.model || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Numéro de Série:</span>
              <span>{product.serialNumber || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations Financières</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="font-semibold">Prix d'achat:</span>
              <span>{product.purchasePrice ? `${product.purchasePrice.toFixed(2)} TND` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Prix de vente:</span>
              <span>{product.sellingPrice ? `${product.sellingPrice.toFixed(2)} TND` : 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informations sur le Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {product.stocks.length > 0 ? (
              <ul className="space-y-2">
                {product.stocks.map(stock => (
                  <li key={stock.id} className="flex justify-between p-2 border rounded-md">
                    <span>Emplacement: <strong>{stock.location.name}</strong></span>
                    <span>Quantité: <strong>{stock.quantity}</strong></span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Aucune information de stock disponible.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stocks: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!product || product.type !== 'SPARE_PART') {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        product: JSON.parse(JSON.stringify(product)),
      },
    };
  } catch (error) {
    console.error('Error fetching spare part:', error);
    return {
      notFound: true,
    };
  }
};
