import * as storage from './storage.js';
import {
  TRANSACTION_TYPES,
  createTransaction,
  applyTransactionUpdate,
  calculateBalance,
  calculateTotalIncome,
  calculateTotalExpense,
  groupByCategory,
  groupByMonth,
  sortByDateDesc,
} from './transaction.js';
import { applyFilters, DEFAULT_FILTERS, DATE_RANGES, hasActiveFilters } from './filter.js';
import { searchTransactions } from './search.js';
import { validateTransactionForm } from './validation.js';
import { DoughnutChart, BarChart } from './chart.js';
import { initTheme, toggleTheme, getCurrentTheme } from './theme.js';
import { formatCurrency, debounce } from './utils.js';
import * as ui from './ui.js';

const state = {
  transactions: [],
  filters: { ...DEFAULT_FILTERS },
  search: '',
  pendingDeleteId: null,
  chartType: TRANSACTION_TYPES.EXPENSE,
};

let doughnutChart;
let barChart;


function init() {
  initTheme();
  ui.cacheElements();
  ui.setThemeToggleIcon(getCurrentTheme());

  state.transactions = storage.getTransactions();

  doughnutChart = new DoughnutChart(ui.elements.categoryChartCanvas, { onHover: handleDoughnutHover });
  barChart = new BarChart(ui.elements.trendChartCanvas, { onHover: handleBarHover });

  ui.populateCategoryFilterOptions('all');
  ui.setActiveChartTypeButton(state.chartType);

  attachEventListeners();
  render();
}


function getVisibleTransactions() {
  const filtered = applyFilters(state.transactions, state.filters);
  const searched = searchTransactions(filtered, state.search);
  return sortByDateDesc(searched);
}

function isFiltering() {
  return hasActiveFilters(state.filters) || state.search.trim().length > 0;
}

function render() {
  const visible = getVisibleTransactions();

  ui.renderSummary({
    balance: calculateBalance(state.transactions),
    income: calculateTotalIncome(state.transactions),
    expense: calculateTotalExpense(state.transactions),
  });
  ui.renderTransactionList(visible, {
    pendingDeleteId: state.pendingDeleteId,
    isFiltered: isFiltering(),
  });
  ui.renderResultsCount(visible.length, state.transactions.length);
  ui.toggleClearFiltersButton(isFiltering());
  renderCharts();
}

function renderCharts() {
  const categoryData = groupByCategory(state.transactions, state.chartType);
  doughnutChart.update(categoryData);
  ui.renderLegend(categoryData);
  barChart.update(groupByMonth(state.transactions, 6));
}

function persist() {
  storage.saveTransactions(state.transactions);
  if (!storage.storageAvailable) {
    ui.showToast("Storage isn't available in this browser, so entries won't be saved after reload.", 'warning');
  }
}


function handleAddClick() {
  ui.openModal('add');
}

function handleFormSubmit(event) {
  event.preventDefault();
  const values = ui.getFormValues();
  const { valid, errors } = validateTransactionForm(values);

  if (!valid) {
    ui.setFormErrors(errors);
    return;
  }

  const editingId = ui.elements.form.dataset.editingId;
  if (editingId) {
    const index = state.transactions.findIndex((t) => t.id === editingId);
    if (index !== -1) {
      state.transactions[index] = applyTransactionUpdate(state.transactions[index], values);
    }
    ui.showToast('Entry updated.');
  } else {
    state.transactions.push(createTransaction(values));
    ui.showToast('Entry added.');
  }

  persist();
  ui.closeModal();
  render();
}

function handleTypeRadioChange() {
  ui.populateFormCategoryOptions(ui.getSelectedFormType());
}

function handleModalKeydown(event) {
  if (!ui.isModalOpen()) return;
  if (event.key === 'Escape') {
    ui.closeModal();
    return;
  }
  ui.trapFocus(event);
}


function handleListClick(event) {
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;
  const row = event.target.closest('.ledger-row');
  const id = row?.dataset.id;
  if (!id) return;

  switch (actionEl.dataset.action) {
    case 'edit': {
      const transaction = state.transactions.find((t) => t.id === id);
      if (transaction) ui.openModal('edit', transaction);
      break;
    }
    case 'delete':
      state.pendingDeleteId = id;
      render();
      break;
    case 'cancel-delete':
      state.pendingDeleteId = null;
      render();
      break;
    case 'confirm-delete':
      removeTransaction(id, row);
      break;
    default:
      break;
  }
}

