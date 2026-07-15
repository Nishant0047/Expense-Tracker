import { formatCurrency, formatDate, todayISO, toISODate, escapeHTML, groupBy } from './utils.js';
import { TRANSACTION_TYPES, getCategoriesForType, findCategory } from './transaction.js';

export const ICONS = {
  plus: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 4v12M4 10h12"/></svg>',
  edit: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.4 3.6l4 4L6.2 17.3H2.2v-4z"/></svg>',
  trash: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h12M8 6V4.4h4V6m-7.2 0 .9 10.2c.05.6.5 1 1 1h6.6c.5 0 .95-.4 1-1L15.2 6"/></svg>',
  search: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8.6" cy="8.6" r="5.3"/><path d="M16 16l-3.3-3.3"/></svg>',
  sun: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="3.5"/><path d="M10 2.2v2M10 15.8v2M3.5 3.5l1.4 1.4M15.1 15.1l1.4 1.4M2.2 10h2M15.8 10h2M3.5 16.5l1.4-1.4M15.1 4.9l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M15.8 12.5A6.8 6.8 0 0 1 7.5 4.2a6.8 6.8 0 1 0 8.3 8.3z"/></svg>',
  close: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg>',
  chevron: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7.5l5 5 5-5"/></svg>',
};

export const elements = {};

export function cacheElements() {
  const byId = (id) => document.getElementById(id);
  Object.assign(elements, {
    themeToggle: byId('theme-toggle'),
    balanceAmount: byId('balance-amount'),
    incomeAmount: byId('income-amount'),
    expenseAmount: byId('expense-amount'),
    summaryAsOf: byId('summary-as-of'),

    categoryChartCanvas: byId('category-chart'),
    categoryLegend: byId('category-legend'),
    categoryTypeToggle: byId('category-type-toggle'),
    trendChartCanvas: byId('trend-chart'),
    chartTooltip: byId('chart-tooltip'),

    searchInput: byId('search-input'),
    typeFilter: byId('type-filter'),
    categoryFilter: byId('category-filter'),
    dateFilter: byId('date-filter'),
    customDateRange: byId('custom-date-range'),
    customStart: byId('custom-start'),
    customEnd: byId('custom-end'),
    clearFiltersBtn: byId('clear-filters-btn'),
    resultsCount: byId('results-count'),
    addTransactionBtn: byId('add-transaction-btn'),

    transactionList: byId('transaction-list'),
    emptyState: byId('empty-state'),
    emptyStateTitle: byId('empty-state-title'),
    emptyStateBody: byId('empty-state-body'),

    modal: byId('transaction-modal'),
    modalTitle: byId('modal-title'),
    modalCloseBtn: byId('modal-close-btn'),
    form: byId('transaction-form'),
    descriptionInput: byId('description-input'),
    amountInput: byId('amount-input'),
    categorySelect: byId('category-input'),
    dateInput: byId('date-input'),
    cancelBtn: byId('cancel-btn'),

    toastContainer: byId('toast-container'),
  });
  return elements;
}


export function renderSummary({ balance, income, expense }) {
  elements.balanceAmount.textContent = formatCurrency(balance);
  elements.balanceAmount.classList.toggle('is-negative', balance < 0);
  elements.incomeAmount.textContent = formatCurrency(income);
  elements.expenseAmount.textContent = formatCurrency(expense);
  elements.summaryAsOf.textContent = `As of ${formatDate(todayISO(), 'long')}`;
}


export function populateCategoryFilterOptions(typeValue) {
  const select = elements.categoryFilter;
  const previous = select.value;
  select.innerHTML = '<option value="all">All categories</option>';

  const types = typeValue === 'all' ? [TRANSACTION_TYPES.EXPENSE, TRANSACTION_TYPES.INCOME] : [typeValue];
  types.forEach((type) => {
    const group = document.createElement('optgroup');
    group.label = type === TRANSACTION_TYPES.EXPENSE ? 'Expense' : 'Income';
    getCategoriesForType(type).forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.label;
      group.appendChild(opt);
    });
    select.appendChild(group);
  });

  const stillValid = Array.from(select.options).some((o) => o.value === previous);
  select.value = stillValid ? previous : 'all';
}

export function toggleCustomDateInputs(show) {
  elements.customDateRange.hidden = !show;
}

export function toggleClearFiltersButton(show) {
  elements.clearFiltersBtn.hidden = !show;
}

