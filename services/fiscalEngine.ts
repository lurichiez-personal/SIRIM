
// services/fiscalEngine.ts
import { CuentaContable, ActivoFijo, FiscalWarning, NivelConfianza, CalculoFiscalSnapshot, BlockingError, EvaluacionActividad, AsientoContable } from '../types';

interface EngineInput {
    empresaId: string;
    balanzaComprobacion: Record<string, number>; // ID Cuenta -> Saldo Final
    catalogoCuentas: CuentaContable[];
    activosFijos: ActivoFijo[];
    periodoFiscal: number; // Año
    asientosPeriodo: AsientoContable[]; // Para detección profunda de actividad
    snapshotAnterior?: CalculoFiscalSnapshot | null; // Nuevo: Snapshot del año anterior para continuidad
}

interface EngineOutput {
    anexoG: {
        ajustesPositivos: Record<string, number>;
        totalAjustesPositivos: number;
    };
    anexoD: {
        cat2: { balanceInicial: number, adiciones: number, depreciacion: number };
        cat3: { balanceInicial: number, adiciones: number, depreciacion: number };
    };
    anexoD1: {
        activos: Array<{ id: string, fecha: string, costo: number, depreciacion: number }>;
    };
    anexoD2: {
        ajusteFiscalActivos: number;
        baseAjusteInflacion: number;
    };
    resultadoFiscal: {
        rentaNetaContable: number;
        rentaNetaImponible: number;
        impuestoLiquidado: number;
    };
    analisisRiesgo: {
        nivelConfianza: NivelConfianza;
        advertencias: FiscalWarning[];
    };
    validations: BlockingError[];
    snapshot: CalculoFiscalSnapshot;
    evaluacionActividad: EvaluacionActividad;
    // Metadata para actualización de activos al cierre
    calculatedAssets: Array<{
        id: string;
        depreciacionDelPeriodo: number;
        nuevoValorFiscal: number;
        nuevaDepreciacionAcumulada: number;
    }>;
}

/**
 * Función determinística para evaluar si hubo actividad real en el período.
 */
function evaluarActividadFiscalPeriodo(
    balanza: Record<string, number>,
    asientosPeriodo: AsientoContable[],
    activosFijos: ActivoFijo[]
): EvaluacionActividad {
    let huboIngresos = false;
    let huboCostos = false;
    let huboGastos = false;
    
    Object.keys(balanza).forEach(id => {
        const saldo = Math.abs(balanza[id]);
        if (saldo > 0) {
            if (id.startsWith('4')) huboIngresos = true;
            if (id.startsWith('5')) huboCostos = true;
            if (id.startsWith('6')) huboGastos = true;
        }
    });

    const huboActividadComercial = huboIngresos || huboCostos || huboGastos;
    const huboActividadContable = asientosPeriodo.length > 0;
    const tieneActivosVigentes = activosFijos.some(a => !a.fechaRetiro);

    let estadoGeneral: 'OPERATIVA' | 'SOLO_PATRIMONIAL' | 'SIN_ACTIVIDAD' = 'SIN_ACTIVIDAD';

    if (huboActividadComercial) {
        estadoGeneral = 'OPERATIVA';
    } else if (huboActividadContable || tieneActivosVigentes) {
        estadoGeneral = 'SOLO_PATRIMONIAL';
    } else {
        let tieneSaldoPatrimonial = false;
        Object.keys(balanza).forEach(id => {
            if ((id.startsWith('1') || id.startsWith('2') || id.startsWith('3')) && Math.abs(balanza[id]) > 0) {
                tieneSaldoPatrimonial = true;
            }
        });
        
        if (tieneSaldoPatrimonial) {
            estadoGeneral = 'SIN_ACTIVIDAD'; // Solo arrastre histórico
        } else {
            estadoGeneral = 'SIN_ACTIVIDAD'; // Empresa vacía o nueva sin ops
        }
    }

    return {
        huboActividadComercial,
        huboActividadContable,
        soloArrastreHistorico: !huboActividadComercial && !huboActividadContable,
        tieneActivosVigentes,
        estadoGeneral
    };
}


/**
 * Motor Fiscal: Núcleo de lógica determinística para cálculos tributarios.
 */
