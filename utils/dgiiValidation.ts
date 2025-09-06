// Sistema robusto de validación para reportes DGII
// Cumplimiento fiscal República Dominicana - Forms 606, 607, 608

import { Gasto, Factura, NotaCreditoDebito, Cliente } from '../types';

export interface DGIIValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
  };
}

export interface DGIIReportData {
  gastos: Gasto[];
  facturas: Factura[];
  notasCredito: NotaCreditoDebito[];
  anuladas: { ncf: string; fecha: string; tipo: string }[];
  clientes: Cliente[];
  empresaRNC: string;
  period: string;
}

// Validador robusto para formato 606 (Compras y Gastos)
export const validate606Data = (gastos: Gasto[], empresaRNC: string, period: string): DGIIValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let validRecords = 0;

  // Validación de encabezado
  if (!empresaRNC || empresaRNC.replace(/-/g, '').length !== 9) {
    errors.push('RNC de empresa inválido para reporte 606');
  }

  if (!period || !/^\d{6}$/.test(period)) {
    errors.push('Período debe tener formato YYYYMM para reporte 606');
  }

  // Validación por cada gasto
  gastos.forEach((gasto, index) => {
    const recordErrors: string[] = [];
    const recordWarnings: string[] = [];

    // Validar RNC/Cédula del proveedor
    const rncProveedor = (gasto.rncProveedor || '').replace(/-/g, '');
    if (!rncProveedor) {
      recordWarnings.push(`Registro ${index + 1}: Falta RNC/Cédula del proveedor`);
    } else if (rncProveedor.length !== 9 && rncProveedor.length !== 11) {
      recordErrors.push(`Registro ${index + 1}: RNC/Cédula del proveedor tiene formato inválido`);
    }

    // Validar NCF
    const ncf = gasto.ncf || '';
    if (!ncf) {
      recordWarnings.push(`Registro ${index + 1}: Falta NCF`);
    } else if (ncf.length !== 11 && ncf.length !== 13) {
      recordErrors.push(`Registro ${index + 1}: NCF tiene formato inválido`);
    } else if (!validateNCFFormat(ncf)) {
      recordErrors.push(`Registro ${index + 1}: NCF no cumple formato DGII válido`);
    }

    // Validar montos
    if (!gasto.monto || gasto.monto <= 0) {
      recordErrors.push(`Registro ${index + 1}: Monto debe ser mayor a cero`);
    }

    if (gasto.itbis < 0) {
      recordErrors.push(`Registro ${index + 1}: ITBIS no puede ser negativo`);
    }

    // Validar fecha
    if (!gasto.fecha) {
      recordErrors.push(`Registro ${index + 1}: Fecha requerida`);
    } else {
      const fechaGasto = new Date(gasto.fecha);
      const periodYear = parseInt(period.substring(0, 4));
      const periodMonth = parseInt(period.substring(4, 6));
      
      if (fechaGasto.getFullYear() !== periodYear || fechaGasto.getMonth() + 1 !== periodMonth) {
        recordErrors.push(`Registro ${index + 1}: Fecha no corresponde al período reportado`);
      }
    }

    // Validar categoría de gasto
    if (!gasto.categoriaGasto) {
      recordWarnings.push(`Registro ${index + 1}: Falta categoría de gasto para clasificación DGII`);
    }

    if (recordErrors.length === 0) {
      validRecords++;
    } else {
      errors.push(...recordErrors);
    }
    
    warnings.push(...recordWarnings);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRecords: gastos.length,
      validRecords,
      invalidRecords: gastos.length - validRecords
    }
  };
};

