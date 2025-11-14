/**
 * Utility functions to translate enum values to French
 */

// Medical Device Types
export function translateDeviceType(type: string): string {
  const translations: Record<string, string> = {
    'MEDICAL_DEVICE': 'Appareil Médical',
    'DIAGNOSTIC_DEVICE': 'Appareil de Diagnostic',
    'CPAP': 'CPAP',
    'VNI': 'VNI',
    'CONCENTRATOR': 'Concentrateur',
    'OXYGEN_BOTTLE': 'Bouteille d\'Oxygène',
    'VI': 'Vi',
  };

  return translations[type] || type;
}

// Product Types
export function translateProductType(type: string): string {
  const translations: Record<string, string> = {
    'ACCESSORY': 'Accessoire',
    'SPARE_PART': 'Pièce Détachée',
    'PRODUCT': 'Produit',
  };

  return translations[type] || type;
}

// Rental Status
export function translateRentalStatus(status: string): string {
  const translations: Record<string, string> = {
    'ACTIVE': 'Actif',
    'PENDING': 'En Attente',
    'RETURNED': 'Retourné',
    'CANCELLED': 'Annulé',
    'COMPLETED': 'Terminé',
  };

  return translations[status] || status;
}

// Device Status
export function translateDeviceStatus(status: string): string {
  const translations: Record<string, string> = {
    'ACTIVE': 'Actif',
    'MAINTENANCE': 'En Maintenance',
    'RETIRED': 'Retiré',
    'RESERVED': 'Réservé',
    'SOLD': 'Vendu',
    'RENTED': 'Loué',
  };

  return translations[status] || status;
}

// Stock Status
export function translateStockStatus(status: string): string {
  const translations: Record<string, string> = {
    'FOR_SALE': 'À Vendre',
    'FOR_RENT': 'À Louer',
    'RESERVED': 'Réservé',
    'SOLD': 'Vendu',
    'RENTED': 'Loué',
  };

  return translations[status] || status;
}

// Payment Status
export function translatePaymentStatus(status: string): string {
  const translations: Record<string, string> = {
    'PENDING': 'En Attente',
    'COMPLETED': 'Complété',
    'PARTIAL': 'Partiel',
    'CANCELLED': 'Annulé',
    'REFUNDED': 'Remboursé',
  };

  return translations[status] || status;
}

// CNAM Status
export function translateCNAMStatus(status: string): string {
  const translations: Record<string, string> = {
    'EN_ATTENTE_APPROBATION': 'En Attente d\'Approbation',
    'APPROUVE': 'Approuvé',
    'REJETE': 'Rejeté',
    'EN_COURS': 'En Cours',
    'TERMINE': 'Terminé',
  };

  return translations[status] || status;
}

// Affiliation
export function translateAffiliation(affiliation: string): string {
  const translations: Record<string, string> = {
    'CNAM': 'CNAM',
    'CNSS': 'CNSS',
    'ASSURANCE': 'Assurance',
    'SANS': 'Sans',
  };

  return translations[affiliation] || affiliation;
}

// Task Status
export function translateTaskStatus(status: string): string {
  const translations: Record<string, string> = {
    'PENDING': 'En Attente',
    'IN_PROGRESS': 'En Cours',
    'COMPLETED': 'Terminé',
    'CANCELLED': 'Annulé',
  };

  return translations[status] || status;
}

// Priority
export function translatePriority(priority: string): string {
  const translations: Record<string, string> = {
    'LOW': 'Basse',
    'MEDIUM': 'Moyenne',
    'HIGH': 'Haute',
    'URGENT': 'Urgente',
  };

  return translations[priority] || priority;
}

// Generic function that tries to detect the type and translate
export function translateEnum(value: string, context?: string): string {
  if (!value) return value;

  // Try to determine the best translation based on context or value
  if (context === 'deviceType' || value.includes('DEVICE')) {
    return translateDeviceType(value);
  }

  if (context === 'productType' || ['ACCESSORY', 'SPARE_PART', 'PRODUCT'].includes(value)) {
    return translateProductType(value);
  }

  if (context === 'status') {
    // Try different status translations
    return translateRentalStatus(value) !== value
      ? translateRentalStatus(value)
      : translateDeviceStatus(value) !== value
        ? translateDeviceStatus(value)
        : translatePaymentStatus(value);
  }

  // Default: return as is
  return value;
}
