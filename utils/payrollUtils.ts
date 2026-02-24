import { Empleado, NominaEmpleado, CausaDesvinculacion } from '../types';

// --- Tasas de la TSS (a ser actualizadas según la ley) ---
// Deducciones del Empleado
const SFS_EMPLEADO_TASA = 0.0304;
const AFP_EMPLEADO_TASA = 0.0287;

// Aportes del Empleador
const SFS_EMPLEADOR_TASA = 0.0709;
const SRL_EMPLEADOR_TASA = 0.012; // Tasa promedio, puede variar
const AFP_EMPLEADOR_TASA = 0.0710;
const INFOTEP_TASA = 0.01;

// Topes Salariales Cotizables
const SFS_TOPE = 175_305.00; // 10 salarios mínimos cotizables
const AFP_TOPE = 350_610.00; // 20 salarios mínimos cotizables

// --- Escalas ISR (a ser actualizadas según la ley - Anual) ---
const ISR_ESCALAS_ANUAL = [
    { limite: 416220.00, tasa: 0.0, excedenteDe: 0, sumaFija: 0 },
    { limite: 624329.00, tasa: 0.15, excedenteDe: 416220.01, sumaFija: 0 },
    { limite: 867123.00, tasa: 0.20, excedenteDe: 624329.01, sumaFija: 31216.00 },
    { limite: Infinity,  tasa: 0.25, excedenteDe: 867123.01, sumaFija: 79776.00 },
];

/**
 * Calcula las deducciones de TSS (SFS y AFP) para un salario bruto mensual.
 * @param salarioBruto - El salario bruto mensual del empleado.
 * @returns Un objeto con los montos de SFS y AFP a deducir.
 */
const calcularDeduccionesTSS = (salarioBruto: number): { sfs: number, afp: number } => {
    const sfsSalarioCotizable = Math.min(salarioBruto, SFS_TOPE);
    const afpSalarioCotizable = Math.min(salarioBruto, AFP_TOPE);

    const sfs = sfsSalarioCotizable * SFS_EMPLEADO_TASA;
    const afp = afpSalarioCotizable * AFP_EMPLEADO_TASA;
    
    return { sfs, afp };
};

const calcularAportesEmpleador = (salarioBruto: number): { sfs: number, srl: number, afp: number, infotep: number } => {
    const sfsSalarioCotizable = Math.min(salarioBruto, SFS_TOPE);
    const afpSalarioCotizable = Math.min(salarioBruto, AFP_TOPE);
    
    const sfs = sfsSalarioCotizable * SFS_EMPLEADOR_TASA;
    const srl = sfsSalarioCotizable * SRL_EMPLEADOR_TASA;
    const afp = afpSalarioCotizable * AFP_EMPLEADOR_TASA;
    const infotep = salarioBruto * INFOTEP_TASA;
    
    return { sfs, srl, afp, infotep };
}

/**
 * Calcula la retención mensual del Impuesto Sobre la Renta (ISR).
 * @param salarioBruto - El salario bruto mensual.
 * @param sfs - La deducción mensual de SFS.
 * @param afp - La deducción mensual de AFP.
 * @returns La retención de ISR mensual.
 */
const calcularRetencionISR = (salarioBruto: number, sfs: number, afp: number): number => {
    const salarioNetoImponibleAnual = (salarioBruto - sfs - afp) * 12;

    if (salarioNetoImponibleAnual <= 416220.00) {
        return 0;
    }

    let isrAnual = 0;
    if (salarioNetoImponibleAnual <= 624329.00) {
        isrAnual = (salarioNetoImponibleAnual - 416220.00) * 0.15;
    } else if (salarioNetoImponibleAnual <= 867123.00) {
        isrAnual = ((salarioNetoImponibleAnual - 624329.00) * 0.20) + 31216.00;
    } else {
        isrAnual = ((salarioNetoImponibleAnual - 867123.00) * 0.25) + 79776.00;
    }
    
    return isrAnual > 0 ? isrAnual / 12 : 0;
};

/**
 * Procesa todos los cálculos de nómina para un solo empleado.
 * @param empleado - El objeto del empleado a procesar.
 * @returns Un objeto NominaEmpleado con todos los cálculos.
 */
