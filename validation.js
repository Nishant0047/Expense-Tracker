import { TRANSACTION_TYPES, getCategoriesForType } from './transaction.js';

const MAX_AMOUNT = 1_000_000_000;
const MIN_DATE = '2000-01-01';

export function validateDescription(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'Add a short description.';
  if (trimmed.length < 2) return 'Description is too short.';
  if (trimmed.length > 100) return 'Keep the description under 100 characters.';
  return '';
}

export function validateAmount(value) {
  if (value === '' || value === null || value === undefined) return 'Enter an amount.';
  const num = Number(value);
  if (Number.isNaN(num)) return 'Amount must be a number.';
  if (num <= 0) return 'Amount must be greater than zero.';
  if (num > MAX_AMOUNT) return 'That amount looks too large — double check it.';
  return '';
}

export function validateType(value) {
  if (!Object.values(TRANSACTION_TYPES).includes(value)) return 'Choose income or expense.';
  return '';
}

export function validateCategory(value, type) {
  if (!value) return 'Choose a category.';
  const valid = getCategoriesForType(type).some((c) => c.id === value);
  if (!valid) return 'Choose a category that matches the selected type.';
  return '';
}

export function validateDate(value) {
  if (!value) return 'Choose a date.';
  if (value < MIN_DATE) return 'That date is too far in the past.';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'That date is not valid.';
  return '';
}

export function validateTransactionForm({ description, amount, type, category, date }) {
  const errors = {};

  const descriptionError = validateDescription(description);
  if (descriptionError) errors.description = descriptionError;

  const amountError = validateAmount(amount);
  if (amountError) errors.amount = amountError;

  const typeError = validateType(type);
  if (typeError) errors.type = typeError;

  const categoryError = validateCategory(category, type);
  if (categoryError) errors.category = categoryError;

  const dateError = validateDate(date);
  if (dateError) errors.date = dateError;

  return { valid: Object.keys(errors).length === 0, errors };
}
