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
 * @param salarioBruto - El salario bruto mensual del empleado.
 * @param totalDeduccionesTSS - La suma de las deducciones de SFS y AFP.
 * @returns El monto de ISR a retener en el mes.
 */
const calcularISR = (salarioBruto: number, totalDeduccionesTSS: number): number => {
    const salarioNetoImponibleAnual = (salarioBruto - totalDeduccionesTSS) * 12;

    if (salarioNetoImponibleAnual <= ISR_ESCALAS_ANUAL[0].limite) {
        return 0;
    }

    const escala = ISR_ESCALAS_ANUAL.find(e => salarioNetoImponibleAnual <= e.limite);
    
    if (!escala) {
        return 0; // Should not happen with Infinity limit
    }
    
    const excedente = salarioNetoImponibleAnual - escala.excedenteDe;
    const impuestoAnual = (excedente * escala.tasa) + escala.sumaFija;
    
    return impuestoAnual / 12;
};

/**
 * Procesa la nómina para un empleado, calculando todas las deducciones, aportes y el salario neto.
 */
export const procesarNominaEmpleado = (empleado: Empleado): NominaEmpleado => {
    const salarioBruto = empleado.salarioBrutoMensual;

    const deducciones = calcularDeduccionesTSS(salarioBruto);
    const totalDeduccionesTSS = deducciones.sfs + deducciones.afp;
    
    const isr = calcularISR(salarioBruto, totalDeduccionesTSS);
    
    const totalDeduccionesEmpleado = totalDeduccionesTSS + isr;
    const salarioNeto = salarioBruto - totalDeduccionesEmpleado;

    const aportes = calcularAportesEmpleador(salarioBruto);
    const totalAportesEmpleador = aportes.sfs + aportes.srl + aportes.afp + aportes.infotep;

    return {
        empleadoId: empleado.id,
        nombre: empleado.nombre,
        salarioBruto,
        sfs: deducciones.sfs,
        afp: deducciones.afp,
        isr,
        totalDeduccionesEmpleado,
        sfsEmpleador: aportes.sfs,
        srlEmpleador: aportes.srl,
        // FIX: Added missing afpEmpleador property to match the NominaEmpleado type.
        afpEmpleador: aportes.afp,
        infotep: aportes.infotep,
        totalAportesEmpleador,
        salarioNeto,
    };
};

/**
 * Calcula las prestaciones laborales de un empleado.
 */
export const calcularPrestaciones = (empleado: Empleado, fechaSalida: string, causa: CausaDesvinculacion) => {
    const fechaIngreso = new Date(empleado.fechaIngreso + 'T00:00:00');
    const fechaSalidaDate = new Date(fechaSalida + 'T00:00:00');
    
    const aniosTrabajados = (fechaSalidaDate.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const mesesTrabajados = aniosTrabajados * 12;

    const salarioDiario = empleado.salarioBrutoMensual / 23.83;
    
    let preaviso = 0;
    let cesantia = 0;

    // --- Preaviso y Cesantía ---
    if (causa === 'desahucio') {
        if (mesesTrabajados >= 3 && mesesTrabajados < 6) { preaviso = 7 * salarioDiario; cesantia = 6 * salarioDiario; } 
        else if (mesesTrabajados >= 6 && mesesTrabajados < 12) { preaviso = 14 * salarioDiario; cesantia = 13 * salarioDiario; } 
        else if (aniosTrabajados >= 1 && aniosTrabajados < 5) { preaviso = 28 * salarioDiario; cesantia = 21 * salarioDiario * aniosTrabajados; } 
        else if (aniosTrabajados >= 5) { preaviso = 28 * salarioDiario; cesantia = 23 * salarioDiario * aniosTrabajados; }
    }
    
    // --- Vacaciones ---
    // Simplificado: asume que las vacaciones no han sido tomadas en el último período.
    let vacaciones = 0;
    if (mesesTrabajados >= 5) {
        const diasVacaciones = aniosTrabajados >= 5 ? 18 : 14;
        const diasProporcionales = (diasVacaciones / 12) * (mesesTrabajados % 12);
        vacaciones = diasProporcionales * salarioDiario;
    }

    // --- Salario de Navidad (Regalía Pascual) ---
    const mesesDelAnioSalida = fechaSalidaDate.getMonth() + 1;
    const salarioNavidad = (empleado.salarioBrutoMensual * mesesDelAnioSalida) / 12;

    const total = preaviso + cesantia + vacaciones + salarioNavidad;

    return { preaviso, cesantia, vacaciones, salarioNavidad, total };
};