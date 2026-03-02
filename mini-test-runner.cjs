
const fs = require('fs');
const path = require('path');

// Simple mock for vitest
const describe = (name, fn) => {
    console.log(`\nDESCRIBE: ${name}`);
    fn();
};

const it = (name, fn) => {
    const res = fn();
    if (res && typeof res.then === 'function') {
        res.then(() => {
            console.log(`  ✅ ${name}`);
        }).catch(e => {
            console.log(`  ❌ ${name}`);
            console.error(e);
            process.exit(1);
        });
    } else {
        console.log(`  ✅ ${name}`);
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
    },
    toThrow: () => {
        let threw = false;
        try {
            actual();
        } catch (e) {
            threw = true;
        }
        if (!threw) {
            throw new Error(`Expected function to throw but it did not`);
        }
    },
    rejects: {
        toThrow: async () => {
            let threw = false;
            try {
                await actual;
            } catch (e) {
                threw = true;
            }
            if (!threw) {
                throw new Error(`Expected promise to reject but it resolved`);
            }
        }
    }
});

function stripTypes(code) {
    return code
        .replace(/import .* from .*/g, '')
        .replace(/:\s*(number|string|any|Empleado|NominaEmpleado|CausaDesvinculacion|PenaltyCalculation|{.*?})/g, '')
        .replace(/interface [\s\S]*?}/g, '')
        .replace(/as \s*\w+/g, '') // Remove type assertions
        .replace(/transaction\s*\|\s*null/g, 'transaction') // Specific fix
        .replace(/periodo\s*\|\s*null/g, 'periodo') // Specific fix
        .replace(/export /g, '');
}

// Mocks for Firebase
const firebaseMock = `
const db = {};
const doc = (db, col, id) => ({ db, col, id });
const getDoc = async (ref) => {
    const key = ref.col + '/' + ref.id;
    const mock = global.firestoreMocks[key];
    return {
        exists: () => !!mock,
        data: () => mock
    };
};
const getDocs = async () => ({ docs: [] });
const query = () => ({});
const where = () => ({});
const collection = () => ({});
const getFunctions = () => ({});
const httpsCallable = () => async () => ({});
const app = {};
`;

global.firestoreMocks = {};

function runTest(filePath, testFn) {
    const code = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    let jsCode = stripTypes(code);

    const evalCode = `
        const CausaDesvinculacion = { Desahucio: 'Desahucio', Despido: 'Despido', Dimision: 'Dimision', Contrato: 'Contrato' };
        ${firebaseMock}
        ${jsCode}
        let exports = {};
        try { if (typeof validarEscrituraFiscal !== 'undefined') exports.validarEscrituraFiscal = validarEscrituraFiscal; } catch(e) {}
        try { if (typeof calculateTaxPenalties !== 'undefined') exports.calculateTaxPenalties = calculateTaxPenalties; } catch(e) {}
        try { if (typeof procesarNominaEmpleado !== 'undefined') exports.procesarNominaEmpleado = procesarNominaEmpleado; } catch(e) {}
        try { if (typeof calcularPrestaciones !== 'undefined') exports.calcularPrestaciones = calcularPrestaciones; } catch(e) {}
        try { if (typeof formatAmt !== 'undefined') exports.formatAmt = formatAmt; } catch(e) {}
        return exports;
    `;

    try {
        const exports = (new Function(evalCode))();
        testFn(exports);
    } catch (e) {
        console.error(`Eval failed for ${filePath}:`, e);
        process.exit(1);
    }
}

// Tests for Fiscal Engine
runTest('utils/fiscalEngine.ts', (exports) => {
    const { validarEscrituraFiscal } = exports;
    describe('validarEscrituraFiscal', () => {
        it('should allow writing if no closure exists', async () => {
            global.firestoreMocks = {};
            await validarEscrituraFiscal('emp1', '2025-05-15', 'user1');
            // Should not throw
        });

        it('should throw if annual year is sealed (IR-2 Presented)', async () => {
            global.firestoreMocks = {
                'fiscalAnnualClosure/emp1_2024': { estado: 'IR2_PRESENTADO' }
            };
            await expect(validarEscrituraFiscal('emp1', '2024-05-15', 'user1')).rejects.toThrow();
        });

        it('should throw if monthly period is closed', async () => {
            global.firestoreMocks = {
                'periodosMensuales/emp1_2025-01': { estado: 'CERRADO' }
            };
            await expect(validarEscrituraFiscal('emp1', '2025-01-10', 'user1')).rejects.toThrow();
        });
    });
});

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
    const { procesarNominaEmpleado } = exports;
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
});

// Tests for DGII Reports
runTest('utils/dgiiReportUtils.ts', (exports) => {
    const { formatAmt } = exports;
    describe('formatAmt (DGII format)', () => {
        it('should return empty string for zero', () => {
            expect(formatAmt(0)).toBe('');
        });
        it('should format decimals correctly (max 2)', () => {
            expect(formatAmt(1234.567)).toBe('1234.57');
            expect(formatAmt(1234)).toBe('1234');
        });
    });
});