export function renderResultsCount(shown, total) {
  const noun = (n) => (n === 1 ? 'entry' : 'entries');
  elements.resultsCount.textContent =
    shown === total ? `${total} ${noun(total)}` : `Showing ${shown} of ${total} ${noun(total)}`;
}


function relativeGroupLabel(dateISO) {
  if (dateISO === todayISO()) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateISO === toISODate(yesterday)) return 'Yesterday';
  return formatDate(dateISO, 'long');
}

function renderRow(transaction, pendingDeleteId) {
  const meta = findCategory(transaction.type, transaction.category);
  const isExpense = transaction.type === TRANSACTION_TYPES.EXPENSE;
  const sign = isExpense ? '\u2212' : '+';
  const confirming = transaction.id === pendingDeleteId;

  const actionsMarkup = confirming
    ? `<div class="ledger-row__confirm">
         <span>Delete this entry?</span>
         <button type="button" class="btn-text" data-action="cancel-delete">No</button>
         <button type="button" class="btn-text btn-text--danger" data-action="confirm-delete">Yes, delete</button>
       </div>`
    : `<div class="ledger-row__actions">
         <button type="button" class="icon-btn" data-action="edit" aria-label="Edit entry">${ICONS.edit}</button>
         <button type="button" class="icon-btn" data-action="delete" aria-label="Delete entry">${ICONS.trash}</button>
       </div>`;

  return `
    <li class="ledger-row${confirming ? ' is-confirming' : ''}" data-id="${transaction.id}">
      <span class="ledger-row__dot" style="background:${meta?.color || '#6B6B6B'}" aria-hidden="true"></span>
      <div class="ledger-row__main">
        <p class="ledger-row__desc">${escapeHTML(transaction.description)}</p>
        <p class="ledger-row__meta">${escapeHTML(meta?.label || 'Other')}</p>
      </div>
      <p class="ledger-row__amount ${isExpense ? 'is-debit' : 'is-credit'}">${sign}\u2009${formatCurrency(transaction.amount)}</p>
      ${actionsMarkup}
    </li>`;
}

export function renderTransactionList(transactions, { pendingDeleteId = null, isFiltered = false } = {}) {
  const { transactionList, emptyState, emptyStateTitle, emptyStateBody } = elements;

  if (!transactions.length) {
    transactionList.innerHTML = '';
    emptyState.hidden = false;
    emptyStateTitle.textContent = isFiltered ? 'No entries match' : 'Nothing logged yet';
    emptyStateBody.textContent = isFiltered
      ? 'Try a different search term, or clear your filters.'
      : 'Add your first income or expense to start your ledger.';
    return;
  }

  emptyState.hidden = true;
  const groups = groupBy(transactions, (t) => t.date);
  const orderedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  transactionList.innerHTML = orderedDates
    .map((date) => {
      const dayTotal = groups[date].reduce(
        (sum, t) => sum + (t.type === TRANSACTION_TYPES.EXPENSE ? -t.amount : t.amount),
        0
      );
      return `
        <li class="ledger-group">
          <div class="ledger-date-header">
            <span class="ledger-date-header__label">${relativeGroupLabel(date)}</span>
            <span class="ledger-date-header__line" aria-hidden="true"></span>
            <span class="ledger-date-header__total">${dayTotal < 0 ? '\u2212' : '+'}\u2009${formatCurrency(Math.abs(dayTotal))}</span>
          </div>
          <ul class="ledger-group__rows">
            ${groups[date].map((t) => renderRow(t, pendingDeleteId)).join('')}
          </ul>
        </li>
      `;
    })
    .join('');
}


export function renderLegend(data) {
  const { categoryLegend } = elements;
  if (!data.length) {
    categoryLegend.innerHTML = '<li class="legend-empty">No entries in this period yet.</li>';
    return;
  }
  categoryLegend.innerHTML = data
    .slice(0, 6)
    .map(
      (d) => `
      <li class="legend-item">
        <span class="legend-item__swatch" style="background:${d.color}"></span>
        <span class="legend-item__label">${escapeHTML(d.label)}</span>
        <span class="legend-item__value">${formatCurrency(d.total)}</span>
        <span class="legend-item__percent">${d.percent.toFixed(0)}%</span>
      </li>`
    )
    .join('');
}

