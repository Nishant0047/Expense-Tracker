import { findCategory } from './transaction.js';

function normalize(str) {
  return (str || '').trim().toLowerCase();
}

export function matchesQuery(transaction, query) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;

  const categoryLabel = findCategory(transaction.type, transaction.category)?.label || '';
  const haystack = normalize(`${transaction.description} ${categoryLabel} ${transaction.amount}`);

  return haystack.includes(normalizedQuery);
}

export function searchTransactions(transactions, query) {
  if (!normalize(query)) return transactions;
  return transactions.filter((t) => matchesQuery(t, query));
}
