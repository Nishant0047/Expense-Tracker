import { generateId, todayISO, sumBy, groupBy, formatDate } from './utils.js';

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
};

export const CATEGORIES = {
  [TRANSACTION_TYPES.EXPENSE]: [
    { id: 'food', label: 'Food & Dining', color: '#9C3B2E' },
    { id: 'transport', label: 'Transportation', color: '#A9782E' },
    { id: 'shopping', label: 'Shopping', color: '#4A6FA5' },
    { id: 'entertainment', label: 'Entertainment', color: '#6B4C8A' },
    { id: 'bills', label: 'Bills & Utilities', color: '#1F5C3F' },
    { id: 'health', label: 'Healthcare', color: '#B5652E' },
    { id: 'education', label: 'Education', color: '#3C7A89' },
    { id: 'travel', label: 'Travel', color: '#8A5A3B' },
    { id: 'groceries', label: 'Groceries', color: '#5C7A3D' },
    { id: 'other-expense', label: 'Other', color: '#6B6B6B' },
  ],
  [TRANSACTION_TYPES.INCOME]: [
    { id: 'salary', label: 'Salary', color: '#1F5C3F' },
    { id: 'freelance', label: 'Freelance', color: '#3C7A89' },
    { id: 'investments', label: 'Investments', color: '#A9782E' },
    { id: 'gifts', label: 'Gifts', color: '#6B4C8A' },
    { id: 'other-income', label: 'Other', color: '#6B6B6B' },
  ],
};

export function getCategoriesForType(type) {
  return CATEGORIES[type] || [];
}

export function findCategory(type, categoryId) {
  return getCategoriesForType(type).find((c) => c.id === categoryId) || null;
}

export function createTransaction({ description, amount, type, category, date }, existingId = null) {
  return {
    id: existingId || generateId(),
    description: description.trim(),
    amount: Math.round(Number(amount) * 100) / 100,
    type,
    category,
    date: date || todayISO(),
    createdAt: existingId ? undefined : Date.now(),
  };
}

export function applyTransactionUpdate(original, updates) {
  return {
    ...original,
    ...updates,
    id: original.id,
    createdAt: original.createdAt,
    amount: Math.round(Number(updates.amount ?? original.amount) * 100) / 100,
  };
}

export function calculateTotalIncome(transactions) {
  return sumBy(
    transactions.filter((t) => t.type === TRANSACTION_TYPES.INCOME),
    (t) => t.amount
  );
}

export function calculateTotalExpense(transactions) {
  return sumBy(
    transactions.filter((t) => t.type === TRANSACTION_TYPES.EXPENSE),
    (t) => t.amount
  );
}

export function calculateBalance(transactions) {
  return calculateTotalIncome(transactions) - calculateTotalExpense(transactions);
}

export function groupByCategory(transactions, type) {
  const relevant = transactions.filter((t) => t.type === type);
  const total = sumBy(relevant, (t) => t.amount);
  const byCategory = groupBy(relevant, (t) => t.category);

  return Object.entries(byCategory)
    .map(([categoryId, items]) => {
      const meta = findCategory(type, categoryId);
      const subtotal = sumBy(items, (t) => t.amount);
      return {
        category: categoryId,
        label: meta?.label || 'Other',
        color: meta?.color || '#6B6B6B',
        total: subtotal,
        percent: total > 0 ? (subtotal / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function groupByMonth(transactions, months = 6) {
  const now = new Date();
  const buckets = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const bucketDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({
      key,
      label: formatDate(`${key}-01`, 'short').replace(/\s\d+$/, ''),
      monthLabel: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(bucketDate),
      income: 0,
      expense: 0,
    });
  }

  const bucketIndex = new Map(buckets.map((b, idx) => [b.key, idx]));

  transactions.forEach((t) => {
    const key = t.date?.slice(0, 7);
    if (!bucketIndex.has(key)) return;
    const bucket = buckets[bucketIndex.get(key)];
    if (t.type === TRANSACTION_TYPES.INCOME) bucket.income += t.amount;
    else bucket.expense += t.amount;
  });

  return buckets;
}

export function sortByDateDesc(transactions) {
  return [...transactions].sort((a, b) => {
    const dateDiff = (b.date || '').localeCompare(a.date || '');
    if (dateDiff !== 0) return dateDiff;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}
