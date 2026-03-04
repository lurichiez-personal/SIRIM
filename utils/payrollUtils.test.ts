
import { describe, it, expect } from 'vitest';
import { procesarNominaEmpleado } from './payrollUtils';
import { Role, RolePermissions, Permission, Empleado } from '../types';

describe('procesarNominaEmpleado', () => {
    it('debe calcular TSS correctamente (SFS y AFP)', () => {
        const empleado: any = {
            id: '1',
            nombre: 'Juan Perez',
            salarioBrutoMensual: 50000,
        };
        const result = procesarNominaEmpleado(empleado);
        expect(result.sfs).toBe(1520); // 50000 * 0.0304
        expect(result.afp).toBe(1435); // 50000 * 0.0287
    });

    it('debe calcular ISR correctamente para salarios altos', () => {
        const empleado: any = {
            id: '2',
            nombre: 'Maria Garcia',
            salarioBrutoMensual: 100000,
        };
        const result = procesarNominaEmpleado(empleado);
        // Explicación del cálculo en mini-test-runner.cjs
        expect(Math.round(result.isr)).toBe(12105);
    });

    it('debe aplicar topes de TSS', () => {
        const empleado: any = {
            id: '3',
            nombre: 'Director',
            salarioBrutoMensual: 500000,
        };
        const result = procesarNominaEmpleado(empleado);
        // Topes SFS: 175,305 * 0.0304 = 5329.27
        expect(Math.floor(result.sfs)).toBe(5329);
        // Topes AFP: 350,610 * 0.0287 = 10062.51
        expect(Math.floor(result.afp)).toBe(10062);
    });
});
