# Stock Location Tracking - Implementation TODO List

**Date:** 2025-11-13
**Status:** 🔴 NOT STARTED
**Estimated Time:** 6-8 hours
**Risk Level:** HIGH (Production Database)

---

## Pre-Implementation Checklist

### Before Starting ANY Work

- [ ] **Read** `STOCK_LOCATION_TRACKING_IMPLEMENTATION.md` completely
- [ ] **Backup Production Database**
  ```bash
  pg_dump -h localhost -U postgres -d espace_iris > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] **Create a feature branch**
  ```bash
  git checkout -b feature/stock-location-tracking
  ```
- [ ] **Verify current system is working** - test existing sales and rentals
- [ ] **Note current stock quantities** for key products (for verification later)
- [ ] **Inform users** of upcoming maintenance window

---

## Phase 1: Database Schema Update (30 minutes)

### Step 1.1: Update Prisma Schema
**File:** `prisma/schema.prisma`

- [ ] Open `prisma/schema.prisma`
- [ ] Locate `model SaleItem`
- [ ] Add after line with `medicalDeviceId String?`:
  ```prisma
  stockLocationId String?
  ```
- [ ] Locate `medicalDevice   MedicalDevice?` relation
- [ ] Add after that line:
  ```prisma
  stockLocation   StockLocation? @relation(fields: [stockLocationId], references: [id])
  ```
- [ ] Locate the `@@index` lines at bottom of SaleItem model
- [ ] Add new index:
  ```prisma
  @@index([stockLocationId])
  ```
- [ ] Locate `model StockLocation`
- [ ] Find the relations section (stocks, medicalDevices, etc.)
- [ ] Add after `rentalAccessories RentalAccessory[]`:
  ```prisma
  saleItems           SaleItem[]
  ```
- [ ] Save file

### Step 1.2: Validate Schema
- [ ] Run schema validation:
  ```bash
  npx prisma validate
  ```
- [ ] Fix any syntax errors if validation fails
- [ ] Review changes one more time

### Step 1.3: Push to Database
⚠️ **POINT OF NO RETURN - BACKUP VERIFIED?**

- [ ] **Confirm backup exists and is recent**
- [ ] Run db push:
  ```bash
  npx prisma db push
  ```
- [ ] Watch output for errors
- [ ] Verify success message appears
- [ ] Generate Prisma Client:
  ```bash
  npx prisma generate
  ```

### Step 1.4: Verify Database Changes
- [ ] Check database has new fields:
  ```sql
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'SaleItem' AND column_name = 'stockLocationId';
  ```
- [ ] Verify index was created
- [ ] Test Prisma Client can query new fields

**Checkpoint:** Database schema updated ✅

---

## Phase 2: Backend API - Sale Items (2 hours)

### Step 2.1: Update Sale Items POST Endpoint
**File:** `src/pages/api/sale-items/index.ts`

#### 2.1.1: Import stockMovement if needed
- [ ] Check if `StockMovement` is imported in Prisma client usage
- [ ] Verify session and user are available

#### 2.1.2: Update POST Handler (around line 100-300)
- [ ] Locate the POST request handler: `if (req.method === 'POST')`
- [ ] Find where `itemData` is destructured from `req.body`
- [ ] Ensure `stockLocationId` is included in destructuring
- [ ] **Remove or comment out** the old stock location determination logic (lines 114-124):
  ```typescript
  // OLD CODE - REMOVE THIS
  // let stockLocationId: string | null = null;
  // if (itemData.productId) {
  //   if (user?.role === 'ADMIN') {
  //     stockLocationId = itemData.stockLocationId || user.stockLocation?.id || null;
  //   } else if (user?.role === 'EMPLOYEE') {
  //     stockLocationId = user.stockLocation?.id || null;
  //   }
  // }
  ```
- [ ] Add validation for stockLocationId (add after itemData destructuring):
  ```typescript
  // Validate stockLocationId is required
  if (itemData.productId && !itemData.stockLocationId) {
    return res.status(400).json({
      error: 'Stock location is required when selling products (stockLocationId)'
    });
  }
  ```

#### 2.1.3: Wrap Stock Operations in Transaction
- [ ] Find the stock decrement code (around lines 273-285)
- [ ] **Replace entire stock decrement section** with transaction:
  ```typescript
  // Only do stock management for products (not medical devices without stock tracking)
  if (itemData.productId && itemData.stockLocationId) {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get stock and validate availability
      const stock = await tx.stock.findUnique({
        where: {
          productId_locationId: {
            productId: itemData.productId,
            locationId: itemData.stockLocationId,
          },
        },
      });

      if (!stock) {
        throw new Error(`No stock found for this product at the selected location`);
      }

      if (stock.quantity < parseInt(itemData.quantity)) {
        throw new Error(`Insufficient stock. Available: ${stock.quantity}, Requested: ${itemData.quantity}`);
      }

      // 2. Decrease stock quantity
      await tx.stock.update({
        where: { id: stock.id },
        data: {
          quantity: { decrement: parseInt(itemData.quantity) },
        },
      });

      // 3. Create stock movement record (SORTIE)
      await tx.stockMovement.create({
        data: {
          productId: itemData.productId,
          locationId: itemData.stockLocationId,
          type: 'SORTIE',
          quantity: parseInt(itemData.quantity),
          notes: `Vente ${itemData.saleId} - Article vendu`,
          createdById: session.user.id,
        },
      });

      console.log('[SALE-ITEM-CREATE] Success - Stock decreased and movement created');
    });
  }
  ```

#### 2.1.4: Update Response to Include Stock Location
- [ ] Find where SaleItem is returned (usually near end of POST handler)
- [ ] Update the include/select to add stockLocation:
  ```typescript
  include: {
    sale: true,
    product: true,
    medicalDevice: true,
    stockLocation: {  // ADD THIS
      select: {
        id: true,
        name: true,
      },
    },
  }
  ```

#### 2.1.5: Test POST Endpoint
- [ ] Save file
- [ ] Restart dev server if running
- [ ] Test with API client (Postman/Insomnia):
  ```json
  POST /api/sale-items
  {
    "saleId": "existing_sale_id",
    "productId": "existing_product_id",
    "stockLocationId": "existing_location_id",
    "quantity": 1,
    "unitPrice": 100,
    "itemTotal": 100
  }
  ```
- [ ] Verify response includes stockLocation
- [ ] Check database: stock quantity decreased
- [ ] Check database: StockMovement record created with type 'SORTIE'
- [ ] Test without stockLocationId - should return 400 error
- [ ] Test with insufficient stock - should return error

**Checkpoint:** Sale Items POST updated ✅

### Step 2.2: Update Sale Items PUT/PATCH Endpoint
**File:** `src/pages/api/sale-items/[id].ts`

#### 2.2.1: Update GET Handler
- [ ] Find GET handler: `if (req.method === 'GET')`
- [ ] Add stockLocation to include:
  ```typescript
  include: {
    sale: true,
    product: true,
    medicalDevice: true,
    stockLocation: {  // ADD THIS
      select: {
        id: true,
        name: true,
      },
    },
  }
  ```

#### 2.2.2: Update PUT/PATCH Handler
- [ ] Find PUT/PATCH handler
- [ ] Add logic to handle stockLocationId changes:
  ```typescript
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const { id } = req.query;
    const updateData = req.body;

    // Get existing sale item
    const existingSaleItem = await prisma.saleItem.findUnique({
      where: { id: id as string },
    });

    if (!existingSaleItem) {
      return res.status(404).json({ error: 'Sale item not found' });
    }

    // If stockLocationId is changing, we need to handle stock movements
    const isLocationChanging = updateData.stockLocationId &&
                                updateData.stockLocationId !== existingSaleItem.stockLocationId;
    const isQuantityChanging = updateData.quantity &&
                               updateData.quantity !== existingSaleItem.quantity;

    if (existingSaleItem.productId && (isLocationChanging || isQuantityChanging)) {
      await prisma.$transaction(async (tx) => {
        const oldLocationId = existingSaleItem.stockLocationId;
        const newLocationId = updateData.stockLocationId || oldLocationId;
        const oldQuantity = existingSaleItem.quantity;
        const newQuantity = updateData.quantity || oldQuantity;

        // Restore stock to old location
        if (oldLocationId) {
          await tx.stock.update({
            where: {
              productId_locationId: {
                productId: existingSaleItem.productId,
                locationId: oldLocationId,
              },
            },
            data: {
              quantity: { increment: oldQuantity },
            },
          });

          // Create ENTREE movement
          await tx.stockMovement.create({
            data: {
              productId: existingSaleItem.productId,
              locationId: oldLocationId,
              type: 'ENTREE',
              quantity: oldQuantity,
              notes: `Vente ${existingSaleItem.saleId} - Modification article (restauration)`,
              createdById: session.user.id,
            },
          });
        }

        // Decrease stock at new location
        if (newLocationId) {
          const stock = await tx.stock.findUnique({
            where: {
              productId_locationId: {
                productId: existingSaleItem.productId,
                locationId: newLocationId,
              },
            },
          });

          if (!stock || stock.quantity < newQuantity) {
            throw new Error(`Insufficient stock at new location`);
          }

          await tx.stock.update({
            where: { id: stock.id },
            data: {
              quantity: { decrement: newQuantity },
            },
          });

          // Create SORTIE movement
          await tx.stockMovement.create({
            data: {
              productId: existingSaleItem.productId,
              locationId: newLocationId,
              type: 'SORTIE',
              quantity: newQuantity,
              notes: `Vente ${existingSaleItem.saleId} - Modification article`,
              createdById: session.user.id,
            },
          });
        }

        // Update the sale item
        await tx.saleItem.update({
          where: { id: id as string },
          data: updateData,
        });
      });

      const updatedItem = await prisma.saleItem.findUnique({
        where: { id: id as string },
        include: {
          sale: true,
          product: true,
          medicalDevice: true,
          stockLocation: true,
        },
      });

      return res.status(200).json(updatedItem);
    }

    // If no stock changes needed, just update normally
    const updatedItem = await prisma.saleItem.update({
      where: { id: id as string },
      data: updateData,
      include: {
        sale: true,
        product: true,
        medicalDevice: true,
        stockLocation: true,
      },
    });

    return res.status(200).json(updatedItem);
  }
  ```

#### 2.2.3: Update DELETE Handler
- [ ] Find DELETE handler
- [ ] Add stock restoration logic:
  ```typescript
  if (req.method === 'DELETE') {
    const { id } = req.query;

    const saleItem = await prisma.saleItem.findUnique({
      where: { id: id as string },
    });

    if (!saleItem) {
      return res.status(404).json({ error: 'Sale item not found' });
    }

    // If this was a product with stock tracking, restore the stock
    if (saleItem.productId && saleItem.stockLocationId) {
      await prisma.$transaction(async (tx) => {
        // Restore stock
        await tx.stock.update({
          where: {
            productId_locationId: {
              productId: saleItem.productId,
              locationId: saleItem.stockLocationId,
            },
          },
          data: {
            quantity: { increment: saleItem.quantity },
          },
        });

        // Create ENTREE movement
        await tx.stockMovement.create({
          data: {
            productId: saleItem.productId,
            locationId: saleItem.stockLocationId,
            type: 'ENTREE',
            quantity: saleItem.quantity,
            notes: `Vente ${saleItem.saleId} - Article supprimé (restauration stock)`,
            createdById: session.user.id,
          },
        });

        // Delete the sale item
        await tx.saleItem.delete({
          where: { id: id as string },
        });
      });
    } else {
      // No stock tracking, just delete
      await prisma.saleItem.delete({
        where: { id: id as string },
      });
    }

    return res.status(200).json({ message: 'Sale item deleted successfully' });
  }
  ```

#### 2.2.4: Test PUT/DELETE Endpoints
- [ ] Test PUT: Change stockLocationId
- [ ] Verify old stock restored
- [ ] Verify new stock decreased
- [ ] Verify 2 StockMovements created (ENTREE + SORTIE)
- [ ] Test DELETE: Remove sale item
- [ ] Verify stock restored
- [ ] Verify ENTREE movement created

**Checkpoint:** Sale Items UPDATE/DELETE updated ✅

### Step 2.3: Update Nested Sale Items Endpoint (if exists)
**File:** `src/pages/api/sales/[id]/items/[itemId].ts`

- [ ] Check if this file exists
- [ ] If yes, apply same changes as Step 2.2
- [ ] If no, skip this step

**Checkpoint:** Backend API - Sale Items completed ✅

---

## Phase 3: Backend API - Rental Accessories (1 hour)

### Step 3.1: Update Rental Accessories PUT/PATCH Endpoint
**File:** `src/pages/api/rental-accessories/[id].ts`

#### 3.1.1: Create/Open the File
- [ ] Check if file exists at `src/pages/api/rental-accessories/[id].ts`
- [ ] If not, create it

#### 3.1.2: Add GET Handler
```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    if (req.method === 'GET') {
      const accessory = await prisma.rentalAccessory.findUnique({
        where: { id: id as string },
        include: {
          rental: true,
          product: true,
          stockLocation: true,
        },
      });

      if (!accessory) {
        return res.status(404).json({ error: 'Rental accessory not found' });
      }

      return res.status(200).json(accessory);
    }

    // ... PUT/PATCH and DELETE handlers below
  } catch (error) {
    console.error('Error in rental-accessories/[id] API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

#### 3.1.3: Add PUT/PATCH Handler
- [ ] Add PUT/PATCH handler similar to sale-items (handle stock location changes)
- [ ] Copy the logic from Step 2.2.2 and adapt for rental accessories
- [ ] Test updating accessory with location change

#### 3.1.4: Add DELETE Handler
- [ ] Add DELETE handler with stock restoration
- [ ] Copy logic from Step 2.2.3 and adapt for rental accessories
- [ ] Test deleting accessory restores stock

**Checkpoint:** Rental Accessories UPDATE/DELETE completed ✅

---

## Phase 4: Frontend - Sales Components (2-3 hours)

### Step 4.1: Update TypeScript Types
**File:** `src/types/models/SaleItem.ts`

- [ ] Open file
- [ ] Add to interface:
  ```typescript
  stockLocationId?: string;
  ```
- [ ] Add to relations section:
  ```typescript
  stockLocation?: StockLocation;
  ```
- [ ] Import StockLocation type if needed:
  ```typescript
  import { StockLocation } from './StockLocation';
  ```
- [ ] Save file

### Step 4.2: Update Articles Excel Table
**File:** `src/pages/roles/admin/sales/components/ArticlesExcelTable.tsx`

#### 4.2.1: Add Dialog Imports
- [ ] Add at top of file:
  ```typescript
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
  import { Package, Search } from 'lucide-react';
  ```

#### 4.2.2: Add State for Dialog
- [ ] Add state variables:
  ```typescript
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [selectedProductType, setSelectedProductType] = useState<'all' | 'ACCESSORY' | 'SPARE_PART' | 'CONSUMABLE'>('all');
  ```

#### 4.2.3: Add Products Query with Stock
- [ ] Add useQuery for products:
  ```typescript
  const { data: productsData } = useQuery({
    queryKey: ['products-with-stock'],
    queryFn: async () => {
      const response = await fetch('/api/products?includeStock=true');
      const data = await response.json();
      return Array.isArray(data) ? data : (data.products || []);
    },
  });

  const products = productsData || [];
  const filteredProducts = products.filter((p: any) => {
    const matchesSearch = !productSearchTerm ||
      p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      p.productCode?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(productSearchTerm.toLowerCase());

    const matchesType = selectedProductType === 'all' || p.type === selectedProductType;

    return matchesSearch && matchesType;
  });
  ```

#### 4.2.4: Update Row Interface
- [ ] Find the interface for table rows
- [ ] Add `stockLocationId?: string;` field
- [ ] Add `stockLocation?: { id: string; name: string; }` field

#### 4.2.5: Add Validation for Stock Location
- [ ] Find `handleSaveNew` function
- [ ] Add before mutation:
  ```typescript
  if (!newRow?.stockLocationId) {
    toast({
      title: "Erreur",
      description: "Veuillez sélectionner un emplacement de stock",
      variant: "destructive",
    });
    return;
  }
  ```

#### 4.2.6: Add Stock Location Column
- [ ] Find table columns definition
- [ ] Add column after "Produit":
  ```typescript
  {
    header: "Emplacement Stock",
    cell: (row) => (
      <div className="text-sm">
        {row.stockLocation?.name || '-'}
      </div>
    ),
  }
  ```

#### 4.2.7: Add Product Selection Dialog
- [ ] Add before closing tag of component:
  ```typescript
  <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Sélectionner un produit</DialogTitle>
        <DialogDescription>
          Choisissez un produit et un emplacement de stock
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, code, marque..."
            value={productSearchTerm}
            onChange={(e) => setProductSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedProductType('all')}
            className={`px-4 py-2 rounded ${selectedProductType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            Tous
          </button>
          <button
            onClick={() => setSelectedProductType('ACCESSORY')}
            className={`px-4 py-2 rounded ${selectedProductType === 'ACCESSORY' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            Accessoires
          </button>
          <button
            onClick={() => setSelectedProductType('SPARE_PART')}
            className={`px-4 py-2 rounded ${selectedProductType === 'SPARE_PART' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            Pièces Détachées
          </button>
        </div>

        {/* Products Grid */}
        <div className="grid gap-4 max-h-[500px] overflow-y-auto">
          {filteredProducts.map((product: any) => (
            <div key={product.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-gray-500">
                      {product.productCode} • {product.brand} {product.model}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  product.type === 'ACCESSORY' ? 'bg-green-100 text-green-800' :
                  product.type === 'SPARE_PART' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {product.type === 'ACCESSORY' ? 'Accessoire' :
                   product.type === 'SPARE_PART' ? 'Pièce Détachée' :
                   product.type}
                </span>
              </div>

              {/* Stock by Location */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Stock disponible:</p>
                {product.stocks && product.stocks.length > 0 ? (
                  product.stocks.map((stock: any) => (
                    <div key={stock.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div>
                        <span className="text-sm font-medium">{stock.location.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({stock.quantity} unités)
                        </span>
                      </div>
                      <button
                        disabled={stock.quantity === 0}
                        onClick={() => {
                          setNewRow({
                            ...newRow,
                            productId: product.id,
                            stockLocationId: stock.location.id,
                            unitPrice: product.price || 0,
                            quantity: 1,
                            discount: 0,
                            itemTotal: product.price || 0,
                          });
                          setIsProductDialogOpen(false);
                        }}
                        className={`px-3 py-1 rounded text-sm ${
                          stock.quantity === 0
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {stock.quantity === 0 ? 'Rupture' : 'Sélectionner'}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Aucun stock disponible</p>
                )}
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>Aucun produit trouvé</p>
            </div>
          )}
        </div>
      </div>
    </DialogContent>
  </Dialog>
  ```

#### 4.2.8: Update Product Selection Button
- [ ] Find where "Sélectionner Produit" button or similar is
- [ ] Update to open dialog:
  ```typescript
  <button
    onClick={() => setIsProductDialogOpen(true)}
    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
  >
    Sélectionner Produit
  </button>
  ```

#### 4.2.9: Test Frontend
- [ ] Save file
- [ ] Test in browser
- [ ] Click "Sélectionner Produit"
- [ ] Verify dialog opens with products
- [ ] Verify stock shows per location
- [ ] Select a product from a location
- [ ] Verify stockLocationId is set
- [ ] Try to save without selecting location - should show error
- [ ] Complete save - verify API call includes stockLocationId

**Checkpoint:** Articles Excel Table updated ✅

### Step 4.3: Update Article Selection Dialog (if exists)
**File:** `src/components/sales/ArticleSelectionDialog.tsx`

- [ ] Check if this component exists
- [ ] If it exists and is used instead of inline selection, update similarly to Step 4.2
- [ ] Otherwise skip this step

### Step 4.4: Review Admin Sales Detail Page
**File:** `src/pages/roles/admin/sales/[id].tsx`

- [ ] Open file
- [ ] Find where sale items are displayed
- [ ] Verify stockLocation is included in query
- [ ] Add stockLocation.name to display if not already there
- [ ] Test viewing sale details shows stock location

### Step 4.5: Review Employee Sales Page
**File:** `src/pages/roles/employee/sales/index.tsx`

- [ ] Check how employees create sales
- [ ] For employees, auto-fill stockLocationId with their location:
  ```typescript
  const { data: session } = useSession();
  const employeeStockLocationId = session?.user?.stockLocation?.id;

  // When creating sale item:
  const newSaleItem = {
    ...itemData,
    stockLocationId: employeeStockLocationId,  // Auto-fill for employees
  };
  ```
- [ ] Test employee can create sales with their default location

**Checkpoint:** Frontend - Sales completed ✅

---

## Phase 5: Frontend - Rentals Verification (30 minutes)

### Step 5.1: Review Employee Rental Accessories Table
**File:** `src/pages/roles/employee/rentals/components/RentalAccessoriesTable.tsx`

- [ ] Open file
- [ ] Compare with admin version
- [ ] Verify it has the same product selection dialog
- [ ] If missing, copy dialog from admin version
- [ ] Test employee can select accessories with stock location

**Checkpoint:** Frontend - Rentals verified ✅

---

## Phase 6: Testing (2-3 hours)

### Test 6.1: Database Integrity Tests

- [ ] **Check schema matches expected:**
  ```sql
  \d "SaleItem"
  \d "RentalAccessory"
  ```
- [ ] Verify foreign keys exist
- [ ] Verify indexes created

### Test 6.2: Backend API Tests

#### Sale Items API
- [ ] **POST** `/api/sale-items` - Create with stockLocationId
  - [ ] Success: Stock decreases
  - [ ] Success: StockMovement (SORTIE) created
  - [ ] Error: Missing stockLocationId returns 400
  - [ ] Error: Insufficient stock returns error
  - [ ] Response includes stockLocation relation

- [ ] **PUT** `/api/sale-items/[id]` - Update stockLocationId
  - [ ] Success: Old stock restored (ENTREE created)
  - [ ] Success: New stock decreased (SORTIE created)
  - [ ] Success: 2 StockMovements created
  - [ ] Error: Insufficient stock at new location

- [ ] **DELETE** `/api/sale-items/[id]` - Delete item
  - [ ] Success: Stock restored
  - [ ] Success: StockMovement (ENTREE) created
  - [ ] Item deleted from database

#### Rental Accessories API
- [ ] **POST** `/api/rental-accessories` - Create with stockLocationId (already working)
  - [ ] Retest: Still working correctly

- [ ] **PUT** `/api/rental-accessories/[id]` - Update stockLocationId
  - [ ] Success: Stock movements handled correctly

- [ ] **DELETE** `/api/rental-accessories/[id]` - Delete accessory
  - [ ] Success: Stock restored
  - [ ] Success: ENTREE movement created

### Test 6.3: Frontend Component Tests

#### Admin Sales
- [ ] Navigate to sales page
- [ ] Create new sale
- [ ] Add article - product dialog opens
- [ ] Select product from specific location
- [ ] Verify stock location shown in table
- [ ] Save sale item
- [ ] Verify success message
- [ ] Edit sale item - change location
- [ ] Verify stock updated correctly
- [ ] Delete sale item
- [ ] Verify stock restored

#### Employee Sales
- [ ] Login as employee
- [ ] Create new sale
- [ ] Add article
- [ ] Verify employee's location auto-selected
- [ ] Complete sale
- [ ] Verify stock decreased from employee location

#### Admin Rentals
- [ ] Navigate to rentals/location page
- [ ] Create new rental or edit existing
- [ ] Add accessory
- [ ] Select from stock location
- [ ] Verify working correctly

#### Employee Rentals
- [ ] Login as employee
- [ ] Navigate to rentals
- [ ] Add accessory to rental
- [ ] Verify stock location selection works

### Test 6.4: Integration Tests

- [ ] **Multi-location workflow:**
  - [ ] Create sale from Location A
  - [ ] Create sale from Location B
  - [ ] Verify stock decreased at correct locations
  - [ ] Verify StockMovements reference correct locations

- [ ] **Stock transfers:**
  - [ ] Transfer stock between locations
  - [ ] Create sale from destination location
  - [ ] Verify correct stock used

- [ ] **Reporting:**
  - [ ] Check stock movements report
  - [ ] Verify SORTIE records appear for sales
  - [ ] Verify SORTIE records appear for rentals
  - [ ] Check stock levels per location are accurate

### Test 6.5: Edge Cases

- [ ] Try to sell more than available stock - should error
- [ ] Try to create sale item without stockLocationId - should error
- [ ] Delete and recreate same item - verify stock correct
- [ ] Update quantity multiple times - verify movements accurate
- [ ] Create sale item, then delete sale - verify cascades correctly

### Test 6.6: Data Verification

- [ ] **Query StockMovement table:**
  ```sql
  SELECT * FROM "StockMovement"
  WHERE type = 'SORTIE'
  AND notes LIKE '%Vente%'
  ORDER BY "createdAt" DESC
  LIMIT 10;
  ```
  - [ ] Verify sale movements exist

- [ ] **Check stock quantities:**
  ```sql
  SELECT p.name, sl.name as location, s.quantity
  FROM "Stock" s
  JOIN "Product" p ON s."productId" = p.id
  JOIN "StockLocation" sl ON s."locationId" = sl.id
  ORDER BY p.name, sl.name;
  ```
  - [ ] Compare with expected values noted before implementation

- [ ] **Verify sale items have locations:**
  ```sql
  SELECT COUNT(*) as total,
         COUNT("stockLocationId") as with_location
  FROM "SaleItem";
  ```
  - [ ] All new items should have location
  - [ ] Old items may be NULL (acceptable)

**Checkpoint:** All tests passed ✅

---

## Phase 7: Documentation and Cleanup (30 minutes)

### Step 7.1: Update API Documentation
- [ ] Document new stockLocationId parameter in relevant API docs
- [ ] Add examples showing stockLocationId usage
- [ ] Document error responses

### Step 7.2: Update Comments
- [ ] Add comments explaining stock movement logic
- [ ] Document transaction usage
- [ ] Add JSDoc for new parameters

### Step 7.3: Git Commit
- [ ] Review all changed files
- [ ] Stage files:
  ```bash
  git add prisma/schema.prisma
  git add src/pages/api/sale-items/
  git add src/pages/api/rental-accessories/
  git add src/pages/roles/admin/sales/components/
  git add src/components/sales/
  git add src/types/models/SaleItem.ts
  ```
- [ ] Create commit:
  ```bash
  git commit -m "Add stock location tracking to sales and rentals

  - Add stockLocationId to SaleItem and RentalAccessory models
  - Implement stock movement tracking (SORTIE/ENTREE) for all operations
  - Add stock location selection dialogs in frontend
  - Add validation for stock availability
  - Add transaction-based stock management to prevent race conditions
  - Support multi-warehouse inventory tracking

  🤖 Generated with Claude Code (https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>"
  ```

### Step 7.4: Push to Remote
- [ ] Push feature branch:
  ```bash
  git push -u origin feature/stock-location-tracking
  ```

### Step 7.5: Update Implementation Docs
- [ ] Mark STOCK_LOCATION_TRACKING_IMPLEMENTATION.md as ✅ COMPLETED
- [ ] Add implementation date
- [ ] Note any deviations from plan
- [ ] Document any issues encountered and how resolved

**Checkpoint:** Documentation complete ✅

---

## Phase 8: Deployment Preparation (Optional)

### Step 8.1: Create Deployment Checklist
- [ ] Verify all tests pass
- [ ] Create deployment runbook
- [ ] Schedule maintenance window
- [ ] Prepare rollback plan
- [ ] Notify stakeholders

### Step 8.2: Production Backup
- [ ] Create production database backup
- [ ] Verify backup can be restored
- [ ] Store backup in safe location

### Step 8.3: Deploy
- [ ] Deploy to production
- [ ] Run `npx prisma db push` on production
- [ ] Verify no errors
- [ ] Test critical paths
- [ ] Monitor logs for errors

### Step 8.4: Post-Deployment Verification
- [ ] Create test sale
- [ ] Create test rental
- [ ] Verify stock movements created
- [ ] Check stock quantities accurate
- [ ] Monitor for 24 hours

**Checkpoint:** Deployment complete ✅

---

## Completion Checklist

- [ ] All schema changes applied
- [ ] All backend APIs updated
- [ ] All frontend components updated
- [ ] All tests passed
- [ ] Documentation updated
- [ ] Code committed to git
- [ ] Deployment successful (if applicable)
- [ ] No critical bugs reported
- [ ] Stock movements being tracked correctly
- [ ] Stock quantities accurate across all locations

---

## Time Tracking

| Phase | Estimated | Actual | Notes |
|-------|-----------|--------|-------|
| Phase 1: Database Schema | 30 min | | |
| Phase 2: Backend - Sale Items | 2 hours | | |
| Phase 3: Backend - Rental Accessories | 1 hour | | |
| Phase 4: Frontend - Sales | 2-3 hours | | |
| Phase 5: Frontend - Rentals | 30 min | | |
| Phase 6: Testing | 2-3 hours | | |
| Phase 7: Documentation | 30 min | | |
| Phase 8: Deployment | Variable | | |
| **TOTAL** | **6-8 hours** | | |

---

## Notes and Issues

### Issues Encountered
(Document any problems here as you encounter them)

### Solutions Applied
(Document how issues were resolved)

### Deviations from Plan
(Document any changes made to the original plan)

---

**Document Version:** 1.0
**Created:** 2025-11-13
**Last Updated:** 2025-11-13
**Status:** Ready for Implementation
