/**
 * Utility functions for consistent price and amount handling across the application
 */

/**
 * Safely converts any value to a number for financial calculations
 * @param value - The value to convert (string, number, or any)
 * @returns A valid number, defaulting to 0 if conversion fails
 */
export function toNumber(value: any): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
}

/**
 * Formats a number as a price string with 2 decimal places
 * @param value - The value to format
 * @returns Formatted price string (e.g., "123.45")
 */
export function formatPrice(value: any): string {
  return toNumber(value).toFixed(2);
}

/**
 * Formats a number as a currency string with DT suffix
 * @param value - The value to format
 * @returns Formatted currency string (e.g., "123.45 DT")
 */
export function formatCurrency(value: any): string {
  return `${formatPrice(value)} DT`;
}

/**
 * Calculates the total for an array of items with price and quantity
 * @param items - Array of items with sellingPrice and quantity properties
 * @returns Total amount
 */
export function calculateItemsTotal(items: Array<{ sellingPrice?: any; quantity?: any }>): number {
  return items.reduce((sum, item) => {
    const price = toNumber(item.sellingPrice);
    const quantity = toNumber(item.quantity) || 1;
    return sum + (price * quantity);
  }, 0);
}

/**
 * Calculates the total amount from payment data
 * @param payments - Array of payment objects with amount property
 * @returns Total paid amount
 */
export function calculatePaymentsTotal(payments: Array<{ amount?: any }>): number {
  return payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
}

/**
 * Calculates remaining amount to be paid
 * @param totalAmount - Total amount due
 * @param paidAmount - Amount already paid
 * @returns Remaining amount (minimum 0)
 */
export function calculateRemainingAmount(totalAmount: any, paidAmount: any): number {
  return Math.max(0, toNumber(totalAmount) - toNumber(paidAmount));
}

/**
 * Checks if an amount is fully paid (within 1 cent tolerance)
 * @param totalAmount - Total amount due
 * @param paidAmount - Amount already paid
 * @returns True if fully paid
 */
export function isFullyPaid(totalAmount: any, paidAmount: any): boolean {
  return calculateRemainingAmount(totalAmount, paidAmount) <= 0.01;
}

/**
 * Round amount to 2 decimal places to avoid floating-point precision issues
 * @param amount - The amount to round
 * @returns Amount rounded to 2 decimal places
 */
export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}