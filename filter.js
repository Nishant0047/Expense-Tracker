import { toISODate } from './utils.js';

export const DATE_RANGES = {
  ALL: 'all',
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  CUSTOM: 'custom',
};

export const DEFAULT_FILTERS = {
  type: 'all',
  category: 'all',
  range: DATE_RANGES.ALL,
  customStart: '',
  customEnd: '',
};

export function filterByType(transactions, type) {
  if (!type || type === 'all') return transactions;
  return transactions.filter((t) => t.type === type);
}

export function filterByCategory(transactions, category) {
  if (!category || category === 'all') return transactions;
  return transactions.filter((t) => t.category === category);
}

export function resolveDateBounds({ range, customStart, customEnd }) {
  if (range === DATE_RANGES.ALL) return null;

  const now = new Date();
  const endOfToday = toISODate(now);

  if (range === DATE_RANGES.TODAY) {
    return { start: endOfToday, end: endOfToday };
  }

  if (range === DATE_RANGES.WEEK) {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return { start: toISODate(start), end: endOfToday };
  }

  if (range === DATE_RANGES.MONTH) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: toISODate(start), end: endOfToday };
  }

  if (range === DATE_RANGES.CUSTOM) {
    if (!customStart && !customEnd) return null;
    return { start: customStart || '0000-01-01', end: customEnd || '9999-12-31' };
  }

  return null;
}

export function filterByDateRange(transactions, filters) {
  const bounds = resolveDateBounds(filters);
  if (!bounds) return transactions;
  return transactions.filter((t) => t.date >= bounds.start && t.date <= bounds.end);
}

export function applyFilters(transactions, filters) {
  let result = filterByType(transactions, filters.type);
  result = filterByCategory(result, filters.category);
  result = filterByDateRange(result, filters);
  return result;
}

export function hasActiveFilters(filters) {
  return (
    filters.type !== DEFAULT_FILTERS.type ||
    filters.category !== DEFAULT_FILTERS.category ||
    filters.range !== DEFAULT_FILTERS.range
  );
}