export const calcularMotorFiscal = ({ empresaId, balanzaComprobacion, catalogoCuentas, activosFijos, periodoFiscal, asientosPeriodo, snapshotAnterior }: EngineInput): EngineOutput => {
    const validations: BlockingError[] = [];
    const advertencias: FiscalWarning[] = [];
    const calculatedAssets: EngineOutput['calculatedAssets'] = [];

    // --- 0. EVALUACIÓN DE ACTIVIDAD (NUEVO v2.0) ---
    const evaluacionActividad = evaluarActividadFiscalPeriodo(balanzaComprobacion, asientosPeriodo, activosFijos);
    
    if (evaluacionActividad.estadoGeneral === 'SIN_ACTIVIDAD') {
        advertencias.push({
            type: 'SIN_ACTIVIDAD',
            message: 'El sistema ha detectado que no hubo actividad comercial ni asientos contables en este período. Se recomienda realizar una declaración informativa (en cero) manteniendo los saldos patrimoniales.'
        });
    } else if (evaluacionActividad.estadoGeneral === 'SOLO_PATRIMONIAL') {
        advertencias.push({
            type: 'SOLO_PATRIMONIAL',
            message: 'No se detectaron ingresos comerciales, pero sí movimientos contables o activos fijos vigentes. Verifique si corresponde declarar pérdida fiscal por gastos/depreciación.'
        });
    }

    // --- 0.1 VALIDACIONES BLINDADAS (IR-2 v2.0) ---
    
    let totalActivo = 0;
    let totalPasivo = 0;
    let totalCapital = 0;

    Object.keys(balanzaComprobacion).forEach(id => {
        const saldo = balanzaComprobacion[id];
        if (id.startsWith('1')) totalActivo += (saldo); 
        if (id.startsWith('2')) totalPasivo += (saldo * -1); 
        if (id.startsWith('3')) totalCapital += (saldo * -1); 
    });

    const diffEcuacion = Math.abs(totalActivo - (totalPasivo + totalCapital));
    if (diffEcuacion > 1.00) {
        validations.push({
            code: 'ECUACION_CONTABLE',
            message: `Error Crítico: La Ecuación Contable no cuadra. Diferencia: ${diffEcuacion.toFixed(2)}. Activos: ${totalActivo}, Pasivos+Capital: ${totalPasivo + totalCapital}.`,
            severity: 'BLOCKING'
        });
    }

    // --- 1. AUTOMATIZACIÓN ANEXO G ---
    const ajustesPositivos: Record<string, number> = {};
    let totalAjustesPositivos = 0;
    
    let totalDeudaRelacionada = 0;
    let gastosFinancierosRelacionados = 0;
    
    catalogoCuentas.forEach(cuenta => {
        const saldo = balanzaComprobacion[cuenta.id] || 0;
        
        if (cuenta.esPrestamoRelacionado) {
            totalDeudaRelacionada += Math.abs(saldo); 
        }
        if (cuenta.id.startsWith('62') && cuenta.tratamientoFiscal === 'SUJETO_LIMITE') {
             gastosFinancierosRelacionados += saldo; 
        }
        
        if (cuenta.id.startsWith('6') && saldo > 0) {
            if (cuenta.tratamientoFiscal === 'NO_DEDUCIBLE') {
                const tipo = cuenta.tipoAjusteAnexoG || 'OTRO';
                const fieldName = mapTipoAjusteToField(tipo);
                ajustesPositivos[fieldName] = (ajustesPositivos[fieldName] || 0) + saldo;
                totalAjustesPositivos += saldo;
            } else if (cuenta.tratamientoFiscal === 'DEDUCIBLE_PARCIAL' && cuenta.porcentajeDeducible) {
                const montoDeducible = saldo * (cuenta.porcentajeDeducible / 100);
                const montoNoDeducible = saldo - montoDeducible;
                if (montoNoDeducible > 0) {
                    const fieldName = mapTipoAjusteToField(cuenta.tipoAjusteAnexoG || 'OTRO');
                    ajustesPositivos[fieldName] = (ajustesPositivos[fieldName] || 0) + montoNoDeducible;
                    totalAjustesPositivos += montoNoDeducible;
                }
            }
        }
    });

    const patrimonioTotal = totalCapital;
    if (patrimonioTotal > 0 && gastosFinancierosRelacionados > 0) {
        const ratio = totalDeudaRelacionada / patrimonioTotal;
        if (ratio > 3) {
            const deudaAdmitida = patrimonioTotal * 3;
            const proporcionNoDeducible = (totalDeudaRelacionada - deudaAdmitida) / totalDeudaRelacionada;
            const ajusteIntereses = gastosFinancierosRelacionados * proporcionNoDeducible;
            
            if (ajusteIntereses > 0) {
                ajustesPositivos['gastosInteresesNoDeducibles'] = (ajustesPositivos['gastosInteresesNoDeducibles'] || 0) + ajusteIntereses;
                totalAjustesPositivos += ajusteIntereses;
                advertencias.push({
                    type: 'SUBCAPITALIZACION_AUTO',
                    message: `Se aplicó ajuste automático por Subcapitalización (Norma 02-2016). Ratio: ${ratio.toFixed(2)}. Ajuste: ${ajusteIntereses.toFixed(2)}`
                });
            }
        }
    }


    // --- 2. AUTOMATIZACIÓN ANEXO D (CATEGORÍAS 2 y 3) ---
    const anexoD = {
        cat2: { balanceInicial: 0, adiciones: 0, depreciacion: 0 },
        cat3: { balanceInicial: 0, adiciones: 0, depreciacion: 0 }
    };

    const activosDelPeriodo = activosFijos.filter(a => {
        const yearAdq = new Date(a.fechaAdquisicion).getFullYear();
        return yearAdq === periodoFiscal;
    });

    const activosAnteriores = activosFijos.filter(a => {
        const yearAdq = new Date(a.fechaAdquisicion).getFullYear();
        return yearAdq < periodoFiscal && !a.fechaRetiro;
    });

    // Función auxiliar para obtener la base inicial correcta (Continuidad Fiscal)
    const getBaseFiscalInicial = (activos: ActivoFijo[]) => {
        return activos.reduce((sum, a) => {
            // Si el activo fue cerrado el año anterior, usamos su valor fiscal final
            if (a.ultimoPeriodoCerrado === periodoFiscal - 1 && a.valorFiscalFinal !== undefined) {
                return sum + a.valorFiscalFinal;
            }
            // Si es un activo viejo pero sin cierre (carga inicial), usamos su costo (o valor libros si existiera lógica)
            return sum + (a.valorFiscalFinal !== undefined ? a.valorFiscalFinal : a.costoAdquisicion);
        }, 0);
    };

    // --- LÓGICA DE DISTRIBUCIÓN DE DEPRECIACIÓN Y VALIDACIÓN BLOQUEANTE CAT 2 y 3 ---
    
    // Función para calcular y distribuir depreciación, y validar sobre-depreciación individual
    const procesarCategoriaConjunta = (categoria: '2' | '3', tasa: number) => {
        const activosCat = activosAnteriores.filter(a => a.categoria === categoria);
        const activosNuevosCat = activosDelPeriodo.filter(a => a.categoria === categoria);
        
        const baseInicial = getBaseFiscalInicial(activosCat);
        const adiciones = activosNuevosCat.reduce((sum, a) => sum + a.costoAdquisicion, 0);
        
        // Base depreciable global
        const baseDepreciable = baseInicial + (adiciones * 0.5);
        const depreciacionGlobal = baseDepreciable * tasa;
        
        // Distribuir depreciación global a activos individuales para mantener 'valorFiscalFinal' individual
        // La distribución se hace proporcional al valor fiscal de cada activo en la base.
        const totalBaseParaProrrateo = baseInicial + (adiciones * 0.5); // Igual a baseDepreciable
        
        // Procesar activos anteriores
        activosCat.forEach(activo => {
            const valorFiscalActual = activo.valorFiscalFinal !== undefined ? activo.valorFiscalFinal : activo.costoAdquisicion;
            let depIndividual = 0;
            if (totalBaseParaProrrateo > 0) {
                 depIndividual = (valorFiscalActual / totalBaseParaProrrateo) * depreciacionGlobal;
            }
            
            // Validar sobre-depreciación individual (Blocking Gap #1)
            const depAcumuladaPrevia = activo.depreciacionAcumuladaFiscal || 0;
            const nuevaAcumulada = depAcumuladaPrevia + depIndividual;
            
            if (nuevaAcumulada > (activo.costoAdquisicion + 0.01)) { // Tolerancia de 0.01 por redondeo
                 validations.push({
                    code: `SOBRE_DEPRECIACION_CAT${categoria}_${activo.id}`,
                    message: `El activo '${activo.nombre}' (Cat ${categoria}) excede el 100% de depreciación fiscal permitida. Costo: ${activo.costoAdquisicion.toFixed(2)}, Acumulada Proyectada: ${nuevaAcumulada.toFixed(2)}.`,
                    severity: 'BLOCKING'
                });
            }

            calculatedAssets.push({
                id: activo.id,
                depreciacionDelPeriodo: Number(depIndividual.toFixed(2)),
                nuevaDepreciacionAcumulada: Number(nuevaAcumulada.toFixed(2)),
                nuevoValorFiscal: Number((valorFiscalActual - depIndividual).toFixed(2))
            });
        });
        
        // Procesar activos nuevos (Adiciones)
        activosNuevosCat.forEach(activo => {
            // Solo se deprecian al 50% de la tasa efectiva (o 50% del valor por la tasa completa, matemáticamente igual)
            // baseDepreciable incluyó adiciones * 0.5.
            const valorBaseProrrateo = activo.costoAdquisicion * 0.5;
            let depIndividual = 0;
             if (totalBaseParaProrrateo > 0) {
                 depIndividual = (valorBaseProrrateo / totalBaseParaProrrateo) * depreciacionGlobal;
            }
             
            // En el primer año no debería haber sobre-depreciación a menos que la tasa sea > 200% (imposible)
            
            calculatedAssets.push({
                id: activo.id,
                depreciacionDelPeriodo: Number(depIndividual.toFixed(2)),
                nuevaDepreciacionAcumulada: Number(depIndividual.toFixed(2)),
                nuevoValorFiscal: Number((activo.costoAdquisicion - depIndividual).toFixed(2))
            });
        });

        return { baseInicial, adiciones, depreciacion: depreciacionGlobal };
    };

    const resCat2 = procesarCategoriaConjunta('2', 0.25);
    anexoD.cat2 = { balanceInicial: resCat2.baseInicial, adiciones: resCat2.adiciones, depreciacion: resCat2.depreciacion };

    const resCat3 = procesarCategoriaConjunta('3', 0.15);
    anexoD.cat3 = { balanceInicial: resCat3.baseInicial, adiciones: resCat3.adiciones, depreciacion: resCat3.depreciacion };


    // --- 3. AUTOMATIZACIÓN ANEXO D1 (CATEGORÍA 1 - Edificaciones) ---
    const activosCat1 = activosFijos.filter(a => a.categoria === '1' && !a.fechaRetiro);
    const d1Detalle = activosCat1.map(activo => {
        const fechaAdq = new Date(activo.fechaAdquisicion);
        let mesesUso = 12;
        if (fechaAdq.getFullYear() === periodoFiscal) {
            mesesUso = 12 - fechaAdq.getMonth();
        }
        
        const depreciacionTeorica = (activo.costoAdquisicion * 0.05 * mesesUso) / 12;
        
        const depAcumuladaPrevia = activo.depreciacionAcumuladaFiscal || 0;
        const pendientePorDepreciar = activo.costoAdquisicion - depAcumuladaPrevia;
        
        // Corrección Gap #1: La lógica aquí ya usaba min(), lo cual es correcto.
        const depreciacionReal = Math.min(depreciacionTeorica, pendientePorDepreciar);

        if (pendientePorDepreciar < 0) {
             validations.push({
                code: `SOBRE_DEPRECIACION_${activo.id}`,
                message: `El activo '${activo.nombre}' tiene una depreciación acumulada mayor a su costo. Revise los datos históricos.`,
                severity: 'BLOCKING'
            });
        }
        
        calculatedAssets.push({
            id: activo.id,
            depreciacionDelPeriodo: Number(depreciacionReal.toFixed(2)),
            nuevaDepreciacionAcumulada: Number((depAcumuladaPrevia + depreciacionReal).toFixed(2)),
            nuevoValorFiscal: Number((activo.costoAdquisicion - (depAcumuladaPrevia + depreciacionReal)).toFixed(2))
        });
        
        return {
            id: activo.id,
            fecha: activo.fechaAdquisicion,
            costo: activo.costoAdquisicion,
            depreciacion: Number(depreciacionReal.toFixed(2))
        };
    });


    // --- 4. CÁLCULO DE RESULTADOS ---
    let ingresos = 0, costos = 0, gastos = 0;
    Object.keys(balanzaComprobacion).forEach(id => {
        if (id.startsWith('4')) ingresos += (balanzaComprobacion[id] * -1); 
        if (id.startsWith('5')) costos += balanzaComprobacion[id];
        if (id.startsWith('6')) gastos += balanzaComprobacion[id];
    });
    
    const rentaNetaContable = ingresos - costos - gastos;
    const rentaNetaImponible = Math.max(0, rentaNetaContable + totalAjustesPositivos); 
    const impuestoLiquidado = rentaNetaImponible * 0.27;

    if (evaluacionActividad.estadoGeneral === 'SIN_ACTIVIDAD') {
        if (rentaNetaImponible !== 0) {
            advertencias.push({
                type: 'INCONSISTENCIA_RENTA',
                message: `El sistema detectó 'Sin Actividad' pero existe una Renta Neta Imponible de ${rentaNetaImponible.toFixed(2)}. Verifique Ajustes Positivos.`
            });
        }
    }

    const resultadoEnPatrimonio = (balanzaComprobacion['33'] || 0) * -1; 
    const diffResultado = Math.abs(rentaNetaContable - resultadoEnPatrimonio);
    
    if (diffResultado > 1.00) {
        validations.push({
            code: 'CONSISTENCIA_RESULTADO',
            message: `Error Crítico: El Resultado del Ejercicio en Patrimonio (${resultadoEnPatrimonio.toFixed(2)}) no coincide con el Estado de Resultados (${rentaNetaContable.toFixed(2)}).`,
            severity: 'BLOCKING'
        });
    }

    // --- 5. ANÁLISIS DE RIESGO Y CONFIANZA ---
    let nivelConfianza: NivelConfianza = "ALTO";

    if (activosFijos.length > 0 || totalAjustesPositivos > 0) {
        nivelConfianza = "MEDIO";
    }
    
    if (validations.length > 0) {
        nivelConfianza = "BAJO";
    }

    // --- 6. CONSTRUCCIÓN DEL SNAPSHOT ---
    
    // Preparar datos de continuidad para D2 y Anexo E (Gap #2 y #3)
    // Nota: El cálculo real de D2 y E depende de la interacción del usuario en el formulario (índices de inflación, etc.)
    // Aquí solo reservamos el espacio en el snapshot para que DeclaracionIR2Page lo llene antes de guardar.
    // Como el motor fiscal es puro cálculo, no tenemos aquí los inputs de D2/E finales. 
    // DeclaracionIR2Page mezclará este resultado con el input del usuario para crear el snapshot final.
    
    const snapshot: CalculoFiscalSnapshot = {
        empresaId,
        fechaCalculo: new Date().toISOString(),
        periodoFiscal, // Add Periodo Fiscal explicitly
        versionMotor: "2.0-Blindado",
        inputSnapshot: {
            balanzaResumen: {
                totalIngresos: ingresos,
                totalCostos: costos,
                totalGastos: gastos
            },
            totalActivosFijos: activosFijos.length
        },
        outputSnapshot: {
            rentaNetaContable,
            totalAjustesPositivos,
            rentaNetaImponible,
            impuestoLiquidado,
            nivelConfianza,
            advertencias: [...advertencias, ...validations.map(v => ({ type: v.code, message: v.message }))]
        },
        actividadFiscal: evaluacionActividad,
        // continuityData will be enriched in the UI layer before saving
    };

    return {
        anexoG: { ajustesPositivos, totalAjustesPositivos },
        anexoD,
        anexoD1: { activos: d1Detalle },
        anexoD2: { ajusteFiscalActivos: 0, baseAjusteInflacion: 0 },
        resultadoFiscal: { rentaNetaContable, rentaNetaImponible, impuestoLiquidado },
        analisisRiesgo: { nivelConfianza, advertencias },
        validations,
        snapshot,
        evaluacionActividad,
        calculatedAssets 
    };
};

// Helper: Mapea el Enum TipoAjuste al nombre de la propiedad del estado en React
function mapTipoAjusteToField(tipo: string): string {
    switch (tipo) {
        case 'IMPUESTO_NO_DEDUCIBLE': return 'impuestosNoDeducibles';
        case 'MULTA': return 'otrosGastosNoAdmitidos';
        case 'REPRESENTACION': return 'otrosGastosNoAdmitidos';
        case 'INTERES': return 'gastosInteresesNoDeducibles';
        case 'DONACION': return 'excesoDonaciones';
        case 'SIN_COMPROBANTE': return 'gastosSinComprobantes';
        default: return 'otrosGastosNoAdmitidos';
    }
}
