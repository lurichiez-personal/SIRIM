// src/utils/dateUtils.ts

export type DatePreset = 'all' | 'today' | 'this_month' | 'last_30_days' | 'this_quarter' | 'this_year' | 'last_month' | 'custom';

export const getDateRange = (preset: DatePreset): { start: string, end: string } => {
    const now = new Date();
    // Adjust for timezone offset to prevent off-by-one day errors
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let start = new Date(today);
    let end = new Date(today);

    switch (preset) {
        case 'today':
            // start and end are already today
            break;
        case 'this_month':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        case 'last_30_days':
            start.setDate(today.getDate() - 30);
            break;
        case 'this_quarter':
            const quarter = Math.floor(today.getMonth() / 3);
            start = new Date(today.getFullYear(), quarter * 3, 1);
            end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
            break;
        case 'this_year':
            start = new Date(today.getFullYear(), 0, 1);
            end = new Date(today.getFullYear(), 11, 31);
            break;
        case 'last_month':
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
        case 'all':
             return { start: '', end: '' };
        default: // custom
            return { start: '', end: '' };
    }

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
    };
};
