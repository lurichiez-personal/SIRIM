
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
    }
});

function stripTypes(code) {
    return code
        .replace(/import .* from .*/g, '')
        .replace(/interface [\s\S]*?}/g, '')
        .replace(/type [\s\S]*?;/g, '')
        .replace(/: Promise<.*?>/g, '')
        .replace(/: Omit<.*?>/g, '')
        .replace(/: [A-Z][a-zA-Z<>,'\s|]*(\s|=|,|\))/g, '$1')
        .replace(/: (string|number|boolean|any|null|void)/g, '')
        .replace(/as [A-Z][a-zA-Z<>\s|]*/g, '')
        .replace(/as const/g, '')
        .replace(/export /g, '');
}

// Mocks
const firebaseMock = `
const db = {};
const doc = (db, col, id) => ({ db, col, id });
const getDoc = async (ref) => ({ exists: () => false });
const getDocs = async () => ({ docs: [] });
const query = () => ({});
const where = () => ({});
const collection = () => ({});
const getFunctions = () => ({});
const httpsCallable = () => async () => ({ response: { data: { eventId: 'ev1' } } });
const app = {};
`;

global.firestoreMocks = {};

function runTest(filePath, testFn) {
    const code = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    let jsCode = stripTypes(code);

    const evalCode = `
        const CausaDesvinculacion = { Desahucio: 'Desahucio', Despido: 'Despido', Dimision: 'Dimision', Contrato: 'Contrato' };
        const MetodoPago = { '04-COMPRA A CREDITO': '04-COMPRA A CREDITO' };
        ${firebaseMock}
        const useChartOfAccountsStore = { getState: () => ({ getCuentaById: (id) => ({ id, nombre: 'Cuenta ' + id }) }) };
        const useAuthStore = { getState: () => ({ user: { id: 'u1', roles: ['Contador'] } }) };
        const roundToTwoDecimals = (n) => Math.round(n * 100) / 100;
        const validarEscrituraFiscal = async () => true;
        const validateDoubleEntry = () => ({ valid: true });
        const createContableEvent = async (t, data) => { global.lastTransactionUsed = t; return 'event_id'; };

        ${jsCode}
        let exports = {};
        try { if (typeof calculateTaxPenalties !== 'undefined') exports.calculateTaxPenalties = calculateTaxPenalties; } catch(e) {}
        try { if (typeof generarAsientoFacturaVenta !== 'undefined') exports.generarAsientoFacturaVenta = generarAsientoFacturaVenta; } catch(e) {}
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

runTest('utils/accountingUtils.ts', (exports) => {
    const { generarAsientoFacturaVenta } = exports;
    describe('generarAsientoFacturaVenta (Atomic)', () => {
        it('should pass the transaction object to createContableEvent', async () => {
            const mockTransaction = { id: 'tx_123' };
            const mockFactura = {
                empresaId: 'emp1',
                fecha: '2025-01-01',
                montoTotal: 118,
                montoPagado: 118,
                subtotal: 100,
                itbis: 18,
                items: [],
                clienteNombre: 'Test'
            };
            await generarAsientoFacturaVenta(mockFactura, [], mockTransaction);
            if (global.lastTransactionUsed !== mockTransaction) {
                throw new Error("Transaction was not passed correctly");
            }
        });
    });
});