function removeTransaction(id, rowEl) {
  const finish = () => {
    state.transactions = state.transactions.filter((t) => t.id !== id);
    state.pendingDeleteId = null;
    persist();
    render();
    ui.showToast('Entry deleted.');
  };

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (rowEl && !reduceMotion) {
    rowEl.classList.add('is-leaving');
    setTimeout(finish, 220);
  } else {
    finish();
  }
}


const debouncedSearch = debounce((value) => {
  state.search = value;
  render();
}, 220);

function handleSearchInput(event) {
  debouncedSearch(event.target.value);
}

function handleTypeFilterChange(event) {
  state.filters.type = event.target.value;
  ui.populateCategoryFilterOptions(state.filters.type);
  state.filters.category = ui.elements.categoryFilter.value;
  render();
}

function handleCategoryFilterChange(event) {
  state.filters.category = event.target.value;
  render();
}

function handleDateFilterChange(event) {
  state.filters.range = event.target.value;
  ui.toggleCustomDateInputs(state.filters.range === DATE_RANGES.CUSTOM);
  if (state.filters.range !== DATE_RANGES.CUSTOM) render();
}

function handleCustomDateChange() {
  state.filters.customStart = ui.elements.customStart.value;
  state.filters.customEnd = ui.elements.customEnd.value;
  render();
}

function handleClearFilters() {
  state.filters = { ...DEFAULT_FILTERS };
  state.search = '';
  ui.elements.searchInput.value = '';
  ui.elements.typeFilter.value = 'all';
  ui.elements.dateFilter.value = DATE_RANGES.ALL;
  ui.toggleCustomDateInputs(false);
  ui.populateCategoryFilterOptions('all');
  render();
}


function handleChartTypeToggle(event) {
  const btn = event.target.closest('[data-chart-type]');
  if (!btn || btn.dataset.chartType === state.chartType) return;
  state.chartType = btn.dataset.chartType;
  ui.setActiveChartTypeButton(state.chartType);
  renderCharts();
}

function handleDoughnutHover(slice, x, y) {
  if (!slice) {
    ui.hideChartTooltip();
    return;
  }
  ui.showChartTooltip(
    `<strong>${slice.label}</strong><br>${formatCurrency(slice.total)} \u00b7 ${slice.percent.toFixed(0)}%`,
    x,
    y
  );
}

function handleBarHover(payload, x, y) {
  if (!payload) {
    ui.hideChartTooltip();
    return;
  }
  ui.showChartTooltip(
    `<strong>${payload.series} \u00b7 ${payload.monthLabel}</strong><br>${formatCurrency(payload.value)}`,
    x,
    y
  );
}


function handleThemeToggle() {
  ui.setThemeToggleIcon(toggleTheme());
  renderCharts(); // chart colors are read from CSS variables, which just changed
}


function attachEventListeners() {
  ui.elements.addTransactionBtn.addEventListener('click', handleAddClick);
  ui.elements.form.addEventListener('submit', handleFormSubmit);
  ui.elements.cancelBtn.addEventListener('click', ui.closeModal);
  ui.elements.modalCloseBtn.addEventListener('click', ui.closeModal);
  ui.elements.modal.addEventListener('click', (event) => {
    if (event.target === ui.elements.modal) ui.closeModal();
  });
  ui.elements.form.querySelectorAll('input[name="type"]').forEach((radio) => {
    radio.addEventListener('change', handleTypeRadioChange);
  });
  document.addEventListener('keydown', handleModalKeydown);

  ui.elements.transactionList.addEventListener('click', handleListClick);

  ui.elements.searchInput.addEventListener('input', handleSearchInput);
  ui.elements.typeFilter.addEventListener('change', handleTypeFilterChange);
  ui.elements.categoryFilter.addEventListener('change', handleCategoryFilterChange);
  ui.elements.dateFilter.addEventListener('change', handleDateFilterChange);
  ui.elements.customStart.addEventListener('change', handleCustomDateChange);
  ui.elements.customEnd.addEventListener('change', handleCustomDateChange);
  ui.elements.clearFiltersBtn.addEventListener('click', handleClearFilters);

  ui.elements.categoryTypeToggle.addEventListener('click', handleChartTypeToggle);
  ui.elements.themeToggle.addEventListener('click', handleThemeToggle);
}

document.addEventListener('DOMContentLoaded', init);
