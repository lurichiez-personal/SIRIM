
// utils/taxCalculations.ts

interface PenaltyCalculation {
    monthsLate: number;
    moraRate: number;
    interestRate: number;
    moraAmount: number;
    interestAmount: number;
    totalPenalty: number;
    totalToPay: number;
}

/**
 * Calcula los recargos por mora e interés indemnizatorio según el Código Tributario de la R.D.
 * 
 * Reglas:
 * 1. Mora (Art. 252): 
 *    - 10% del tributo por el primer mes o fracción de mes.
 *    - 4% progresivo por cada mes o fracción de mes subsiguiente.
 * 
 * 2. Interés Indemnizatorio (Art. 27):
 *    - 1.10% por cada mes o fracción de mes de retraso (Tasa vigente promedio).
 * 
 * @param amount Monto base del impuesto.
 * @param dueDate Fecha de vencimiento (YYYY-MM-DD).
 * @param paymentDate Fecha de pago o cálculo (YYYY-MM-DD). Por defecto hoy.
 */
export const calculateTaxPenalties = (
    amount: number, 
    dueDate: string, 
    paymentDate: string = new Date().toISOString().split('T')[0]
): PenaltyCalculation => {
    const due = new Date(dueDate);
    const pay = new Date(paymentDate);

    // Resetear horas para comparación puramente de fechas
    due.setHours(0,0,0,0);
    pay.setHours(0,0,0,0);

    if (pay <= due || amount <= 0) {
        return {
            monthsLate: 0,
            moraRate: 0,
            interestRate: 0,
            moraAmount: 0,
            interestAmount: 0,
            totalPenalty: 0,
            totalToPay: amount
        };
    }

    // Calcular diferencia de meses (incluyendo fracción como mes completo)
    let months = (pay.getFullYear() - due.getFullYear()) * 12;
    months -= due.getMonth();
    months += pay.getMonth();

    // Si el día de pago es mayor al día de vencimiento, cuenta como fracción del siguiente mes
    // Ejemplo: Vence el 15. Pago el 16. Ha pasado 0 meses calendario, pero 1 mes fiscal de mora.
    // La logica standard de DGII es contar fracciones de mes.
    const dayDiff = pay.getDate() - due.getDate();
    
    // Ajuste de meses
    // Si estamos en el mismo mes y año pero pay > due, es 1 mes.
    // Si pasamos de mes, checkear dia.
    
    // Calculo robusto de "Meses o fracción"
    // Contamos meses completos pasados
    // +1 si hay dias remanentes
    
    let totalMonthsOrFraction = months;
    if (dayDiff > 0) {
        // Si el dia actual es mayor, entramos en la fracción del siguiente mes
        // O si era el mismo mes (months=0), ahora es 1.
    }
    
    // Aproximación segura para "Mes o Fracción":
    // Diferencia en milisegundos
    const diffTime = Math.abs(pay.getTime() - due.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    // Sin embargo, la ley habla de meses calendario.
    // Metodo estricto:
    // Mes 1: 10%. Mes 2+: 4%.
    
    // Re-calculo basado en ciclos de 30 dias aprox o fechas calendario:
    // Si vence el 15/Enero.
    // Pago 16/Enero -> 1 Mes mora.
    // Pago 14/Febrero -> 1 Mes mora.
    // Pago 16/Febrero -> 2 Meses mora.
    
    let calcMonths = 0;
    let tempDate = new Date(due);
    
    while (tempDate < pay) {
        calcMonths++;
        // Avanzar un mes
        tempDate.setMonth(tempDate.getMonth() + 1);
    }
    
    const moraRateFirstMonth = 0.10;
    const moraRateSubsequent = 0.04;
    const interestRatePerMonth = 0.0110; // 1.10%

    let totalMoraRate = 0;
    if (calcMonths > 0) {
        totalMoraRate = moraRateFirstMonth + ((calcMonths - 1) * moraRateSubsequent);
    }

    const totalInterestRate = calcMonths * interestRatePerMonth;

    const moraAmount = amount * totalMoraRate;
    const interestAmount = amount * totalInterestRate;

    return {
        monthsLate: calcMonths,
        moraRate: totalMoraRate,
        interestRate: totalInterestRate,
        moraAmount,
        interestAmount,
        totalPenalty: moraAmount + interestAmount,
        totalToPay: amount + moraAmount + interestAmount
    };
};
