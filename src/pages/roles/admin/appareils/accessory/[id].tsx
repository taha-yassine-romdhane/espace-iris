import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import prisma from '@/lib/db';
import { Product, Stock, StockLocation, Sale, SaleItem, Patient, User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, Edit, Package, DollarSign, MapPin, ShoppingCart, User as UserIcon, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AccessoryDetailProps {
  product: Product & {
    stocks: (Stock & {
      location: StockLocation;
    })[];
    saleItems: (SaleItem & {
      sale: Sale & {
        patient: Patient | null;
        assignedTo: User | null;
      };
    })[];
  };
  allStockLocations: StockLocation[];
  totalSold: number;
  totalRevenue: number;
}

export default function AccessoryDetail({ product, allStockLocations, totalSold, totalRevenue }: AccessoryDetailProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <div className="container mx-auto p-4">Chargement...</div>;
  }

  // Calculate total stock excluding "vendu" location
  const totalStock = product.stocks
    .filter(stock => stock.location.name.toLowerCase() !== 'vendu')
    .reduce((sum, stock) => sum + stock.quantity, 0);

  // Get quantity in "vendu" location (items that have been sold)
  const soldStock = product.stocks
    .filter(stock => stock.location.name.toLowerCase() === 'vendu')
    .reduce((sum, stock) => sum + stock.quantity, 0);

  // Use the maximum between actual sales records and sold stock location
  const actualTotalSold = Math.max(totalSold, soldStock);
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      ACTIVE: 'default',
      OUT_OF_STOCK: 'destructive',
      DISCONTINUED: 'secondary'
    };
    const labels: Record<string, string> = {
      ACTIVE: 'Actif',
      OUT_OF_STOCK: 'Rupture de stock',
      DISCONTINUED: 'Discontinué'
    };
    return { variant: variants[status] || 'default', label: labels[status] || status };
  };

  const statusBadge = getStatusBadge(product.status);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
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
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {product.productCode && (
                <Badge variant="outline" className="font-mono text-blue-900 border-blue-900">
                  {product.productCode}
                </Badge>
              )}
              <Badge variant={statusBadge.variant as any}>
                {statusBadge.label}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          variant="default"
          onClick={() => router.push('/roles/admin/appareils')}
        >
          <Edit className="h-4 w-4 mr-2" />
          Modifier
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Stock Total</p>
                <p className="text-xl font-bold text-blue-600">{totalStock}</p>
              </div>
              <Package className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Vendu</p>
                <p className="text-xl font-bold text-blue-600">{actualTotalSold}</p>
              </div>
              <ShoppingCart className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Revenu Total</p>
                <p className="text-xl font-bold text-blue-600">{totalRevenue.toFixed(2)} DT</p>
              </div>
              <DollarSign className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Prix de Vente</p>
                <p className="text-xl font-bold text-blue-900">{product.sellingPrice ? `${product.sellingPrice} DT` : 'Non défini'}</p>
              </div>
              <DollarSign className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Informations du Produit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nom</p>
                  <p className="font-semibold text-blue-900">{product.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Code Produit</p>
                  <p className="font-mono font-semibold text-blue-900">{product.productCode || 'Non fourni'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Marque</p>
                  <p className="font-semibold text-blue-900">{product.brand || 'Non spécifié'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Modèle</p>
                  <p className="font-semibold text-blue-900">{product.model || 'Non spécifié'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="font-semibold text-blue-900">{product.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Quantité Minimale</p>
                  <p className="font-semibold text-blue-900">{product.minQuantity || 'Non défini'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm text-blue-900">{product.description || 'Aucune description disponible'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sales History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Historique des Ventes
                <Badge variant="secondary" className="ml-2">
                  {product.saleItems.length} vente{product.saleItems.length > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.saleItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Date</TableHead>
                        <TableHead className="whitespace-nowrap">Code Vente</TableHead>
                        <TableHead className="whitespace-nowrap">Patient</TableHead>
                        <TableHead className="whitespace-nowrap">Employé</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Quantité</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Prix Unitaire</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {product.saleItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium whitespace-nowrap text-blue-900">
                            {new Date(item.sale.saleDate).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="outline" className="font-mono text-blue-900 border-blue-900">
                              {item.sale.saleCode || 'Non fourni'}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {item.sale.patient ? (
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                                  {item.sale.patient.firstName?.charAt(0)}{item.sale.patient.lastName?.charAt(0)}
                                </div>
                                <span className="text-sm text-blue-900 font-medium">
                                  {item.sale.patient.firstName} {item.sale.patient.lastName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Non spécifié</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {item.sale.assignedTo ? (
                              <div className="flex items-center gap-1">
                                <UserIcon className="h-3.5 w-3.5 text-blue-700" />
                                <span className="text-sm text-blue-900">
                                  {item.sale.assignedTo.firstName} {item.sale.assignedTo.lastName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Non assigné</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-blue-900 whitespace-nowrap">{item.quantity}</TableCell>
                          <TableCell className="text-right text-blue-900 whitespace-nowrap">{Number(item.unitPrice).toFixed(2)} DT</TableCell>
                          <TableCell className="text-right font-semibold text-blue-900 whitespace-nowrap">{Number(item.itemTotal).toFixed(2)} DT</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune vente enregistrée pour cet accessoire</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Informations Financières
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Prix d'Achat</p>
                <p className="text-lg font-bold text-blue-900">
                  {product.purchasePrice ? `${Number(product.purchasePrice).toFixed(2)} DT` : 'Non défini'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Prix de Vente</p>
                <p className="text-lg font-bold text-blue-900">
                  {product.sellingPrice ? `${Number(product.sellingPrice).toFixed(2)} DT` : 'Non défini'}
                </p>
              </div>
              {product.purchasePrice && product.sellingPrice && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Marge Bénéficiaire</p>
                  <p className="text-lg font-bold text-blue-900">
                    {(Number(product.sellingPrice) - Number(product.purchasePrice)).toFixed(2)} DT
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({(((Number(product.sellingPrice) - Number(product.purchasePrice)) / Number(product.purchasePrice)) * 100).toFixed(1)}%)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Emplacements de Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Show ALL stock locations from the system */}
                {allStockLocations.length > 0 ? (
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
                          <span className={`text-sm font-medium ${isVendu ? 'text-blue-900' : 'text-blue-900'}`}>
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
                    Aucun emplacement de stock configuré
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
    // Fetch the product with its stocks and sales
    const product = await prisma.product.findUnique({
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
                    patientCode: true,
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
    });

    if (!product || product.type !== 'ACCESSORY') {
      return {
        notFound: true,
      };
    }

    // Fetch ALL stock locations from the system
    const allStockLocations = await prisma.stockLocation.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    // Calculate total sold and revenue
    const totalSold = product.saleItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalRevenue = product.saleItems.reduce((sum, item) => sum + Number(item.itemTotal), 0);

    return {
      props: {
        product: JSON.parse(JSON.stringify(product)),
        allStockLocations: JSON.parse(JSON.stringify(allStockLocations)),
        totalSold,
        totalRevenue,
      },
    };
  } catch (error) {
    console.error('Error fetching accessory:', error);
    return {
      notFound: true,
    };
  }
};
