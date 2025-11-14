# Stock Location Tracking Implementation - Complete System Update

**Date:** 2025-11-13
**Purpose:** Add explicit stock location tracking to both RENTAL and SALES systems
**Migration Strategy:** `db push` (no migrations - migrations not synchronized)
**Status:** ⚠️ PRODUCTION DATABASE - PROCEED WITH CAUTION

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema Changes](#database-schema-changes)
3. [Rental System Files to Update](#rental-system-files-to-update)
4. [Sales System Files to Update](#sales-system-files-to-update)
5. [Implementation Checklist](#implementation-checklist)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)

---

## Overview

### Problem Statement

Currently, the system handles stock location tracking inconsistently:

**Current Rental System (UPDATED):**
- ✅ `RentalAccessory` has `stockLocationId` field
- ✅ Creates `StockMovement` records (SORTIE type)
- ✅ Decrements stock quantity at selected location
- ✅ Frontend allows stock location selection

**Current Sales System (NEEDS UPDATE):**
- ❌ `SaleItem` has NO `stockLocationId` field
- ❌ Stock location determined from `user.stockLocation` at runtime
- ❌ NO `StockMovement` records created (no audit trail)
- ✅ Stock quantity IS decremented (but no movement tracking)

### Solution

Update both systems to use **Option 2: Explicit Stock Location Tracking**

**Benefits:**
1. Full audit trail of all stock movements (ENTREE, SORTIE, TRANSFERT)
2. Support for multiple warehouses (employee locations + admin principal stock)
3. Accurate stock location tracking for returns/repairs
4. Consistent pattern across rental and sales systems
5. Better inventory management and reporting

---

## Database Schema Changes

### File: `prisma/schema.prisma`

#### 1. RentalAccessory Model (ALREADY UPDATED ✅)

```prisma
model RentalAccessory {
  id              String          @id @default(cuid())
  rentalId        String
  productId       String
  stockLocationId String?         // ✅ ADDED
  quantity        Int
  unitPrice       Decimal         @db.Decimal(10, 2)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  product         Product         @relation(fields: [productId], references: [id])
  rental          Rental          @relation(fields: [rentalId], references: [id], onDelete: Cascade)
  stockLocation   StockLocation?  @relation(fields: [stockLocationId], references: [id])  // ✅ ADDED

  @@unique([rentalId, productId])
  @@index([rentalId])
  @@index([productId])
  @@index([stockLocationId])  // ✅ ADDED
}
```

#### 2. SaleItem Model (NEEDS UPDATE ⚠️)

**BEFORE:**
```prisma
model SaleItem {
  id              String         @id @default(cuid())
  saleId          String
  productId       String?
  medicalDeviceId String?
  quantity        Int
  unitPrice       Decimal        @db.Decimal(10, 2)
  discount        Decimal?       @default(0) @db.Decimal(10, 2)
  itemTotal       Decimal        @db.Decimal(10, 2)
  serialNumber    String?
  warranty        Int?
  description     String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  sale            Sale           @relation(fields: [saleId], references: [id], onDelete: Cascade)
  product         Product?       @relation(fields: [productId], references: [id])
  medicalDevice   MedicalDevice? @relation(fields: [medicalDeviceId], references: [id])
  configuration   SaleConfiguration?

  @@index([saleId])
  @@index([productId])
  @@index([medicalDeviceId])
}
```

**AFTER:**
```prisma
model SaleItem {
  id              String         @id @default(cuid())
  saleId          String
  productId       String?
  medicalDeviceId String?
  stockLocationId String?        // ⚠️ ADD THIS
  quantity        Int
  unitPrice       Decimal        @db.Decimal(10, 2)
  discount        Decimal?       @default(0) @db.Decimal(10, 2)
  itemTotal       Decimal        @db.Decimal(10, 2)
  serialNumber    String?
  warranty        Int?
  description     String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  sale            Sale           @relation(fields: [saleId], references: [id], onDelete: Cascade)
  product         Product?       @relation(fields: [productId], references: [id])
  medicalDevice   MedicalDevice? @relation(fields: [medicalDeviceId], references: [id])
  stockLocation   StockLocation? @relation(fields: [stockLocationId], references: [id])  // ⚠️ ADD THIS
  configuration   SaleConfiguration?

  @@index([saleId])
  @@index([productId])
  @@index([medicalDeviceId])
  @@index([stockLocationId])     // ⚠️ ADD THIS
}
```

#### 3. StockLocation Model (NEEDS REVERSE RELATION ⚠️)

**ADD THESE LINES:**
```prisma
model StockLocation {
  // ... existing fields ...

  // Existing relations:
  stocks              Stock[]
  medicalDevices      MedicalDevice[]
  rentalAccessories   RentalAccessory[]  // ✅ ALREADY ADDED

  // ⚠️ ADD THIS:
  saleItems           SaleItem[]

  // ... rest of model ...
}
```

---

## Rental System Files to Update

### ✅ ALREADY COMPLETED

#### 1. API: `src/pages/api/rental-accessories/index.ts`
**Status:** ✅ DONE
**Changes Made:**
- Added `stockLocationId` validation (required)
- Implemented transaction with:
  - Stock availability check
  - Stock quantity decrement
  - StockMovement creation (SORTIE type)
  - Full relation includes

#### 2. Frontend: `src/pages/roles/admin/location/components/RentalAccessoriesTable.tsx`
**Status:** ✅ DONE
**Changes Made:**
- Added Dialog for product selection with stock by location
- Added stock location column to table
- Added validation for `stockLocationId`
- Shows available stock per location

### ⚠️ NEEDS REVIEW/UPDATE

#### 3. API: `src/pages/api/rental-accessories/[id].ts`
**Status:** ⚠️ NEEDS UPDATE
**Required Changes:**
- **UPDATE (PUT/PATCH):** Allow changing `stockLocationId`, handle stock restoration/movement
- **DELETE:** Restore stock quantity when accessory removed, create ENTREE movement

#### 4. Frontend: `src/pages/roles/employee/rentals/components/RentalAccessoriesTable.tsx`
**Status:** ⚠️ NEEDS REVIEW
**Required Changes:**
- Ensure employee version has same stock location dialog
- Verify stock location visibility and selection

---

## Sales System Files to Update

### 🔴 HIGH PRIORITY - Backend API

#### 1. API: `src/pages/api/sale-items/index.ts`
**Status:** 🔴 CRITICAL UPDATE NEEDED
**Current Lines:** 273-285 (stock decrement WITHOUT movement tracking)
**Required Changes:**

**BEFORE (Current Code):**
```typescript
// Lines 114-124: Stock location determination
let stockLocationId: string | null = null;

if (itemData.productId) {
  if (user?.role === 'ADMIN') {
    // Admin can specify location, defaults to their own
    stockLocationId = itemData.stockLocationId || user.stockLocation?.id || null;
  } else if (user?.role === 'EMPLOYEE') {
    // Employee uses only their stock location
    stockLocationId = user.stockLocation?.id || null;
  }
}

// Lines 273-285: Stock decrement (NO movement tracking)
if (itemData.productId && stockLocationId) {
  await prisma.stock.update({
    where: {
      locationId_productId: {
        locationId: stockLocationId,
        productId: itemData.productId
      }
    },
    data: {
      quantity: { decrement: parseInt(itemData.quantity) }
    }
  });
}
// ❌ NO StockMovement record created!
```

**AFTER (Required Code):**
```typescript
// 1. Validate stockLocationId is provided
if (!itemData.stockLocationId) {
  throw new Error('Stock location is required (stockLocationId)');
}

const stockLocationId = itemData.stockLocationId;

// 2. Use transaction for atomicity
const result = await prisma.$transaction(async (tx) => {
  // Get stock and validate availability
  const stock = await tx.stock.findUnique({
    where: {
      productId_locationId: {
        productId: itemData.productId,
        locationId: stockLocationId,
      },
    },
  });

  if (!stock) {
    throw new Error(`No stock found for this product at the selected location`);
  }

  if (stock.quantity < parseInt(itemData.quantity)) {
    throw new Error(`Insufficient stock. Available: ${stock.quantity}, Requested: ${itemData.quantity}`);
  }

  // Create sale item WITH stockLocationId
  const saleItem = await tx.saleItem.create({
    data: {
      saleId: itemData.saleId,
      productId: itemData.productId,
      medicalDeviceId: itemData.medicalDeviceId,
      stockLocationId,  // ⚠️ ADD THIS
      quantity: parseInt(itemData.quantity),
      unitPrice: parseFloat(itemData.unitPrice),
      discount: itemData.discount ? parseFloat(itemData.discount) : 0,
      itemTotal: parseFloat(itemData.itemTotal),
      serialNumber: itemData.serialNumber,
      warranty: itemData.warranty ? parseInt(itemData.warranty) : null,
      description: itemData.description,
    },
  });

  // Decrease stock quantity
  await tx.stock.update({
    where: { id: stock.id },
    data: {
      quantity: { decrement: parseInt(itemData.quantity) },
    },
  });

  // ⚠️ CREATE STOCK MOVEMENT RECORD
  await tx.stockMovement.create({
    data: {
      productId: itemData.productId,
      locationId: stockLocationId,
      type: 'SORTIE',
      quantity: parseInt(itemData.quantity),
      notes: `Vente ${itemData.saleId} - Article vendu`,
      createdById: session.user.id,
    },
  });

  return tx.saleItem.findUnique({
    where: { id: saleItem.id },
    include: {
      sale: true,
      product: true,
      medicalDevice: true,
      stockLocation: true,
    },
  });
});
```

**Key Changes:**
1. ✅ Require `stockLocationId` parameter (no more runtime determination)
2. ✅ Wrap in transaction for atomicity
3. ✅ Add stock availability validation
4. ✅ Create `StockMovement` record (SORTIE type)
5. ✅ Include `stockLocation` in response

#### 2. API: `src/pages/api/sale-items/[id].ts`
**Status:** 🔴 CRITICAL UPDATE NEEDED
**Required Changes:**
- **UPDATE (PUT/PATCH):**
  - Allow changing `stockLocationId`
  - Handle stock restoration from old location
  - Handle stock decrement at new location
  - Create ENTREE + SORTIE movements for location changes
- **DELETE:**
  - Restore stock quantity
  - Create ENTREE movement

#### 3. API: `src/pages/api/sales/[id]/items/[itemId].ts`
**Status:** 🔴 NEEDS UPDATE
**Required Changes:**
- Same as sale-items/[id].ts
- Ensure nested route follows same pattern

### 🟡 MEDIUM PRIORITY - Frontend Components

#### 4. Frontend: `src/pages/roles/admin/sales/components/ArticlesExcelTable.tsx`
**Status:** 🟡 NEEDS UPDATE
**Required Changes:**
- Add stock location selection dialog (similar to RentalAccessoriesTable)
- Add "Emplacement Stock" column
- Show available stock per location when selecting products
- Add validation for `stockLocationId`

**Implementation Pattern (from RentalAccessoriesTable):**
```typescript
// 1. Add Dialog component
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// 2. Add state for dialog
const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
const [productSearchTerm, setProductSearchTerm] = useState("");

// 3. Fetch products with stock info
const { data: productsData } = useQuery({
  queryKey: ['products-with-stock'],
  queryFn: async () => {
    const response = await fetch('/api/products?includeStock=true');
    const data = await response.json();
    return Array.isArray(data) ? data : (data.products || []);
  },
});

// 4. Add validation
const handleSaveNew = () => {
  if (!newRow?.stockLocationId) {
    toast({
      title: "Erreur",
      description: "Veuillez sélectionner un emplacement de stock"
    });
    return;
  }
  createMutation.mutate(newRow);
};

// 5. Product Selection Dialog
<Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
    {/* Search and filter */}
    {/* Products grid showing: */}
    {products.map((product) => (
      <div key={product.id}>
        {/* Product info */}
        {/* Stock by location with select buttons */}
        {product.stocks.map((stock) => (
          <div>
            <span>{stock.location.name}</span>
            <span>({stock.quantity} unités)</span>
            <Button
              disabled={stock.quantity === 0}
              onClick={() => {
                setNewRow({
                  ...newRow,
                  productId: product.id,
                  stockLocationId: stock.location.id,
                  unitPrice: product.price || 0,
                  quantity: 1,
                });
                setIsProductDialogOpen(false);
              }}
            >
              Sélectionner
            </Button>
          </div>
        ))}
      </div>
    ))}
  </DialogContent>
</Dialog>
```

#### 5. Frontend: `src/components/sales/ArticleSelectionDialog.tsx`
**Status:** 🟡 NEEDS UPDATE
**Required Changes:**
- Add stock location selection to dialog
- Show stock availability per location
- Return `stockLocationId` with selected product

#### 6. Frontend: `src/pages/roles/admin/sales/[id].tsx`
**Status:** 🟡 NEEDS REVIEW
**Required Changes:**
- Verify sale item editing includes stock location
- Ensure stock location displayed in sale details

#### 7. Frontend: `src/pages/roles/employee/sales/index.tsx`
**Status:** 🟡 NEEDS REVIEW
**Required Changes:**
- Employee version should auto-select their stock location
- Show stock location in sale item creation

### 🟢 LOW PRIORITY - Display Components

#### 8. Frontend: `src/pages/roles/admin/sales/index.tsx`
**Status:** 🟢 NEEDS MINOR UPDATE
**Required Changes:**
- Ensure sales listing shows stock location info
- Update filters if needed

#### 9. Frontend: `src/components/sales/SaleInvoice.tsx`
**Status:** 🟢 OPTIONAL
**Required Changes:**
- Optionally show stock location on invoices

#### 10. Types: `src/types/models/SaleItem.ts`
**Status:** 🟢 NEEDS UPDATE
**Required Changes:**
```typescript
export interface SaleItem {
  id: string;
  saleId: string;
  productId?: string;
  medicalDeviceId?: string;
  stockLocationId?: string;  // ⚠️ ADD THIS
  quantity: number;
  unitPrice: number;
  discount?: number;
  itemTotal: number;
  serialNumber?: string;
  warranty?: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  sale?: Sale;
  product?: Product;
  medicalDevice?: MedicalDevice;
  stockLocation?: StockLocation;  // ⚠️ ADD THIS
  configuration?: SaleConfiguration;
}
```

---

## Implementation Checklist

### Phase 1: Database Schema Update
- [ ] Update `prisma/schema.prisma`:
  - [ ] Add `stockLocationId` to `SaleItem` model
  - [ ] Add `stockLocation` relation to `SaleItem`
  - [ ] Add `saleItems` reverse relation to `StockLocation`
  - [ ] Add index on `stockLocationId` in `SaleItem`
- [ ] Run `npx prisma db push` (BACKUP DATABASE FIRST!)
- [ ] Verify schema changes in database

### Phase 2: Backend API Updates (CRITICAL)
- [ ] Update `src/pages/api/sale-items/index.ts`:
  - [ ] Add `stockLocationId` validation
  - [ ] Implement transaction pattern
  - [ ] Add stock availability check
  - [ ] Create `StockMovement` records
  - [ ] Update response to include `stockLocation`
- [ ] Update `src/pages/api/sale-items/[id].ts`:
  - [ ] Add PUT/PATCH with stock location change handling
  - [ ] Add DELETE with stock restoration
  - [ ] Create appropriate stock movements
- [ ] Update `src/pages/api/sales/[id]/items/[itemId].ts`:
  - [ ] Align with sale-items/[id].ts pattern
- [ ] Update `src/pages/api/rental-accessories/[id].ts`:
  - [ ] Add UPDATE with stock location change
  - [ ] Add DELETE with stock restoration

### Phase 3: Frontend Updates (Sales)
- [ ] Update `src/pages/roles/admin/sales/components/ArticlesExcelTable.tsx`:
  - [ ] Add product selection dialog
  - [ ] Add stock location column
  - [ ] Add validation
- [ ] Update `src/components/sales/ArticleSelectionDialog.tsx`:
  - [ ] Add stock location selection
  - [ ] Show stock by location
- [ ] Update `src/types/models/SaleItem.ts`:
  - [ ] Add `stockLocationId` and `stockLocation` fields

### Phase 4: Frontend Updates (Rentals)
- [ ] Update `src/pages/roles/employee/rentals/components/RentalAccessoriesTable.tsx`:
  - [ ] Verify stock location dialog exists
  - [ ] Test employee workflow

### Phase 5: Testing
- [ ] Test rental accessory creation (admin)
- [ ] Test rental accessory creation (employee)
- [ ] Test rental accessory editing
- [ ] Test rental accessory deletion
- [ ] Test sale item creation (admin)
- [ ] Test sale item creation (employee)
- [ ] Test sale item editing
- [ ] Test sale item deletion
- [ ] Test stock movements are created correctly
- [ ] Test stock quantities are updated correctly
- [ ] Test multi-location scenarios
- [ ] Test insufficient stock validation
- [ ] Test stock restoration on delete

### Phase 6: Verification
- [ ] Check `StockMovement` table has records for all operations
- [ ] Verify stock quantities are accurate
- [ ] Test reporting and analytics with new data
- [ ] Verify no breaking changes to existing functionality

---

## Testing Strategy

### Unit Testing Checklist

#### Database Operations
- [ ] Test stock decrement transaction
- [ ] Test stock restoration transaction
- [ ] Test StockMovement creation
- [ ] Test stock availability validation
- [ ] Test transaction rollback on error

#### API Endpoints
- [ ] Test POST `/api/sale-items` with valid stockLocationId
- [ ] Test POST `/api/sale-items` without stockLocationId (should error)
- [ ] Test POST `/api/sale-items` with insufficient stock (should error)
- [ ] Test PUT `/api/sale-items/[id]` changing stock location
- [ ] Test DELETE `/api/sale-items/[id]` restoring stock
- [ ] Test POST `/api/rental-accessories` (already done)
- [ ] Test PUT `/api/rental-accessories/[id]`
- [ ] Test DELETE `/api/rental-accessories/[id]`

#### Frontend Components
- [ ] Test product selection dialog shows correct stock
- [ ] Test stock location selection works
- [ ] Test validation prevents submission without location
- [ ] Test out-of-stock products are disabled
- [ ] Test stock location column displays correctly

### Integration Testing Checklist

#### Sales Workflow
- [ ] Create sale → Add items → Verify stock decreased
- [ ] Create sale → Add items → Delete items → Verify stock restored
- [ ] Create sale → Edit item location → Verify stock moved
- [ ] Create sale with multiple items from different locations

#### Rental Workflow
- [ ] Create rental → Add accessories → Verify stock decreased
- [ ] Create rental → Add accessories → Delete accessories → Verify stock restored
- [ ] Create rental → Edit accessory location → Verify stock moved
- [ ] Create rental with multiple accessories from different locations

#### Stock Movements
- [ ] Verify SORTIE created for sale item
- [ ] Verify SORTIE created for rental accessory
- [ ] Verify ENTREE created when deleting sale item
- [ ] Verify ENTREE created when deleting rental accessory
- [ ] Verify movements when changing locations

### User Acceptance Testing

#### Admin User
- [ ] Can select any stock location
- [ ] Can see all stock locations in dropdown
- [ ] Can create sales from principal stock
- [ ] Can create rentals from principal stock
- [ ] Can view stock movements in reports

#### Employee User
- [ ] Can select their assigned stock location
- [ ] Can see stock at their location
- [ ] Can create sales from their stock
- [ ] Can create rentals from their stock
- [ ] Cannot select locations they don't have access to

---

## Rollback Plan

### If Issues Are Discovered

#### Option 1: Immediate Rollback (Database Level)
```bash
# 1. Restore database backup
pg_restore -h localhost -U postgres -d espace_iris backup_before_stock_location_update.dump

# 2. Revert schema changes
git revert <commit-hash>

# 3. Run db push with old schema
npx prisma db push --force-reset
```

#### Option 2: Partial Rollback (Make Fields Optional)
```prisma
model SaleItem {
  stockLocationId String?  // Make optional instead of required
  // ... rest of model
}

model RentalAccessory {
  stockLocationId String?  // Make optional instead of required
  // ... rest of model
}
```

```typescript
// Update API to handle missing stockLocationId gracefully
const stockLocationId = itemData.stockLocationId || user.stockLocation?.id || null;

if (!stockLocationId) {
  console.warn('No stock location specified, skipping stock decrement');
  // Continue without stock management
}
```

#### Option 3: Data Migration Fix
If data is corrupted but schema is good:
```sql
-- Update NULL stockLocationId to user's location for existing records
UPDATE "SaleItem" si
SET "stockLocationId" = u."stockLocationId"
FROM "Sale" s
JOIN "User" u ON s."processedById" = u.id
WHERE si."saleId" = s.id
AND si."stockLocationId" IS NULL;

UPDATE "RentalAccessory" ra
SET "stockLocationId" = u."stockLocationId"
FROM "Rental" r
JOIN "User" u ON r."createdById" = u.id
WHERE ra."rentalId" = r.id
AND ra."stockLocationId" IS NULL;
```

### Prevention Measures

1. **BACKUP DATABASE BEFORE `db push`:**
```bash
pg_dump -h localhost -U postgres -d espace_iris > backup_$(date +%Y%m%d_%H%M%S).sql
```

2. **Test in Staging Environment First** (if available)

3. **Gradual Rollout:**
   - Deploy backend changes first
   - Test API endpoints
   - Deploy frontend changes after backend verified

4. **Monitor Logs:**
   - Watch for errors in console
   - Check Prisma query logs
   - Monitor stock movement creation

---

## Summary of All Files Requiring Changes

### Database (1 file)
1. ✅ `prisma/schema.prisma` - Add stockLocationId to SaleItem, update StockLocation

### Backend APIs (4 files)
2. 🔴 `src/pages/api/sale-items/index.ts` - Add transaction + movement tracking
3. 🔴 `src/pages/api/sale-items/[id].ts` - Add update/delete with stock restoration
4. 🔴 `src/pages/api/sales/[id]/items/[itemId].ts` - Align with sale-items pattern
5. ⚠️ `src/pages/api/rental-accessories/[id].ts` - Add update/delete handlers

### Frontend Components (5 files)
6. 🟡 `src/pages/roles/admin/sales/components/ArticlesExcelTable.tsx` - Add stock location dialog
7. 🟡 `src/components/sales/ArticleSelectionDialog.tsx` - Add stock location selection
8. 🟡 `src/pages/roles/admin/sales/[id].tsx` - Verify stock location in details
9. 🟡 `src/pages/roles/employee/sales/index.tsx` - Employee stock location handling
10. ⚠️ `src/pages/roles/employee/rentals/components/RentalAccessoriesTable.tsx` - Verify employee dialog

### Type Definitions (1 file)
11. 🟢 `src/types/models/SaleItem.ts` - Add stockLocationId field

---

**TOTAL FILES TO UPDATE: 11 files**

**Priority Breakdown:**
- 🔴 **CRITICAL (4 files):** Backend APIs must be updated first
- 🟡 **HIGH (5 files):** Frontend components for user interaction
- ⚠️ **MEDIUM (1 file):** Rental update/delete endpoints
- 🟢 **LOW (1 file):** Type definitions

---

## Notes

- This is a **PRODUCTION DATABASE** - proceed with extreme caution
- **BACKUP BEFORE `db push`** - no turning back after schema changes
- Test each change incrementally
- Monitor logs closely for errors
- Keep users informed of maintenance window
- Have rollback plan ready

---

**Document Version:** 1.0
**Last Updated:** 2025-11-13
**Next Review:** After implementation completion