// Validador robusto para formato 607 (Ingresos y Ventas)
export const validate607Data = (
  facturas: Factura[], 
  notasCredito: NotaCreditoDebito[], 
  clientes: Cliente[],
  empresaRNC: string, 
  period: string
): DGIIValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let validRecords = 0;
  const totalRecords = facturas.length + notasCredito.length;

  // Validación de encabezado
  if (!empresaRNC || empresaRNC.replace(/-/g, '').length !== 9) {
    errors.push('RNC de empresa inválido para reporte 607');
  }

  // Crear mapa de clientes para búsqueda rápida
  const clientesMap = new Map(clientes.map(c => [c.id, c]));

  // Validar facturas
  facturas.forEach((factura, index) => {
    const recordErrors: string[] = [];
    const recordWarnings: string[] = [];

    // Validar cliente
    const cliente = clientesMap.get(factura.clienteId);
    if (!cliente) {
      recordErrors.push(`Factura ${index + 1}: Cliente no encontrado`);
    } else {
      const clienteRNC = (cliente.rnc || '').replace(/-/g, '');
      if (!clienteRNC) {
        recordWarnings.push(`Factura ${index + 1}: Cliente sin RNC/Cédula`);
      } else if (clienteRNC.length !== 9 && clienteRNC.length !== 11) {
        recordErrors.push(`Factura ${index + 1}: RNC/Cédula del cliente inválido`);
      }
    }

    // Validar NCF
    if (!factura.ncf) {
      recordErrors.push(`Factura ${index + 1}: NCF requerido`);
    } else if (!validateNCFFormat(factura.ncf)) {
      recordErrors.push(`Factura ${index + 1}: NCF no cumple formato DGII válido`);
    }

    // Validar montos
    if (!factura.montoTotal || factura.montoTotal <= 0) {
      recordErrors.push(`Factura ${index + 1}: Monto total debe ser mayor a cero`);
    }

    if (factura.itbis < 0) {
      recordErrors.push(`Factura ${index + 1}: ITBIS no puede ser negativo`);
    }

    // Validar coherencia de montos
    const montoEsperado = factura.subtotal + factura.itbis + (factura.isc || 0) + (factura.propinaLegal || 0);
    if (Math.abs(factura.montoTotal - montoEsperado) > 0.01) {
      recordErrors.push(`Factura ${index + 1}: Inconsistencia en cálculo de montos totales`);
    }

    // Validar estado
    if (!['Emitida', 'Pagada', 'PagadaParcialmente', 'Vencida'].includes(factura.estado)) {
      recordErrors.push(`Factura ${index + 1}: Estado inválido para reporte 607`);
    }

    if (recordErrors.length === 0) {
      validRecords++;
    } else {
      errors.push(...recordErrors);
    }
    
    warnings.push(...recordWarnings);
  });

  // Validar notas de crédito
  notasCredito.forEach((nota, index) => {
    const recordErrors: string[] = [];
    const recordWarnings: string[] = [];

    // Validar NCF
    if (!nota.ncf) {
      recordErrors.push(`Nota de Crédito ${index + 1}: NCF requerido`);
    } else if (!validateNCFFormat(nota.ncf)) {
      recordErrors.push(`Nota de Crédito ${index + 1}: NCF no cumple formato DGII válido`);
    }

    // Validar factura afectada
    if (!nota.facturaAfectadaNCF) {
      recordErrors.push(`Nota de Crédito ${index + 1}: NCF de factura afectada requerido`);
    }

    // Validar montos (deben ser positivos, se convierten a negativos en el reporte)
    if (!nota.montoTotal || nota.montoTotal <= 0) {
      recordErrors.push(`Nota de Crédito ${index + 1}: Monto total debe ser mayor a cero`);
    }

    if (recordErrors.length === 0) {
      validRecords++;
    } else {
      errors.push(...recordErrors);
    }
    
    warnings.push(...recordWarnings);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRecords,
      validRecords,
      invalidRecords: totalRecords - validRecords
    }
  };
};

// Validador robusto para formato 608 (Comprobantes Anulados)
export const validate608Data = (
  anuladas: { ncf: string; fecha: string; tipo: string }[], 
  empresaRNC: string, 
  period: string
): DGIIValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let validRecords = 0;

  // Validación de encabezado
  if (!empresaRNC || empresaRNC.replace(/-/g, '').length !== 9) {
    errors.push('RNC de empresa inválido para reporte 608');
  }

  // Validar cada documento anulado
  anuladas.forEach((anulada, index) => {
    const recordErrors: string[] = [];

    // Validar NCF
    if (!anulada.ncf) {
      recordErrors.push(`Anulada ${index + 1}: NCF requerido`);
    } else if (!validateNCFFormat(anulada.ncf)) {
      recordErrors.push(`Anulada ${index + 1}: NCF no cumple formato DGII válido`);
    }

    // Validar fecha
    if (!anulada.fecha) {
      recordErrors.push(`Anulada ${index + 1}: Fecha de anulación requerida`);
    } else {
      const fechaAnulacion = new Date(anulada.fecha);
      const periodYear = parseInt(period.substring(0, 4));
      const periodMonth = parseInt(period.substring(4, 6));
      
      if (fechaAnulacion.getFullYear() !== periodYear || fechaAnulacion.getMonth() + 1 !== periodMonth) {
        recordErrors.push(`Anulada ${index + 1}: Fecha no corresponde al período reportado`);
      }
    }

    if (recordErrors.length === 0) {
      validRecords++;
    } else {
      errors.push(...recordErrors);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRecords: anuladas.length,
      validRecords,
      invalidRecords: anuladas.length - validRecords
    }
  };
};

// Función utilitaria para validar formato de NCF según DGII
export const validateNCFFormat = (ncf: string): boolean => {
  if (!ncf) return false;
  
  // NCF pueden ser de 11 o 13 caracteres
  // Formato: E + Serie (3 dígitos) + Número (7 u 8 dígitos)
  const ncfClean = ncf.replace(/[^A-Z0-9]/g, '');
  
  if (ncfClean.length === 11) {
    // Formato: E001 + 00000001 (E + 3 dígitos + 7 dígitos)
    return /^E\d{3}\d{7}$/.test(ncfClean);
  } else if (ncfClean.length === 13) {
    // Formato: B01 + 0000000001 (B + 2 dígitos + 10 dígitos)
    return /^B\d{2}\d{10}$/.test(ncfClean);
  }
  
  return false;
};

// Validador integral para todos los reportes DGII
export const validateAllDGIIReports = (data: DGIIReportData): DGIIValidationResult => {
  const validations = [
    validate606Data(data.gastos, data.empresaRNC, data.period),
    validate607Data(data.facturas, data.notasCredito, data.clientes, data.empresaRNC, data.period),
    validate608Data(data.anuladas, data.empresaRNC, data.period)
  ];

  const allErrors = validations.flatMap(v => v.errors);
  const allWarnings = validations.flatMap(v => v.warnings);
  const totalRecords = validations.reduce((sum, v) => sum + v.summary.totalRecords, 0);
  const totalValidRecords = validations.reduce((sum, v) => sum + v.summary.validRecords, 0);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    summary: {
      totalRecords,
      validRecords: totalValidRecords,
      invalidRecords: totalRecords - totalValidRecords
    }
  };
};