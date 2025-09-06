import { Empleado } from '../types';

const pad = (str: string | number, length: number, char = ' ') => String(str).padEnd(length, char);
const padNum = (num: number, length: number) => String(num).padStart(length, '0');

const downloadTxtFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Genera el contenido del archivo DGT-3 para el SIRLA.
 * @param rnc - El RNC de la empresa.
 * @param empleados - Lista de empleados activos.
 * @returns El contenido del archivo en formato de texto.
 */
const generateDGT3 = (rnc: string, empleados: Empleado[]): string => {
    return empleados.map(emp => {
        const cedula = emp.cedula.replace(/-/g, '');
        const [nombre, ...apellidos] = emp.nombre.split(' ');
        const salario = Math.round(emp.salarioBrutoMensual * 100); // En centavos
        const fechaIngreso = emp.fechaIngreso.replace(/-/g, '');

        return [
            `"${pad(rnc, 11)}"`,
            `"${pad(cedula, 11)}"`,
            `"${pad(apellidos.join(' '), 30)}"`,
            `"${pad(nombre, 20)}"`,
            '"M"', // Sexo (Hardcoded)
            `"${pad(fechaIngreso, 8)}"`,
            `"${pad(emp.puesto, 20)}"`,
            `"${padNum(salario, 10)}"`,
            '"1"', // Tipo de Ingreso (Fijo)
        ].join(',');
    }).join('\r\n');
};

/**
 * Genera el contenido del archivo DGT-4 para el SIRLA (vacío en este caso).
 * @param rnc - El RNC de la empresa.
 * @returns El contenido del archivo en formato de texto.
 */
const generateDGT4 = (rnc: string): string => {
    // Para este caso, DGT-4 (cambios y salidas) se genera vacío.
    // Una implementación completa requeriría rastrear cambios y salidas.
    return ''; 
};

/**
 * Genera y descarga los archivos DGT-3 y DGT-4 del SIRLA.
 * @param rnc - El RNC de la empresa.
 * @param empleados - La lista completa de empleados de la empresa.
 */
export const generateSirlaReport = (rnc: string, empleados: Empleado[]) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const period = `${year}${month}`;

    const empleadosActivos = empleados.filter(e => e.activo);

    const dgt3Content = generateDGT3(rnc, empleadosActivos);
    const dgt4Content = generateDGT4(rnc);

    downloadTxtFile(dgt3Content, `DGT3_${rnc}_${period}.txt`);
    downloadTxtFile(dgt4Content, `DGT4_${rnc}_${period}.txt`);
};
