
import { describe, it, expect } from 'vitest';
import { calculateTaxPenalties } from './taxCalculations';

describe('calculateTaxPenalties', () => {
    it('should return zero penalties if paid on time', () => {
        const result = calculateTaxPenalties(1000, '2025-01-15', '2025-01-15');
        expect(result.moraAmount).toBe(0);
        expect(result.interestAmount).toBe(0);
        expect(result.totalToPay).toBe(1000);
    });

    it('should calculate 10% mora for the first month or fraction', () => {
        const result = calculateTaxPenalties(1000, '2025-01-15', '2025-01-16');
        expect(result.monthsLate).toBe(1);
        expect(result.moraAmount).toBe(100); // 10% of 1000
        expect(result.interestAmount).toBe(11); // 1.10% of 1000
    });

    it('should calculate 10% + 4% for the second month', () => {
        const result = calculateTaxPenalties(1000, '2025-01-15', '2025-02-16');
        expect(result.monthsLate).toBe(2);
        expect(result.moraAmount).toBe(140); // 10% + 4% = 14%
        expect(result.interestAmount).toBe(22); // 2.20%
    });
});
