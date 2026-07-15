const KEYS = {
  transactions: 'expenseTracker.transactions.v1',
  theme: 'expenseTracker.theme',
};

function isStorageAvailable() {
  try {
    const testKey = '__expenseTracker.storageTest__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export const storageAvailable = isStorageAvailable();

function readJSON(key, fallback) {
  if (!storageAvailable) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Could not read "${key}" from storage, using fallback.`, error);
    return fallback;
  }
}

function writeJSON(key, value) {
  if (!storageAvailable) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Could not write "${key}" to storage.`, error);
    return false;
  }
}

export function getTransactions() {
  const data = readJSON(KEYS.transactions, []);
  return Array.isArray(data) ? data : [];
}

export function saveTransactions(transactions) {
  return writeJSON(KEYS.transactions, transactions);
}

export function getTheme() {
  return readJSON(KEYS.theme, null);
}

export function saveTheme(theme) {
  return writeJSON(KEYS.theme, theme);
}
