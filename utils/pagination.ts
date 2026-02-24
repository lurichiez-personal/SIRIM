// src/utils/pagination.ts
import { PagedResult } from '../types';

export const applyPagination = <T,>(items: T[], page: number, pageSize: number): PagedResult<T> => {
    const totalCount = items.length;
    const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: pagedItems, totalCount, page, pageSize };
};
