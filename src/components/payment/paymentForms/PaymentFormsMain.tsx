/**
 * PaymentFormsMain.tsx
 * 
 * This file exports the payment context for use in payment forms.
 * To avoid circular dependencies, we only export the minimum necessary.
 */

// Only export what's needed for payment forms
import { usePayment } from '../context/PaymentContext';
import type { PaymentData } from '../context/PaymentContext';

// Re-export only what's needed for the payment forms
export { usePayment };
export type { PaymentData };

// No default export to avoid circular dependencies
