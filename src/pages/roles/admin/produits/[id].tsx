import React from 'react';
import { GetServerSideProps } from 'next';
import { Product, Stock, StockLocation, StockTransfer, SaleItem } from '@prisma/client';
import prisma from '@/lib/db';
import { ProductHeader } from '@/components/product/ProductHeader';
import { StockInfo } from '@/components/product/StockInfo';
import { MovementHistory } from '@/components/product/MovementHistory';
import { ProductActions } from '@/components/product/ProductActions';
import { Breadcrumb, BreadcrumbItem, BreadcrumbSeparator, BreadcrumbLink, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { ChevronRightIcon, PackageIcon } from 'lucide-react';

interface ProductDetailPageProps {
  product: Product & {
    stocks: Stock[];
    stockLocation: StockLocation | null;
    transfers: StockTransfer[];
    saleItems: SaleItem[];
  };
}

export default function ProductDetailPage({ product }: ProductDetailPageProps) {
  if (!product) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">Produit non trouvé</h1>
        <p>Le produit demandé n'existe pas ou a été supprimé.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/roles/admin">Tableau de bord</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/roles/admin/stock">Stock</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/roles/admin/produits">Produits</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRightIcon className="h-4 w-4" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage>
            <div className="flex items-center">
              <PackageIcon className="h-4 w-4 mr-1" />
              {product.name}
            </div>
          </BreadcrumbPage>
        </BreadcrumbItem>
      </Breadcrumb>

      <div className="grid grid-cols-1 gap-6 mt-6">
        <ProductHeader product={product} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <StockInfo product={product} />
            <MovementHistory product={product} />
          </div>
          <div>
            <ProductActions product={product} />
          </div>
        </div>
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
        stocks: true,
        stockLocation: true,
        transfers: {
          orderBy: {
            transferDate: 'desc',
          },
        },
        saleItems: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!product) {
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
    console.error('Error fetching product:', error);
    return {
      notFound: true,
    };
  }
};
