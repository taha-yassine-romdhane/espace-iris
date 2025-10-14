# Device Configuration Analysis & Refactoring Plan

## Current State Analysis

### The Problem
You have **confusion between two overlapping concepts** that should be unified:

1. **`deviceConfiguration`** - Used in sales workflow, stored as JSON in `SaleItem.warranty` field (hack!)
2. **`medicalDevice` parameters** - Device-specific configurations stored in `MedicalDeviceParametre` table
3. **`product.parameters`** - Runtime parameters shown in UI (RecapitulationStep)

All three are trying to solve the same problem: **storing medical device settings** for CPAP, VNI, concentrators, etc.

### Current Data Flow

#### In Sales:
```
Product Selection → product.parameters (runtime) → SaleItem.warranty (JSON string hack)
```
- Parameters are passed as `product.parameters` in UI
- Stored in `warranty` field as JSON (deviceConfiguration)
- Retrieved by parsing JSON from warranty field

#### In Rentals:
```
Device Selection → MedicalDeviceParametre table → Rental configuration
```
- Has proper `RentalConfiguration` table
- But device parameters are separate in `MedicalDeviceParametre`

#### In Medical Devices:
```
MedicalDevice → MedicalDeviceParametre (separate table)
```
- Proper relational model
- But not linked to sales/rentals properly

## Root Cause
The confusion exists because:
1. **Sales were added later** without proper schema design
2. **Quick hack** using warranty field for device config
3. **No unified approach** across sales and rentals
4. **Device parameters belong to the transaction**, not just the device

## Recommended Solution

### Option A: Transaction-Based Configuration (RECOMMENDED)
Store configurations at the **transaction level** since same device can have different configs for different patients.

```prisma
// Add to schema.prisma
model SaleConfiguration {
  id              String    @id @default(cuid())
  saleItemId      String    @unique
  
  // CPAP parameters
  pression        String?
  pressionRampe   String?
  dureeRampe      Int?
  epr             String?
  
  // VNI parameters
  ipap            String?
  epap            String?
  aid             String?
  mode            String?
  frequenceRespiratoire String?
  volumeCourant   String?
  
  // Concentrator parameters
  debit           String?
  
  // Relations
  saleItem        SaleItem  @relation(fields: [saleItemId], references: [id])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// Update SaleItem
model SaleItem {
  // ... existing fields
  configuration   SaleConfiguration?
  // Remove misuse of warranty field
}
```

### Option B: Shared Configuration Table
Create a polymorphic configuration that works for both sales and rentals:

```prisma
model DeviceConfiguration {
  id              String    @id @default(cuid())
  
  // Link to either sale or rental
  saleItemId      String?   @unique
  rentalId        String?   @unique
  
  // Device parameters (same as above)
  // ...
  
  saleItem        SaleItem?  @relation(fields: [saleItemId], references: [id])
  rental          Rental?    @relation(fields: [rentalId], references: [id])
}
```

## Migration Plan

### Phase 1: Add New Schema (Week 1)
1. Create `SaleConfiguration` table
2. Add migration to copy existing JSON data from warranty field
3. Keep backward compatibility

### Phase 2: Update APIs (Week 2)
1. Modify `/api/sales/index.ts`:
   - Save to `SaleConfiguration` instead of warranty
   - Keep reading from both for compatibility
   
2. Modify `/api/sales/[id].ts`:
   - Return configuration from new table
   - Fallback to warranty field if not found

### Phase 3: Update UI (Week 3)
1. Update `RecapitulationStep` to use proper configuration
2. Update sale stepper to save configuration properly
3. Ensure rental stepper uses same approach

### Phase 4: Data Migration & Cleanup (Week 4)
1. Run migration script to move all warranty JSON to configuration table
2. Remove JSON parsing hacks
3. Clean up warranty field usage

## Benefits of This Approach

1. **Data Integrity**: Proper relational model, no JSON strings
2. **Consistency**: Same approach for sales and rentals
3. **Queryability**: Can search/filter by device parameters
4. **Type Safety**: Prisma types instead of JSON parsing
5. **Clarity**: Clear separation between warranty and configuration

## Implementation Priority

### Immediate (Do Now):
1. Stop storing new configurations in warranty field
2. Create proper `SaleConfiguration` table
3. Update sale creation API

### Short Term (Next Sprint):
1. Migrate existing data
2. Update all read operations
3. Unify rental and sale configurations

### Long Term:
1. Consider if `MedicalDeviceParametre` should be deprecated
2. Add configuration versioning/history
3. Add configuration templates for common setups

## Code Changes Required

### 1. Schema Changes
```prisma
// prisma/schema.prisma
model SaleConfiguration {
  // As shown above
}
```

### 2. API Changes
```typescript
// /api/sales/index.ts
// Instead of:
warranty: item.warranty, // JSON hack

// Use:
configuration: {
  create: {
    pression: item.parameters?.pression,
    pressionRampe: item.parameters?.pressionRampe,
    // ... other parameters
  }
}
```

### 3. UI Changes
```typescript
// RecapitulationStep.tsx
// Instead of:
{product.parameters && ...}

// Use:
{product.configuration && ...}
```

## Decision Required

**Which approach do you prefer?**

1. **Option A**: Separate configuration tables for Sales and Rentals (cleaner)
2. **Option B**: Shared polymorphic configuration (more flexible)
3. **Option C**: Keep current approach but document it better
4. **Option D**: Complete redesign of device parameter system

## Next Steps

1. **Decide on approach** (A, B, C, or D)
2. **Create migration plan** with specific timeline
3. **Update schema** with new tables
4. **Implement API changes** with backward compatibility
5. **Test thoroughly** with existing data
6. **Deploy gradually** with feature flags if needed

---

**Note**: The current `warranty` field hack is causing:
- Data integrity issues
- Difficult queries
- Type safety problems
- Confusion for developers

This needs to be addressed soon to prevent further technical debt.