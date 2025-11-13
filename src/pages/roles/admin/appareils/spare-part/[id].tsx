import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import prisma from '@/lib/db';
import { Product, Stock, StockLocation, SaleItem, Sale, Patient, User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, Package, DollarSign, TrendingUp, MapPin, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SparePartDetailProps {
  product: Product & {
    stocks: (Stock & {
      location: StockLocation;
    })[];
    saleItems: (SaleItem & {
      sale: Sale & {
        patient?: Patient | null;
        assignedTo?: User | null;
      };
    })[];
  };
  allStockLocations: StockLocation[];
}

export default function SparePartDetail({ product, allStockLocations }: SparePartDetailProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <div className="container mx-auto p-4">Chargement...</div>;
  }

  // Calculate totals
  const totalStock = product.stocks
    .filter(stock => stock.location.name.toLowerCase() !== 'vendu')
    .reduce((sum, stock) => sum + stock.quantity, 0);

  const soldStock = product.stocks
    .filter(stock => stock.location.name.toLowerCase() === 'vendu')
    .reduce((sum, stock) => sum + stock.quantity, 0);

  const totalRevenue = product.saleItems.reduce((sum, item) => {
    return sum + Number(item.itemTotal || 0);
  }, 0);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="mr-4"
            onClick={() => router.back()}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-blue-900">{product.name}</h1>
            <p className="text-sm text-muted-foreground">
              Code: <span className="font-mono text-blue-900">{product.productCode || 'Non défini'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Stock Total</p>
                <p className="text-xl font-bold text-blue-900">{totalStock}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Vendu</p>
                <p className="text-xl font-bold text-blue-900">{soldStock}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Revenu Total</p>
                <p className="text-xl font-bold text-blue-900">{totalRevenue.toFixed(2)} DT</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Prix de Vente</p>
                <p className="text-xl font-bold text-blue-900">
                  {product.sellingPrice ? `${Number(product.sellingPrice).toFixed(2)} DT` : 'Non défini'}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Information */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-blue-900">Informations du Produit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Nom:</span>
                  <p className="font-medium text-blue-900">{product.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Marque:</span>
                  <p className="font-medium text-blue-900">{product.brand || 'Non fourni'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Modèle:</span>
                  <p className="font-medium text-blue-900">{product.model || 'Non fourni'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">N° de Série:</span>
                  <p className="font-medium text-blue-900">{product.serialNumber || 'Non fourni'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Description:</span>
                  <p className="font-medium text-blue-900">{product.description || 'Non fournie'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Stock Min:</span>
                  <p className="font-medium text-blue-900">{product.minQuantity || 'Non défini'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-blue-900">Informations Financières</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Prix d'Achat:</span>
                  <p className="font-medium text-blue-900">
                    {product.purchasePrice ? `${Number(product.purchasePrice).toFixed(2)} DT` : 'Non défini'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Prix de Vente:</span>
                  <p className="font-medium text-blue-900">
                    {product.sellingPrice ? `${Number(product.sellingPrice).toFixed(2)} DT` : 'Non défini'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sales History */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-blue-900">
                Historique des Ventes ({product.saleItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.saleItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Date</TableHead>
                        <TableHead className="whitespace-nowrap">Patient</TableHead>
                        <TableHead className="whitespace-nowrap">Quantité</TableHead>
                        <TableHead className="whitespace-nowrap">Prix Unit.</TableHead>
                        <TableHead className="whitespace-nowrap">Total</TableHead>
                        <TableHead className="whitespace-nowrap">Responsable</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {product.saleItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-nowrap text-xs">
                            {new Date(item.sale.saleDate).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {item.sale.patient
                              ? `${item.sale.patient.firstName} ${item.sale.patient.lastName}`
                              : 'Non assigné'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {Number(item.unitPrice).toFixed(2)} DT
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs font-medium text-blue-900">
                            {Number(item.itemTotal).toFixed(2)} DT
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {item.sale.assignedTo
                              ? `${item.sale.assignedTo.firstName} ${item.sale.assignedTo.lastName}`
                              : 'Non assigné'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-center py-6 text-muted-foreground">
                  Aucune vente enregistrée pour cette pièce
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Stock Locations */}
        <div className="space-y-6">
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-blue-900">Emplacements de Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allStockLocations && allStockLocations.length > 0 ? (
                  allStockLocations.map((location) => {
                    // Find if this product has stock in this location
                    const stockInLocation = product.stocks.find(s => s.locationId === location.id);
                    const quantity = stockInLocation ? stockInLocation.quantity : 0;
                    const isVendu = location.name.toLowerCase() === 'vendu';

                    return (
                      <div
                        key={location.id}
                        className={`flex items-center justify-between p-2 rounded-md border ${
                          isVendu ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isVendu ? (
                            <ShoppingCart className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className={`text-sm font-medium text-blue-900`}>
                            {location.name}
                          </span>
                        </div>
                        <Badge
                          variant={quantity > 0 ? 'default' : 'secondary'}
                          className={`text-xs ${isVendu && quantity > 0 ? 'bg-blue-600' : quantity > 0 ? 'bg-blue-600' : ''}`}
                        >
                          {quantity} unité{quantity !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-3">
                    Aucun emplacement de stock disponible
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };

  try {
    const [product, allStockLocations] = await Promise.all([
      prisma.product.findUnique({
        where: { id },
        include: {
          stocks: {
            include: {
              location: true,
            },
          },
          saleItems: {
            include: {
              sale: {
                include: {
                  patient: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                  assignedTo: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      }),
      prisma.stockLocation.findMany({
        orderBy: {
          name: 'asc',
        },
      }),
    ]);

    if (!product || product.type !== 'SPARE_PART') {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        product: JSON.parse(JSON.stringify(product)),
        allStockLocations: JSON.parse(JSON.stringify(allStockLocations)),
      },
    };
  } catch (error) {
    console.error('Error fetching spare part:', error);
    return {
      notFound: true,
    };
  }
};
