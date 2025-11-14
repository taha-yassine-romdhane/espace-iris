import { PaymentDetailData, CreatePaymentRequest } from '@/pages/api/payments/create';

export interface PaymentFormData {
  type: string;
  classification: string;
  amount: number;
  [key: string]: any;
}

/**
 * Transform payment form data to the normalized API format
 */
export function transformPaymentData(
  payments: PaymentFormData[],
  patientId?: string,
  companyId?: string,
  saleId?: string,
  rentalId?: string,
  diagnosticId?: string
): CreatePaymentRequest {
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  // Determine the primary method (for backward compatibility)
  const primaryMethod = getPrimaryPaymentMethod(payments);
  
  // Transform each payment to PaymentDetail format
  const details: PaymentDetailData[] = payments.map(payment => ({
    method: payment.type,
    amount: payment.amount,
    classification: payment.classification,
    reference: getPaymentReference(payment),
    metadata: getPaymentMetadata(payment)
  }));

  return {
    amount: totalAmount,
    method: primaryMethod,
    status: 'PAID', // Default to PAID for completed payments
    patientId,
    companyId,
    saleId,
    rentalId,
    diagnosticId,
    details,
    // Backward compatibility fields
    chequeNumber: getChequeNumber(payments),
    bankName: getBankName(payments),
    cnamCardNumber: getCnamCardNumber(payments),
    referenceNumber: getReferenceNumber(payments),
    notes: JSON.stringify({
      payments,
      totalAmount,
      paidAmount: totalAmount,
      remainingAmount: 0,
      status: 'COMPLETED',
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * Determine the primary payment method for the main Payment record
 */
function getPrimaryPaymentMethod(payments: PaymentFormData[]): CreatePaymentRequest['method'] {
  // Priority order: CNAM > CHEQUE > BANK_TRANSFER > VIREMENT > TRAITE > MANDAT > CASH
  const methodPriority = {
    'cnam': 'CNAM',
    'cheque': 'CHEQUE',
    'bank_transfer': 'BANK_TRANSFER',
    'virement': 'VIREMENT',
    'traite': 'TRAITE',
    'mondat': 'MANDAT',
    'especes': 'CASH'
  } as const;

  for (const [type, method] of Object.entries(methodPriority)) {
    if (payments.some(p => p.type === type)) {
      return method as CreatePaymentRequest['method'];
    }
  }

  return 'CASH'; // Default fallback
}

/**
 * Extract reference information from payment data
 */
function getPaymentReference(payment: PaymentFormData): string | undefined {
  switch (payment.type) {
    case 'cheque':
      return payment.numCheque ? `Chèque N°: ${payment.numCheque}` : undefined;
    case 'virement':
      return payment.reference ? `Ref: ${payment.reference}` : undefined;
    case 'bank_transfer':
      return payment.reference ? `Ref: ${payment.reference}` : undefined;
    case 'traite':
      return payment.nomTraite ? `Traite: ${payment.nomTraite}` : undefined;
    case 'mondat':
      return payment.benificiere ? `Bénéficiaire: ${payment.benificiere}` : undefined;
    case 'cnam':
      return payment.dossierReference || payment.reference;
    default:
      return undefined;
  }
}

/**
 * Extract metadata for each payment method
 */
function getPaymentMetadata(payment: PaymentFormData): any {
  const baseMetadata = {
    originalData: payment,
    timestamp: new Date().toISOString()
  };

  switch (payment.type) {
    case 'cheque':
      return {
        ...baseMetadata,
        chequeNumber: payment.numCheque,
        bankName: payment.banque,
        holderName: payment.nomPrenom,
        holderPhone: payment.telephone,
        holderCin: payment.cin,
        dueDate: payment.dateEcheance
      };

    case 'virement':
      return {
        ...baseMetadata,
        reference: payment.reference,
        dueDate: payment.dateReste
      };

    case 'bank_transfer':
      return {
        ...baseMetadata,
        reference: payment.reference,
        bankName: payment.banque,
        dueDate: payment.dateReste
      };

    case 'traite':
      return {
        ...baseMetadata,
        traiteName: payment.nomTraite,
        bankName: payment.banque,
        rib: payment.rib,
        creationDate: payment.dateCreation,
        dueDate: payment.dateEcheance,
        creationPlace: payment.lieuCreation,
        payeeToCompany: payment.payeeToSociete,
        drawerName: payment.nomTireur,
        drawerAddress: payment.adresseNomTireur,
        drawee: payment.nomTire,
        draweeAddress: payment.adresseNomTire
      };

    case 'mondat':
      return {
        ...baseMetadata,
        beneficiary: payment.benificiere,
        issuingOffice: payment.bureauEmission,
        issueDate: payment.dateEmission,
        dueDate: payment.dateReste
      };

    case 'cnam':
      return {
        ...baseMetadata,
        dossierStatus: payment.etatDossier,
        bondType: payment.cnamBondType,
        dossierReference: payment.dossierReference,
        statusHistory: payment.statusHistory,
        isPending: payment.isPending,
        requiresFollowUp: payment.requiresFollowUp,
        relatedProductIds: payment.relatedProductIds,
        relatedMedicalDeviceIds: payment.relatedMedicalDeviceIds,
        depositDate: payment.dateDepose,
        reminderDate: payment.dateRappel,
        acceptanceDate: payment.dateAcceptation,
        expirationDate: payment.dateExpiration
      };

    case 'especes':
      return {
        ...baseMetadata,
        description: payment.description || 'Paiement en espèces'
      };

    default:
      return baseMetadata;
  }
}

/**
 * Extract cheque number for backward compatibility
 */
function getChequeNumber(payments: PaymentFormData[]): string | undefined {
  const chequePayment = payments.find(p => p.type === 'cheque');
  return chequePayment?.numCheque;
}

/**
 * Extract bank name for backward compatibility
 */
function getBankName(payments: PaymentFormData[]): string | undefined {
  const bankPayment = payments.find(p => p.type === 'cheque' || p.type === 'traite' || p.type === 'bank_transfer');
  return bankPayment?.banque;
}

/**
 * Extract CNAM card number for backward compatibility
 */
function getCnamCardNumber(payments: PaymentFormData[]): string | undefined {
  const cnamPayment = payments.find(p => p.type === 'cnam');
  if (cnamPayment) {
    // Create a summary string like the current format
    const otherPayments = payments.filter(p => p.type !== 'cnam');
    const cnamSummary = `CNAM Dossier N°: ${cnamPayment.amount} DT (${cnamPayment.classification})`;
    
    if (otherPayments.length > 0) {
      const otherSummary = otherPayments.map(p => 
        `${p.type === 'especes' ? 'Espèces' : p.type}: ${p.amount} DT (${p.classification})`
      ).join(' | ');
      return `${cnamSummary} | ${otherSummary}`;
    }
    
    return cnamSummary;
  }
  return undefined;
}

/**
 * Extract reference number for backward compatibility
 */
function getReferenceNumber(payments: PaymentFormData[]): string | undefined {
  const refPayment = payments.find(p => p.reference || p.dossierReference);
  return refPayment?.reference || refPayment?.dossierReference;
}

/**
 * Validate payment data before submission
 */
export function validatePaymentData(payments: PaymentFormData[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payments || payments.length === 0) {
    errors.push('Au moins un mode de paiement est requis');
  }

  payments.forEach((payment, index) => {
    if (!payment.type) {
      errors.push(`Type de paiement manquant pour le paiement ${index + 1}`);
    }

    if (!payment.amount || payment.amount <= 0) {
      errors.push(`Montant invalide pour le paiement ${index + 1}`);
    }

    if (!payment.classification) {
      errors.push(`Classification manquante pour le paiement ${index + 1}`);
    }

    // Method-specific validations
    switch (payment.type) {
      case 'cheque':
        if (!payment.numCheque) {
          errors.push(`Numéro de chèque requis pour le paiement ${index + 1}`);
        }
        if (!payment.banque) {
          errors.push(`Nom de la banque requis pour le paiement ${index + 1}`);
        }
        break;

      case 'virement':
        if (!payment.reference) {
          errors.push(`Référence requise pour le virement ${index + 1}`);
        }
        break;

      case 'bank_transfer':
        if (!payment.reference) {
          errors.push(`Référence requise pour le virement bancaire ${index + 1}`);
        }
        break;

      case 'mondat':
        if (!payment.benificiere) {
          errors.push(`Bénéficiaire requis pour le mandat ${index + 1}`);
        }
        break;

      case 'traite':
        if (!payment.nomTraite) {
          errors.push(`Nom de la traite requis pour le paiement ${index + 1}`);
        }
        break;

      case 'cnam':
        if (!payment.etatDossier) {
          errors.push(`État du dossier CNAM requis pour le paiement ${index + 1}`);
        }
        break;
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}
