import { BankTransaction } from "../types";

// NOTE: This is a very simple parser assuming a specific format:
// "Fecha,Descripción,Monto" or "Date,Description,Amount,Type"
// In a real app, you'd need a more robust library or a mapping UI.
export const parseBankStatementCSV = (csvText: string): BankTransaction[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const transactions: BankTransaction[] = [];

    const dateIndex = headers.indexOf('fecha');
    const descIndex = headers.indexOf('descripción') > -1 ? headers.indexOf('descripción') : headers.indexOf('descripcion');
    const amountIndex = headers.indexOf('monto');
    
    if (dateIndex === -1 || descIndex === -1 || amountIndex === -1) {
        throw new Error('Formato de CSV no válido. Debe contener las columnas: Fecha, Descripción, Monto.');
    }

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length < headers.length) continue;

        const monto = parseFloat(values[amountIndex]);
        if (isNaN(monto)) continue;

        transactions.push({
            id: `bank-${Date.now()}-${i}`,
            fecha: new Date(values[dateIndex]).toISOString().split('T')[0], // Normalize date
            descripcion: values[descIndex],
            monto: Math.abs(monto),
            tipo: monto > 0 ? 'credito' : 'debito',
        });
    }

    return transactions;
};