export function setActiveChartTypeButton(type) {
  elements.categoryTypeToggle.querySelectorAll('[data-chart-type]').forEach((btn) => {
    const isActive = btn.dataset.chartType === type;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

export function showChartTooltip(html, clientX, clientY) {
  const { chartTooltip } = elements;
  chartTooltip.innerHTML = html;
  chartTooltip.hidden = false;
  const offset = 16;
  const rect = chartTooltip.getBoundingClientRect();
  let left = clientX + offset;
  let top = clientY + offset;
  if (left + rect.width > window.innerWidth - 8) left = clientX - rect.width - offset;
  if (top + rect.height > window.innerHeight - 8) top = clientY - rect.height - offset;
  chartTooltip.style.left = `${Math.max(8, left)}px`;
  chartTooltip.style.top = `${Math.max(8, top)}px`;
}

export function hideChartTooltip() {
  elements.chartTooltip.hidden = true;
}


export function populateFormCategoryOptions(type, selectedId = null) {
  const { categorySelect } = elements;
  categorySelect.innerHTML = getCategoriesForType(type)
    .map((cat) => `<option value="${cat.id}">${escapeHTML(cat.label)}</option>`)
    .join('');
  if (selectedId) categorySelect.value = selectedId;
}

export function getSelectedFormType() {
  return elements.form.querySelector('input[name="type"]:checked')?.value || TRANSACTION_TYPES.EXPENSE;
}

export function getFormValues() {
  const { form } = elements;
  return {
    description: form.description.value,
    amount: form.amount.value,
    type: getSelectedFormType(),
    category: form.category.value,
    date: form.date.value,
  };
}

const ERROR_FIELDS = ['description', 'amount', 'category', 'date'];

export function clearFormErrors() {
  ERROR_FIELDS.forEach((field) => {
    const errorEl = document.getElementById(`${field}-error`);
    const inputEl = elements.form.elements[field];
    if (errorEl) errorEl.textContent = '';
    inputEl?.removeAttribute('aria-invalid');
  });
}

export function setFormErrors(errors) {
  clearFormErrors();
  Object.entries(errors).forEach(([field, message]) => {
    const errorEl = document.getElementById(`${field}-error`);
    const inputEl = elements.form.elements[field];
    if (errorEl) errorEl.textContent = message;
    inputEl?.setAttribute('aria-invalid', 'true');
  });
  const firstField = Object.keys(errors)[0];
  if (firstField && elements.form.elements[firstField]?.focus) {
    elements.form.elements[firstField].focus();
  }
}

let lastFocusedBeforeModal = null;

export function openModal(mode, transaction = null) {
  const { modal, modalTitle, form } = elements;
  lastFocusedBeforeModal = document.activeElement;
  clearFormErrors();
  form.reset();

  if (mode === 'edit' && transaction) {
    modalTitle.textContent = 'Edit entry';
    form.description.value = transaction.description;
    form.amount.value = transaction.amount;
    form.querySelector(`input[name="type"][value="${transaction.type}"]`).checked = true;
    populateFormCategoryOptions(transaction.type, transaction.category);
    form.date.value = transaction.date;
    form.dataset.editingId = transaction.id;
  } else {
    modalTitle.textContent = 'New entry';
    form.querySelector(`input[name="type"][value="${TRANSACTION_TYPES.EXPENSE}"]`).checked = true;
    populateFormCategoryOptions(TRANSACTION_TYPES.EXPENSE);
    form.date.value = todayISO();
    delete form.dataset.editingId;
  }

  modal.hidden = false;
  document.body.classList.add('has-modal-open');
  requestAnimationFrame(() => modal.classList.add('is-open'));
  setTimeout(() => elements.descriptionInput.focus(), 50);
}

export function closeModal() {
  const { modal } = elements;
  modal.classList.remove('is-open');
  document.body.classList.remove('has-modal-open');
  setTimeout(() => {
    modal.hidden = true;
  }, 180);
  if (lastFocusedBeforeModal instanceof HTMLElement) lastFocusedBeforeModal.focus();
}

export function isModalOpen() {
  return !elements.modal.hidden;
}

export function trapFocus(event) {
  if (event.key !== 'Tab') return;
  const focusable = elements.modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}


export function showToast(message, variant = 'default') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${variant}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('is-visible'));
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}


export function setThemeToggleIcon(theme) {
  elements.themeToggle.innerHTML = theme === 'dark' ? ICONS.sun : ICONS.moon;
  elements.themeToggle.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
  );
}
