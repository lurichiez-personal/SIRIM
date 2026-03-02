
const fs = require('fs');
const path = require('path');

// Simple mock for vitest
const describe = (name, fn) => {
    console.log(`\nDESCRIBE: ${name}`);
    fn();
};

const it = (name, fn) => {
    try {
        fn();
        console.log(`  ✅ ${name}`);
    } catch (e) {
        console.log(`  ❌ ${name}`);
        console.error(e);
        process.exit(1);
    }
};

const expect = (actual) => ({
    toBe: (expected) => {
        if (actual !== expected) {
            throw new Error(`Expected ${expected} but got ${actual}`);
        }
    },
    toBeCloseTo: (expected, precision = 2) => {
        const diff = Math.abs(actual - expected);
        if (diff > (Math.pow(10, -precision) / 2)) {
            throw new Error(`Expected ${expected} to be close to ${actual} (diff: ${diff})`);
        }
    },
    toBeGreaterThan: (expected) => {
        if (!(actual > expected)) {
            throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
    }
});

function stripTypes(code) {
    return code
        .replace(/import .* from .*/g, '')
        .replace(/:\s*(number|string|any|Empleado|NominaEmpleado|CausaDesvinculacion|PenaltyCalculation|{.*?})/g, '')
        .replace(/interface [\s\S]*?}/g, '')
        .replace(/export /g, '');
}

function runTest(filePath, testFn) {
    const code = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    const jsCode = stripTypes(code);

    const evalCode = `
    (function() {
        const CausaDesvinculacion = { Desahucio: 'Desahucio', Despido: 'Despido', Dimision: 'Dimision', Contrato: 'Contrato' };
        ${jsCode}
        if (typeof calculateTaxPenalties !== 'undefined') return { calculateTaxPenalties };
        if (typeof procesarNominaEmpleado !== 'undefined') return { procesarNominaEmpleado, calcularPrestaciones };
        return {};
    })()
    `;

    try {
        const exports = eval(evalCode);
        testFn(exports);
    } catch (e) {
        console.error(`Eval failed for ${filePath}:`, e);
        process.exit(1);
    }
}

// Tests for Tax Calculations
runTest('utils/taxCalculations.ts', (exports) => {
    const { calculateTaxPenalties } = exports;
    describe('calculateTaxPenalties', () => {
        it('should return zero penalties if paid on time', () => {
            const result = calculateTaxPenalties(1000, '2025-01-15', '2025-01-15');
            expect(result.moraAmount).toBe(0);
            expect(result.interestAmount).toBe(0);
        });

        it('should calculate 10% mora for the first month', () => {
            const result = calculateTaxPenalties(1000, '2025-01-15', '2025-01-16');
            expect(result.moraAmount).toBe(100);
            expect(result.interestAmount).toBe(11);
        });

        it('should calculate 14% mora for 2 months (10% + 4%)', () => {
            const result = calculateTaxPenalties(1000, '2025-01-15', '2025-02-16');
            expect(result.moraAmount).toBe(140);
            expect(result.interestAmount).toBe(22);
        });
    });
});

// Tests for Payroll Utils
runTest('utils/payrollUtils.ts', (exports) => {
    const { procesarNominaEmpleado, calcularPrestaciones } = exports;
    describe('procesarNominaEmpleado', () => {
        it('should calculate TSS correctly for a standard salary', () => {
            const empleado = { id: '1', nombre: 'Test', salarioBrutoMensual: 50000 };
            const result = procesarNominaEmpleado(empleado);

            expect(result.sfs).toBe(1520);
            expect(result.afp).toBe(1435);
        });

        it('should calculate ISR correctly for a high salary', () => {
            const empleado = { id: '2', nombre: 'Rich', salarioBrutoMensual: 100000 };
            const result = procesarNominaEmpleado(empleado);
            expect(Math.round(result.isr)).toBe(12105);
        });
    });

    describe('calcularPrestaciones', () => {
        it('should calculate benefits for Desahucio with 1 year', () => {
            const empleado = {
                id: '4',
                nombre: 'Ex-Empleado',
                salarioBrutoMensual: 30000,
                fechaIngreso: '2023-01-01'
            };
            const result = calcularPrestaciones(empleado, '2024-01-01', 'Desahucio');
            expect(result.total).toBeGreaterThan(30000); // Salario navidad + vacaciones + cesantia + preaviso
        });
    });
});
