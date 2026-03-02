// src/utils/formatters.ts

/**
 * Formats a number as a currency string for the Dominican Republic (DOP).
 * Uses comma for thousands and period for decimals.
 * @param value The number to format.
 * @returns A formatted currency string, e.g., "RD$1,234.56".
 */
export const formatCurrency = (value: number | undefined | null): string => {
  if (value === null || value === undefined || isNaN(value)) {
    value = 0;
  }
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
};

/**
 * Parses a string that may contain currency symbols, thousand separators (,) and whitespace into a number.
 * It expects a period (.) as the decimal separator.
 * @param value The string to parse.
 * @returns The parsed number, or 0 if parsing fails.
 */
export const parseLocaleNumber = (value: string | undefined | null): number => {
    if (value === null || value === undefined || typeof value !== 'string' || value.trim() === '') {
        return 0;
    }
    // Remove currency symbols, thousand separators (commas), and whitespace
    const sanitizedValue = value.replace(/[$,\s]/g, '');
    const number = parseFloat(sanitizedValue);
    return isNaN(number) ? 0 : number;
};

/**
 * Rounds a number to exactly 2 decimal places using standard rounding.
 * Handles floating point precision issues (e.g. 1.005 -> 1.01).
 */
export const roundToTwoDecimals = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
};