export const procesarNominaEmpleado = (empleado: Empleado): NominaEmpleado => {
    const salarioBruto = empleado.salarioBrutoMensual;
    const { sfs, afp } = calcularDeduccionesTSS(salarioBruto);
    const isr = calcularRetencionISR(salarioBruto, sfs, afp);
    const totalDeduccionesEmpleado = sfs + afp + isr;

    const aportesEmpleador = calcularAportesEmpleador(salarioBruto);
    const totalAportesEmpleador = aportesEmpleador.sfs + aportesEmpleador.srl + aportesEmpleador.afp + aportesEmpleador.infotep;
    
    const salarioNeto = salarioBruto - totalDeduccionesEmpleado;

    return {
        empleadoId: empleado.id,
        nombre: empleado.nombre,
        salarioBruto,
        afp,
        sfs,
        isr,
        totalDeduccionesEmpleado,
        sfsEmpleador: aportesEmpleador.sfs,
        srlEmpleador: aportesEmpleador.srl,
        afpEmpleador: aportesEmpleador.afp,
        infotep: aportesEmpleador.infotep,
        totalAportesEmpleador,
        salarioNeto,
    };
};

/**
 * Calcula las prestaciones laborales de un empleado al terminar su contrato.
 * @param empleado - El empleado a desvincular.
 * @param fechaSalida - La fecha de salida en formato 'YYYY-MM-DD'.
 * @param causa - La causa de la terminación del contrato.
 * @returns Un objeto con el desglose de las prestaciones.
 */
export const calcularPrestaciones = (
    empleado: Empleado, 
    fechaSalida: string, 
    causa: CausaDesvinculacion
): { preaviso: number; cesantia: number; vacaciones: number; salarioNavidad: number; total: number; } => {
    
    const fechaIngresoDate = new Date(empleado.fechaIngreso + 'T00:00:00Z');
    const fechaSalidaDate = new Date(fechaSalida + 'T00:00:00Z');

    const diffTime = fechaSalidaDate.getTime() - fechaIngresoDate.getTime();
    if (diffTime < 0) return { preaviso: 0, cesantia: 0, vacaciones: 0, salarioNavidad: 0, total: 0 };

    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const mesesCompletos = Math.floor(diffDays / 30.4375);
    const añosCompletos = Math.floor(mesesCompletos / 12);

    const salarioDiario = empleado.salarioBrutoMensual / 23.83;
    
    let preaviso = 0;
    let cesantia = 0;

    if (causa === CausaDesvinculacion.Desahucio) {
        // Cálculo del Preaviso
        if (mesesCompletos >= 3 && mesesCompletos < 6) {
            preaviso = 7 * salarioDiario;
        } else if (mesesCompletos >= 6 && mesesCompletos < 12) {
            preaviso = 14 * salarioDiario;
        } else if (mesesCompletos >= 12) {
            preaviso = 28 * salarioDiario;
        }

        // Cálculo de la Cesantía
        if (mesesCompletos >= 3 && mesesCompletos < 6) {
            cesantia = 6 * salarioDiario;
        } else if (mesesCompletos >= 6 && mesesCompletos < 12) {
            cesantia = 13 * salarioDiario;
        } else if (añosCompletos >= 1 && añosCompletos < 5) {
            cesantia = (21 * salarioDiario) * añosCompletos;
        } else if (añosCompletos >= 5) {
            cesantia = (23 * salarioDiario) * añosCompletos;
        }
    }

    // Cálculo de Vacaciones (derecho adquirido)
    let vacaciones = 0;
    if (añosCompletos >= 5) {
        vacaciones = 18 * salarioDiario;
    } else if (añosCompletos >= 1) {
        vacaciones = 14 * salarioDiario;
    } else if (mesesCompletos >= 5) {
        const diasVacacionesProporcional = [0,0,0,0,0, 6, 7, 8, 9, 10, 11, 12];
        vacaciones = (diasVacacionesProporcional[mesesCompletos] || 0) * salarioDiario;
    }

    // Cálculo del Salario de Navidad (Regalía Pascual)
    const mesSalida = fechaSalidaDate.getUTCMonth(); // 0-11
    let mesesTrabajadosEnAño = 0;
    if (fechaSalidaDate.getUTCFullYear() > fechaIngresoDate.getUTCFullYear()) {
        mesesTrabajadosEnAño = mesSalida + 1;
    } else {
        mesesTrabajadosEnAño = mesSalida - fechaIngresoDate.getUTCMonth();
    }
    const salarioNavidad = (empleado.salarioBrutoMensual * mesesTrabajadosEnAño) / 12;

    const total = preaviso + cesantia + vacaciones + salarioNavidad;

    return { preaviso, cesantia, vacaciones, salarioNavidad, total };
};