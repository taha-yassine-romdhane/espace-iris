/**
 * Payment module index file
 * This file exports all payment-related components, hooks, and configurations
 * 
 * IMPORTANT: To avoid circular dependencies, we're using a different pattern:
 * 1. Export types first
 * 2. Export context and hooks
 * 3. Export components last (since they may depend on types and hooks)
 */

// Export types first to avoid circular dependencies
export type { 
  PaymentData, 
  PaymentContextType, 
  PaymentProviderProps 
} from './context/PaymentContext';
export type { PaymentType } from './config/paymentTypes';

// Export context and hooks
export { 
  PaymentProvider, 
  usePayment 
} from './context/PaymentContext';

// Export payment types configuration
export { PAYMENT_TYPES } from './config/paymentTypes';

// Export components last since they may depend on the above
export { default as PaymentDialog } from './components/PaymentDialog';
export { default as PaymentSummary } from './components/PaymentSummary';
export { default as PaymentTypeCard } from './components/PaymentTypeCard';
export { default as CNAMStepTracker } from './components/CNAMStepTracker';

// We're removing the default export to avoid circular dependencies
// If you need to use the entire module, import individual components instead
