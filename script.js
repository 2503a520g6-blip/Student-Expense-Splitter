/**
 * ====================================================================
 * Student Expense Splitter (SplitMate) - Complete JavaScript Logic
 * ====================================================================
 * Features:
 * 1. State Management & localStorage Persistence
 * 2. Member Management: Add, Edit (Rename), and Remove
 * 3. Equal & Custom Amount Expense Splitting
 * 4. Interactive Spending Analytics with Chart.js (Monthly & Category)
 * 5. Fair-Share & Net Balance Calculation (INR ₹ by default)
 * 6. Greedy Settlement Engine with 1-Click "Mark as Paid" Settlement
 * 7. Monthly Reporting Banner & Excel-Ready CSV Export (with UTF-8 BOM)
 * 8. Search, Filter, Toast Notifications, and Modals
 */

// Global Application State
let members = [];
let expenses = [];
let settledPayments = [];
let currentCurrency = '₹'; // Default to Indian Rupee
let currentSplitMode = 'equal'; // 'equal' or 'custom'

// Chart.js Instances
let monthlyChartInstance = null;
let categoryChartInstance = null;

// LocalStorage Keys
const STORAGE_KEYS = {
  MEMBERS: 'splitmate_members',
  EXPENSES: 'splitmate_expenses',
  SETTLED: 'splitmate_settled',
  CURRENCY: 'splitmate_currency'
};

// ====================================================================
// Initialization & Event Listeners
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
  setDefaultDate();
  renderAll();
});

/**
 * Attaches all event listeners across forms, buttons, and filters
 */
function setupEventListeners() {
  // Add Member Form
  const memberForm = document.getElementById('form-add-member');
  if (memberForm) {
    memberForm.addEventListener('submit', handleAddMember);
  }

  // Edit Member Modal Events
  const editMemberModalClose = document.getElementById('modal-edit-close');
  const editMemberModalCancel = document.getElementById('modal-edit-cancel');
  const editMemberModalSave = document.getElementById('modal-edit-save');
  const formEditMember = document.getElementById('form-edit-member');

  if (editMemberModalClose) editMemberModalClose.addEventListener('click', closeEditMemberModal);
  if (editMemberModalCancel) editMemberModalCancel.addEventListener('click', closeEditMemberModal);
  if (editMemberModalSave) editMemberModalSave.addEventListener('click', handleSaveEditMember);
  if (formEditMember) formEditMember.addEventListener('submit', handleSaveEditMember);

  // Edit Bill Modal Events
  const editBillClose = document.getElementById('modal-edit-bill-close');
  const editBillCancel = document.getElementById('modal-edit-bill-cancel');
  const editBillSave = document.getElementById('modal-edit-bill-save');
  const formEditBill = document.getElementById('form-edit-bill');
  const btnEditModeEqual = document.getElementById('btn-edit-mode-equal');
  const btnEditModeCustom = document.getElementById('btn-edit-mode-custom');

  if (editBillClose) editBillClose.addEventListener('click', closeEditBillModal);
  if (editBillCancel) editBillCancel.addEventListener('click', closeEditBillModal);
  if (editBillSave) editBillSave.addEventListener('click', handleSaveEditBill);
  if (formEditBill) formEditBill.addEventListener('submit', handleSaveEditBill);

  if (btnEditModeEqual && btnEditModeCustom) {
    btnEditModeEqual.addEventListener('click', () => setEditBillSplitMode('equal'));
    btnEditModeCustom.addEventListener('click', () => setEditBillSplitMode('custom'));
  }

  // Add Expense Form
  const expenseForm = document.getElementById('form-add-expense');
  if (expenseForm) {
    expenseForm.addEventListener('submit', handleAddExpense);
  }

  // Live amount change update
  const amountInput = document.getElementById('expense-amount');
  if (amountInput) {
    amountInput.addEventListener('input', () => {
      updateSplitPreview();
      updateCustomSplitMeter();
    });
  }

  // Split Mode Toggle Buttons (Equal vs Custom)
  const btnModeEqual = document.getElementById('btn-split-mode-equal');
  const btnModeCustom = document.getElementById('btn-split-mode-custom');

  if (btnModeEqual && btnModeCustom) {
    btnModeEqual.addEventListener('click', () => setSplitMode('equal'));
    btnModeCustom.addEventListener('click', () => setSplitMode('custom'));
  }

  // Select / Deselect All Members in Equal Split
  const btnSelectAll = document.getElementById('btn-select-all-members');
  if (btnSelectAll) {
    btnSelectAll.addEventListener('click', () => toggleAllMemberCheckboxes(true));
  }

  const btnClearAll = document.getElementById('btn-clear-all-members');
  if (btnClearAll) {
    btnClearAll.addEventListener('click', () => toggleAllMemberCheckboxes(false));
  }

  // Currency Selection
  const currencySelect = document.getElementById('currency-select');
  if (currencySelect) {
    currencySelect.value = currentCurrency;
    currencySelect.addEventListener('change', (e) => {
      currentCurrency = e.target.value;
      localStorage.setItem(STORAGE_KEYS.CURRENCY, currentCurrency);
      updateCurrencyLabels();
      renderAll();
      showToast(`Currency set to ${currentCurrency}`, 'info');
    });
  }

  // Demo Data & Reset Buttons
  const btnLoadDemo = document.getElementById('btn-load-demo');
  if (btnLoadDemo) {
    btnLoadDemo.addEventListener('click', loadDemoData);
  }

  const btnResetAll = document.getElementById('btn-reset-all');
  if (btnResetAll) {
    btnResetAll.addEventListener('click', () => {
      openModal(
        'Reset All Data?',
        'This will permanently delete all students, expenses, settlement history, and charts. This cannot be undone.',
        resetAllData
      );
    });
  }

  // Copy Settlement Plan Button
  const btnCopySettlements = document.getElementById('btn-copy-settlements');
  if (btnCopySettlements) {
    btnCopySettlements.addEventListener('click', copySettlementPlan);
  }

  // Search & Filters for History
  const searchInput = document.getElementById('expense-search');
  if (searchInput) {
    searchInput.addEventListener('input', renderExpenseTable);
  }

  const categoryFilter = document.getElementById('expense-filter-category');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', renderExpenseTable);
  }

  const monthFilter = document.getElementById('expense-filter-month');
  if (monthFilter) {
    monthFilter.addEventListener('change', () => {
      renderExpenseTable();
      updateMonthlyReportBanner();
    });
  }

  // CSV Export Button
  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', exportExpensesToCSV);
  }

  // Confirmation Modal Buttons
  const modalBtnClose = document.getElementById('modal-btn-close');
  const modalBtnCancel = document.getElementById('modal-btn-cancel');
  if (modalBtnClose) modalBtnClose.addEventListener('click', closeModal);
  if (modalBtnCancel) modalBtnCancel.addEventListener('click', closeModal);
}

/**
 * Sets the default date input in the expense form to today's date
 */
function setDefaultDate() {
  const dateInput = document.getElementById('expense-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
}

/**
 * Updates all currency symbols across the page
 */
function updateCurrencyLabels() {
  document.querySelectorAll('.currency-label').forEach(el => {
    el.textContent = currentCurrency;
  });
}

// ====================================================================
// LocalStorage Persistence
// ====================================================================
function loadData() {
  try {
    const savedMembers = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    const savedExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    const savedSettled = localStorage.getItem(STORAGE_KEYS.SETTLED);
    const savedCurrency = localStorage.getItem(STORAGE_KEYS.CURRENCY);

    if (savedMembers !== null) {
      members = JSON.parse(savedMembers) || [];
      if (savedExpenses) expenses = JSON.parse(savedExpenses) || [];
      if (savedSettled) settledPayments = JSON.parse(savedSettled) || [];
      if (savedCurrency) currentCurrency = savedCurrency;
    } else {
      // First-time visit: Populate initial sample student data in Indian Rupees
      loadSampleInitialData();
    }

    updateCurrencyLabels();
  } catch (error) {
    console.error('Error loading data from localStorage:', error);
    loadSampleInitialData();
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    localStorage.setItem(STORAGE_KEYS.SETTLED, JSON.stringify(settledPayments));
    localStorage.setItem(STORAGE_KEYS.CURRENCY, currentCurrency);
  } catch (error) {
    console.error('Error saving data to localStorage:', error);
    showToast('Storage quota exceeded or browser storage disabled.', 'error');
  }
}

// ====================================================================
// Member Management (Add, Edit, Remove)
// ====================================================================
function handleAddMember(e) {
  e.preventDefault();
  const input = document.getElementById('member-name-input');
  const rawName = input.value.trim();

  if (!rawName) {
    showToast('Please enter a valid student name.', 'warning');
    input.focus();
    return;
  }

  if (rawName.length > 30) {
    showToast('Student name cannot exceed 30 characters.', 'warning');
    return;
  }

  const isDuplicate = members.some(m => m.toLowerCase() === rawName.toLowerCase());
  if (isDuplicate) {
    showToast(`"${rawName}" is already in the group!`, 'warning');
    input.focus();
    return;
  }

  members.push(rawName);
  saveData();
  input.value = '';
  renderAll();
  showToast(`Added "${rawName}" to group!`, 'success');
}

/**
 * Opens modal to edit/rename a student member
 */
function openEditMemberModal(oldName) {
  const modal = document.getElementById('edit-member-modal');
  const input = document.getElementById('edit-member-name-input');
  const hiddenInput = document.getElementById('edit-member-old-name');

  if (!modal || !input || !hiddenInput) return;

  hiddenInput.value = oldName;
  input.value = oldName;
  modal.classList.remove('hidden');
  input.focus();
  input.select();
}

function closeEditMemberModal() {
  const modal = document.getElementById('edit-member-modal');
  if (modal) modal.classList.add('hidden');
}

/**
 * Renames member and safely updates all linked expenses and records
 */
function handleSaveEditMember(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('edit-member-name-input');
  const hiddenInput = document.getElementById('edit-member-old-name');

  const oldName = hiddenInput.value;
  const newName = input.value.trim();

  if (!newName) {
    showToast('Student name cannot be empty.', 'warning');
    input.focus();
    return;
  }

  if (newName.toLowerCase() !== oldName.toLowerCase()) {
    const isDuplicate = members.some(m => m.toLowerCase() === newName.toLowerCase());
    if (isDuplicate) {
      showToast(`A student named "${newName}" already exists.`, 'warning');
      input.focus();
      return;
    }
  }

  // 1. Update members array
  const memberIdx = members.indexOf(oldName);
  if (memberIdx !== -1) {
    members[memberIdx] = newName;
  }

  // 2. Update expenses (payer, splitWith array, customSplit keys)
  expenses.forEach(exp => {
    if (exp.paidBy === oldName) exp.paidBy = newName;
    if (Array.isArray(exp.splitWith)) {
      exp.splitWith = exp.splitWith.map(m => m === oldName ? newName : m);
    }
    if (exp.customSplit && exp.customSplit[oldName] !== undefined) {
      exp.customSplit[newName] = exp.customSplit[oldName];
      delete exp.customSplit[oldName];
    }
  });

  // 3. Update settled payments history
  settledPayments.forEach(p => {
    if (p.from === oldName) p.from = newName;
    if (p.to === oldName) p.to = newName;
  });

  saveData();
  closeEditMemberModal();
  renderAll();
  showToast(`Renamed "${oldName}" to "${newName}"!`, 'success');
}

function removeMember(name) {
  const isInvolvedInExpense = expenses.some(exp => 
    exp.paidBy === name || (Array.isArray(exp.splitWith) && exp.splitWith.includes(name))
  );

  if (isInvolvedInExpense) {
    openModal(
      `Remove ${name}?`,
      `${name} is linked to existing expenses. Removing them will delete expenses they paid for and recalculate all group balances. Are you sure?`,
      () => executeMemberRemoval(name)
    );
  } else {
    executeMemberRemoval(name);
  }
}

function executeMemberRemoval(name) {
  members = members.filter(m => m !== name);

  // Remove expenses where this member was the payer
  expenses = expenses.filter(exp => exp.paidBy !== name);

  // Remove from split lists
  expenses.forEach(exp => {
    if (Array.isArray(exp.splitWith)) {
      exp.splitWith = exp.splitWith.filter(m => m !== name);
    }
    if (exp.customSplit && exp.customSplit[name] !== undefined) {
      delete exp.customSplit[name];
    }
  });

  // Filter out any expenses that now have 0 participants
  expenses = expenses.filter(exp => exp.splitWith && exp.splitWith.length > 0);

  saveData();
  renderAll();
  showToast(`Removed "${name}" from group.`, 'info');
}

// ====================================================================
// Expense Splitting Modes (Equal vs Custom)
// ====================================================================
function setSplitMode(mode) {
  currentSplitMode = mode;

  const btnEqual = document.getElementById('btn-split-mode-equal');
  const btnCustom = document.getElementById('btn-split-mode-custom');
  const viewEqual = document.getElementById('split-view-equal');
  const viewCustom = document.getElementById('split-view-custom');

  if (mode === 'equal') {
    btnEqual.classList.add('active');
    btnCustom.classList.remove('active');
    viewEqual.classList.remove('hidden');
    viewCustom.classList.add('hidden');
    updateSplitPreview();
  } else {
    btnCustom.classList.add('active');
    btnEqual.classList.remove('active');
    viewCustom.classList.remove('hidden');
    viewEqual.classList.add('hidden');
    renderCustomSplitInputs();
    updateCustomSplitMeter();
  }
}

/**
 * Toggles all checkboxes in equal split mode
 */
function toggleAllMemberCheckboxes(check) {
  const checkboxes = document.querySelectorAll('#split-members-checkboxes input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = check;
    const parentLabel = cb.closest('.split-checkbox-label');
    if (parentLabel) {
      if (check) parentLabel.classList.add('checked');
      else parentLabel.classList.remove('checked');
    }
  });
  updateSplitPreview();
}

/**
 * Updates live estimate preview in equal split mode
 */
function updateSplitPreview() {
  const previewBox = document.getElementById('split-preview');
  const previewText = document.getElementById('split-preview-text');
  const amountInput = document.getElementById('expense-amount');

  if (!previewBox || !previewText || !amountInput) return;

  const amount = parseFloat(amountInput.value);
  const checkedBoxes = document.querySelectorAll('#split-members-checkboxes input[type="checkbox"]:checked');
  const count = checkedBoxes.length;

  if (!amount || amount <= 0 || count === 0) {
    previewBox.classList.add('hidden');
    return;
  }

  const share = (amount / count).toFixed(2);
  previewText.textContent = `Split equally among ${count} student${count > 1 ? 's' : ''}: ${currentCurrency}${share} each`;
  previewBox.classList.remove('hidden');
}

/**
 * Renders individual input rows for each member in custom split mode
 */
function renderCustomSplitInputs() {
  const container = document.getElementById('custom-split-inputs-container');
  const amountInput = document.getElementById('expense-amount');
  if (!container) return;

  if (members.length === 0) {
    container.innerHTML = '<span class="text-muted" style="font-size: 0.85rem;">Add members above to configure custom splits.</span>';
    return;
  }

  const totalAmount = parseFloat(amountInput ? amountInput.value : 0) || 0;
  const defaultShare = totalAmount > 0 ? (totalAmount / members.length).toFixed(2) : '';

  container.innerHTML = '';
  members.forEach(name => {
    const row = document.createElement('div');
    row.className = 'custom-input-card';
    row.innerHTML = `
      <div class="custom-input-user">
        <div class="member-avatar">${getInitials(name)}</div>
        <span>${escapeHtml(name)}</span>
      </div>
      <div class="custom-amount-field">
        <span class="input-prefix currency-label">${currentCurrency}</span>
        <input 
          type="number" 
          step="0.01" 
          min="0" 
          placeholder="0.00" 
          class="form-control custom-member-input" 
          data-member="${escapeHtml(name)}"
          value="${defaultShare}"
        >
      </div>
    `;

    const inputEl = row.querySelector('.custom-member-input');
    inputEl.addEventListener('input', updateCustomSplitMeter);
    container.appendChild(row);
  });

  updateCustomSplitMeter();
}

/**
 * Updates allocation balance meter in custom split mode
 */
function updateCustomSplitMeter() {
  const meter = document.getElementById('custom-split-meter');
  const allocatedEl = document.getElementById('custom-allocated-amount');
  const totalEl = document.getElementById('custom-total-amount');
  const warningBanner = document.getElementById('custom-validation-warning');
  const warningText = document.getElementById('custom-warning-text');
  const amountInput = document.getElementById('expense-amount');

  if (!meter || !allocatedEl || !totalEl || !amountInput) return;

  const total = parseFloat(amountInput.value) || 0;
  const customInputs = document.querySelectorAll('.custom-member-input');

  let allocated = 0;
  customInputs.forEach(inp => {
    const val = parseFloat(inp.value);
    if (!isNaN(val) && val > 0) allocated += val;
  });

  allocated = parseFloat(allocated.toFixed(2));
  allocatedEl.textContent = `${currentCurrency}${allocated.toFixed(2)}`;
  totalEl.textContent = `${currentCurrency}${total.toFixed(2)}`;

  const diff = parseFloat((total - allocated).toFixed(2));

  if (Math.abs(diff) < 0.05 && total > 0) {
    meter.className = 'custom-split-meter matched';
    if (warningBanner) warningBanner.classList.add('hidden');
  } else {
    meter.className = 'custom-split-meter unmatched';
    if (warningBanner && warningText && total > 0) {
      warningBanner.classList.remove('hidden');
      if (diff > 0) {
        warningText.textContent = `Remaining to allocate: ${currentCurrency}${diff.toFixed(2)}`;
      } else {
        warningText.textContent = `Over-allocated by: ${currentCurrency}${Math.abs(diff).toFixed(2)}`;
      }
    } else if (warningBanner) {
      warningBanner.classList.add('hidden');
    }
  }
}

// ====================================================================
// Expense Management (Add & Delete)
// ====================================================================
function handleAddExpense(e) {
  e.preventDefault();

  if (members.length < 2) {
    showToast('Please add at least 2 students before splitting expenses!', 'warning');
    return;
  }

  const nameInput = document.getElementById('expense-name');
  const amountInput = document.getElementById('expense-amount');
  const categorySelect = document.getElementById('expense-category');
  const dateInput = document.getElementById('expense-date');
  const payerSelect = document.getElementById('expense-payer');

  const title = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categorySelect.value;
  const date = dateInput.value || new Date().toISOString().split('T')[0];
  const paidBy = payerSelect.value;

  if (!title) {
    showToast('Please provide an expense description.', 'warning');
    nameInput.focus();
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid amount greater than 0.', 'error');
    amountInput.focus();
    return;
  }

  if (!paidBy) {
    showToast('Please select who paid for this expense.', 'warning');
    payerSelect.focus();
    return;
  }

  let splitWith = [];
  let customSplit = null;
  let sharePerPerson = 0;

  if (currentSplitMode === 'equal') {
    const selectedCheckboxes = document.querySelectorAll('#split-members-checkboxes input[type="checkbox"]:checked');
    splitWith = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (splitWith.length === 0) {
      showToast('Please select at least one student sharing this expense.', 'warning');
      return;
    }

    sharePerPerson = parseFloat((amount / splitWith.length).toFixed(2));
  } else {
    // Custom split validation
    customSplit = {};
    let allocatedTotal = 0;

    const customInputs = document.querySelectorAll('.custom-member-input');
    customInputs.forEach(inp => {
      const mem = inp.getAttribute('data-member');
      const val = parseFloat(inp.value) || 0;
      if (val > 0) {
        customSplit[mem] = parseFloat(val.toFixed(2));
        allocatedTotal += val;
        splitWith.push(mem);
      }
    });

    allocatedTotal = parseFloat(allocatedTotal.toFixed(2));
    const diff = Math.abs(amount - allocatedTotal);

    if (diff > 0.05) {
      showToast(`Custom shares (${currentCurrency}${allocatedTotal.toFixed(2)}) must equal total amount (${currentCurrency}${amount.toFixed(2)}).`, 'error');
      return;
    }

    if (splitWith.length === 0) {
      showToast('Please enter a share amount for at least one student.', 'warning');
      return;
    }
  }

  // Create each expense as a distinct, separate bill record with its own unique ID
  const newExpense = {
    id: generateBillId(),
    title,
    amount: parseFloat(amount.toFixed(2)),
    category,
    date,
    paidBy,
    splitType: currentSplitMode,
    splitWith,
    customSplit,
    sharePerPerson: currentSplitMode === 'equal' ? sharePerPerson : 'Custom'
  };

  expenses.unshift(newExpense);
  saveData();

  // Reset Form
  nameInput.value = '';
  amountInput.value = '';
  payerSelect.value = '';
  setDefaultDate();
  toggleAllMemberCheckboxes(true);
  setSplitMode('equal');

  renderAll();
  showToast(`Recorded bill "${title}" (#${newExpense.id}) for ${currentCurrency}${amount.toFixed(2)}!`, 'success');
}

/**
 * Generates a unique, student-friendly bill ID (e.g. BILL-4912)
 */
function generateBillId() {
  let id;
  do {
    id = 'BILL-' + Math.floor(1000 + Math.random() * 9000);
  } while (expenses.some(e => e.id === id));
  return id;
}

function deleteExpense(expenseId) {
  const expense = expenses.find(e => e.id === expenseId);
  const title = expense ? expense.title : 'this bill';

  openModal(
    'Delete Bill?',
    `Are you sure you want to delete bill "${title}" (#${expenseId})? This will recalculate everyone's balances.`,
    () => {
      expenses = expenses.filter(e => e.id !== expenseId);
      saveData();
      renderAll();
      showToast('Bill deleted successfully.', 'info');
    }
  );
}

// ====================================================================
// Individual Bill Editing
// ====================================================================
let editBillSplitMode = 'equal';

function openEditBillModal(billId) {
  const bill = expenses.find(b => b.id === billId);
  if (!bill) return;

  const modal = document.getElementById('edit-bill-modal');
  const idInput = document.getElementById('edit-bill-id');
  const idLabel = document.getElementById('edit-bill-id-label');
  const nameInput = document.getElementById('edit-bill-name');
  const amountInput = document.getElementById('edit-bill-amount');
  const categorySelect = document.getElementById('edit-bill-category');
  const dateInput = document.getElementById('edit-bill-date');
  const payerSelect = document.getElementById('edit-bill-payer');

  idInput.value = bill.id;
  idLabel.textContent = `Bill ID: #${bill.id}`;
  nameInput.value = bill.title;
  amountInput.value = bill.amount;
  categorySelect.value = bill.category;
  dateInput.value = bill.date;

  // Populate Payer Select
  payerSelect.innerHTML = '';
  members.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === bill.paidBy) opt.selected = true;
    payerSelect.appendChild(opt);
  });

  // Setup split mode in Edit Modal
  editBillSplitMode = bill.splitType || 'equal';
  setEditBillSplitMode(editBillSplitMode, bill);

  modal.classList.remove('hidden');
}

function setEditBillSplitMode(mode, bill) {
  editBillSplitMode = mode;
  const btnEqual = document.getElementById('btn-edit-mode-equal');
  const btnCustom = document.getElementById('btn-edit-mode-custom');
  const equalContainer = document.getElementById('edit-split-equal-container');
  const customContainer = document.getElementById('edit-split-custom-container');

  if (mode === 'equal') {
    btnEqual.classList.add('active');
    btnCustom.classList.remove('active');
    equalContainer.classList.remove('hidden');
    customContainer.classList.add('hidden');
    renderEditEqualCheckboxes(bill);
  } else {
    btnCustom.classList.add('active');
    btnEqual.classList.remove('active');
    customContainer.classList.remove('hidden');
    equalContainer.classList.add('hidden');
    renderEditCustomInputs(bill);
  }
}

function renderEditEqualCheckboxes(bill) {
  const container = document.getElementById('edit-split-equal-container');
  if (!container) return;
  container.innerHTML = '';

  const splitWith = bill && Array.isArray(bill.splitWith) ? bill.splitWith : members;

  members.forEach(name => {
    const label = document.createElement('label');
    const isChecked = splitWith.includes(name);
    label.className = `split-checkbox-label ${isChecked ? 'checked' : ''}`;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = name;
    cb.checked = isChecked;

    cb.addEventListener('change', (e) => {
      if (e.target.checked) label.classList.add('checked');
      else label.classList.remove('checked');
    });

    label.appendChild(cb);
    label.appendChild(document.createTextNode(name));
    container.appendChild(label);
  });
}

function renderEditCustomInputs(bill) {
  const container = document.getElementById('edit-split-custom-container');
  if (!container) return;
  container.innerHTML = '';

  const customSplit = bill && bill.customSplit ? bill.customSplit : {};

  members.forEach(name => {
    const row = document.createElement('div');
    row.className = 'custom-input-card';
    const val = customSplit[name] !== undefined ? customSplit[name] : '';

    row.innerHTML = `
      <div class="custom-input-user">
        <div class="member-avatar">${getInitials(name)}</div>
        <span>${escapeHtml(name)}</span>
      </div>
      <div class="custom-amount-field">
        <span class="input-prefix currency-label">${currentCurrency}</span>
        <input 
          type="number" 
          step="0.01" 
          min="0" 
          placeholder="0.00" 
          class="form-control edit-custom-member-input" 
          data-member="${escapeHtml(name)}"
          value="${val}"
        >
      </div>
    `;
    container.appendChild(row);
  });
}

function closeEditBillModal() {
  const modal = document.getElementById('edit-bill-modal');
  if (modal) modal.classList.add('hidden');
}

function handleSaveEditBill(e) {
  if (e) e.preventDefault();
  const idInput = document.getElementById('edit-bill-id');
  const nameInput = document.getElementById('edit-bill-name');
  const amountInput = document.getElementById('edit-bill-amount');
  const categorySelect = document.getElementById('edit-bill-category');
  const dateInput = document.getElementById('edit-bill-date');
  const payerSelect = document.getElementById('edit-bill-payer');

  const billId = idInput.value;
  const bill = expenses.find(b => b.id === billId);
  if (!bill) return;

  const title = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categorySelect.value;
  const date = dateInput.value;
  const paidBy = payerSelect.value;

  if (!title) {
    showToast('Please enter a bill description.', 'warning');
    nameInput.focus();
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid amount greater than 0.', 'error');
    amountInput.focus();
    return;
  }

  if (!paidBy) {
    showToast('Please select who paid this bill.', 'warning');
    return;
  }

  let splitWith = [];
  let customSplit = null;
  let sharePerPerson = 0;

  if (editBillSplitMode === 'equal') {
    const checked = document.querySelectorAll('#edit-split-equal-container input[type="checkbox"]:checked');
    splitWith = Array.from(checked).map(c => c.value);
    if (splitWith.length === 0) {
      showToast('Please select at least one student sharing this bill.', 'warning');
      return;
    }
    sharePerPerson = parseFloat((amount / splitWith.length).toFixed(2));
  } else {
    customSplit = {};
    let allocated = 0;
    const inputs = document.querySelectorAll('.edit-custom-member-input');
    inputs.forEach(inp => {
      const mem = inp.getAttribute('data-member');
      const val = parseFloat(inp.value) || 0;
      if (val > 0) {
        customSplit[mem] = parseFloat(val.toFixed(2));
        allocated += val;
        splitWith.push(mem);
      }
    });

    allocated = parseFloat(allocated.toFixed(2));
    if (Math.abs(amount - allocated) > 0.05) {
      showToast(`Custom shares (${currentCurrency}${allocated.toFixed(2)}) must equal total bill amount (${currentCurrency}${amount.toFixed(2)}).`, 'error');
      return;
    }
    sharePerPerson = 'Custom';
  }

  // Update ONLY this specific bill without touching any other bills
  bill.title = title;
  bill.amount = amount;
  bill.category = category;
  bill.date = date;
  bill.paidBy = paidBy;
  bill.splitType = editBillSplitMode;
  bill.splitWith = splitWith;
  bill.customSplit = customSplit;
  bill.sharePerPerson = sharePerPerson;

  saveData();
  closeEditBillModal();
  renderAll();
  showToast(`Updated bill "${title}" (#${bill.id}) successfully!`, 'success');
}

// ====================================================================
// Balances & Smart Debt Settlement Engine
// ====================================================================
/**
 * Calculates how much each student paid, their fair share owed, and net balance.
 */
function calculateBalances() {
  const balanceMap = {};

  members.forEach(member => {
    balanceMap[member] = {
      paid: 0,
      share: 0,
      net: 0
    };
  });

  expenses.forEach(exp => {
    // 1. Credit the payer
    if (balanceMap[exp.paidBy] !== undefined) {
      balanceMap[exp.paidBy].paid += exp.amount;
    }

    // 2. Debit participants
    if (exp.splitType === 'custom' && exp.customSplit) {
      Object.keys(exp.customSplit).forEach(member => {
        if (balanceMap[member] !== undefined) {
          balanceMap[member].share += exp.customSplit[member];
        }
      });
    } else if (Array.isArray(exp.splitWith) && exp.splitWith.length > 0) {
      const perPersonShare = exp.amount / exp.splitWith.length;
      exp.splitWith.forEach(member => {
        if (balanceMap[member] !== undefined) {
          balanceMap[member].share += perPersonShare;
        }
      });
    }
  });

  members.forEach(member => {
    const data = balanceMap[member];
    data.net = parseFloat((data.paid - data.share).toFixed(2));
    data.paid = parseFloat(data.paid.toFixed(2));
    data.share = parseFloat(data.share.toFixed(2));
  });

  return balanceMap;
}

/**
 * Greedy settlement algorithm matching largest debtor with largest creditor
 */
function calculateSettlements(balanceMap) {
  const debtors = [];
  const creditors = [];

  Object.keys(balanceMap).forEach(member => {
    const net = balanceMap[member].net;
    if (net < -0.01) {
      debtors.push({ name: member, amount: Math.abs(net) });
    } else if (net > 0.01) {
      creditors.push({ name: member, amount: net });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const payment = Math.min(debtor.amount, creditor.amount);

    if (payment > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: parseFloat(payment.toFixed(2))
      });
    }

    debtor.amount = parseFloat((debtor.amount - payment).toFixed(2));
    creditor.amount = parseFloat((creditor.amount - payment).toFixed(2));

    if (debtor.amount <= 0.01) dIdx++;
    if (creditor.amount <= 0.01) cIdx++;
  }

  return settlements;
}

/**
 * 1-Click "Mark as Paid" settlement payment
 */
function handleMarkSettled(from, to, amount) {
  const numAmount = parseFloat(amount);
  const today = new Date().toISOString().split('T')[0];

  // 1. Record completed payment
  const paymentRecord = {
    id: 'settle-' + Date.now(),
    from,
    to,
    amount: numAmount,
    date: today
  };
  settledPayments.unshift(paymentRecord);

  // 2. Add an offsetting settlement expense so the balance math balances out automatically
  const settlementExpense = {
    id: 'settle-exp-' + Date.now(),
    title: `Settlement: ${from} paid ${to}`,
    amount: numAmount,
    category: 'Settlement',
    date: today,
    paidBy: from,
    splitType: 'custom',
    splitWith: [to],
    customSplit: { [to]: numAmount },
    sharePerPerson: numAmount,
    isSettlement: true
  };
  expenses.unshift(settlementExpense);

  saveData();
  renderAll();
  showToast(`Recorded ${currentCurrency}${numAmount.toFixed(2)} payment from ${from} to ${to}!`, 'success');
}

/**
 * Reverts / undoes a marked settlement payment
 */
function undoSettledPayment(settledId) {
  const payment = settledPayments.find(p => p.id === settledId);
  if (!payment) return;

  settledPayments = settledPayments.filter(p => p.id !== settledId);
  // Also remove the corresponding settlement expense
  expenses = expenses.filter(exp => !(exp.isSettlement && exp.paidBy === payment.from && exp.splitWith.includes(payment.to) && exp.amount === payment.amount));

  saveData();
  renderAll();
  showToast('Settlement payment reverted.', 'info');
}

// ====================================================================
// Chart.js Visual Analytics (Monthly Spending & Category Breakdown)
// ====================================================================
function renderCharts() {
  if (typeof Chart === 'undefined') {
    const badge = document.getElementById('charts-status-badge');
    if (badge) badge.textContent = 'Chart.js Offline';
    return;
  }

  renderMonthlySpendingChart();
  renderCategoryBreakdownChart();
}

/**
 * Monthly Spending Bar Chart
 */
function renderMonthlySpendingChart() {
  const canvas = document.getElementById('chart-monthly-spending');
  if (!canvas) return;

  // Aggregate monthly spending
  const monthlyData = {};
  expenses.forEach(exp => {
    if (exp.isSettlement) return; // Don't inflate group spending with internal settlements
    const monthKey = exp.date ? exp.date.substring(0, 7) : 'Unknown';
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + exp.amount;
  });

  const sortedMonths = Object.keys(monthlyData).sort();
  const formattedLabels = sortedMonths.map(m => formatMonthLabel(m));
  const dataValues = sortedMonths.map(m => monthlyData[m]);

  if (monthlyChartInstance) {
    monthlyChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  monthlyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: formattedLabels.length > 0 ? formattedLabels : ['No Data'],
      datasets: [{
        label: `Total Spending (${currentCurrency})`,
        data: dataValues.length > 0 ? dataValues : [0],
        backgroundColor: 'rgba(37, 99, 235, 0.85)',
        borderColor: '#1d4ed8',
        borderWidth: 1.5,
        borderRadius: 6,
        hoverBackgroundColor: '#1d4ed8'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${currentCurrency}${ctx.raw.toFixed(2)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => `${currentCurrency}${v}`
          },
          grid: { color: 'rgba(226, 232, 240, 0.6)' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

/**
 * Category-wise Doughnut Chart
 */
function renderCategoryBreakdownChart() {
  const canvas = document.getElementById('chart-category-breakdown');
  if (!canvas) return;

  const categoryData = {};
  expenses.forEach(exp => {
    if (exp.isSettlement) return;
    const cat = exp.category || 'Other';
    categoryData[cat] = (categoryData[cat] || 0) + exp.amount;
  });

  const categories = Object.keys(categoryData);
  const values = categories.map(c => categoryData[c]);

  const palette = [
    '#2563eb', // Food
    '#10b981', // Groceries
    '#f59e0b', // Rent
    '#06b6d4', // Utilities
    '#8b5cf6', // Travel
    '#ec4899', // Entertainment
    '#6366f1', // Study
    '#64748b'  // Other
  ];

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categories.length > 0 ? categories : ['No Expenses'],
      datasets: [{
        data: values.length > 0 ? values : [1],
        backgroundColor: categories.length > 0 ? palette.slice(0, categories.length) : ['#e2e8f0'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { boxWidth: 12, font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${currentCurrency}${ctx.raw.toFixed(2)}`
          }
        }
      },
      cutout: '62%'
    }
  });
}

// ====================================================================
// Monthly Reporting & CSV Export
// ====================================================================
function updateMonthFilterDropdown() {
  const select = document.getElementById('expense-filter-month');
  if (!select) return;

  const currentVal = select.value;
  const uniqueMonths = new Set();

  expenses.forEach(exp => {
    if (exp.date) uniqueMonths.add(exp.date.substring(0, 7));
  });

  const sortedMonths = Array.from(uniqueMonths).sort().reverse();

  select.innerHTML = '<option value="ALL">All Months</option>';
  sortedMonths.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = formatMonthLabel(m);
    if (m === currentVal) opt.selected = true;
    select.appendChild(opt);
  });
}

function updateMonthlyReportBanner() {
  const banner = document.getElementById('monthly-report-banner');
  const titleEl = document.getElementById('report-title');
  const detailsEl = document.getElementById('report-details');
  const monthSelect = document.getElementById('expense-filter-month');

  if (!banner || !titleEl || !detailsEl || !monthSelect) return;

  const selectedMonth = monthSelect.value;
  if (selectedMonth === 'ALL') {
    banner.classList.add('hidden');
    return;
  }

  const monthExpenses = expenses.filter(exp => exp.date && exp.date.startsWith(selectedMonth) && !exp.isSettlement);
  const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Top category
  const catTotals = {};
  monthExpenses.forEach(e => catTotals[e.category] = (catTotals[e.category] || 0) + e.amount);
  let topCat = 'None';
  let topCatAmount = 0;
  Object.keys(catTotals).forEach(c => {
    if (catTotals[c] > topCatAmount) {
      topCatAmount = catTotals[c];
      topCat = c;
    }
  });

  titleEl.textContent = `Report for ${formatMonthLabel(selectedMonth)}:`;
  detailsEl.textContent = `${currentCurrency}${totalSpent.toFixed(2)} spent across ${monthExpenses.length} expense${monthExpenses.length === 1 ? '' : 's'} • Top Category: ${topCat} (${currentCurrency}${topCatAmount.toFixed(2)})`;
  banner.classList.remove('hidden');
}

/**
 * Exports expenses to an Excel-friendly CSV with UTF-8 BOM
 */
function exportExpensesToCSV() {
  if (expenses.length === 0) {
    showToast('No expenses to export.', 'warning');
    return;
  }

  const searchInput = document.getElementById('expense-search');
  const categoryFilter = document.getElementById('expense-filter-category');
  const monthFilter = document.getElementById('expense-filter-month');

  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filterCat = categoryFilter ? categoryFilter.value : 'ALL';
  const filterMonth = monthFilter ? monthFilter.value : 'ALL';

  const exportList = expenses.filter(exp => {
    const matchesSearch = exp.title.toLowerCase().includes(searchQuery) || 
                          exp.paidBy.toLowerCase().includes(searchQuery);
    const matchesCategory = filterCat === 'ALL' || exp.category === filterCat;
    const matchesMonth = filterMonth === 'ALL' || (exp.date && exp.date.startsWith(filterMonth));
    return matchesSearch && matchesCategory && matchesMonth;
  });

  if (exportList.length === 0) {
    showToast('No matching expenses found for export.', 'warning');
    return;
  }

  const headers = ['Expense ID', 'Date', 'Description', 'Category', 'Paid By', 'Split Method', 'Split With', `Total Amount (${currentCurrency})`];
  const rows = exportList.map(exp => [
    `"${exp.id}"`,
    `"${exp.date}"`,
    `"${exp.title.replace(/"/g, '""')}"`,
    `"${exp.category}"`,
    `"${exp.paidBy.replace(/"/g, '""')}"`,
    `"${exp.splitType || 'equal'}"`,
    `"${(exp.splitWith || []).join('; ')}"`,
    `"${exp.amount.toFixed(2)}"`
  ]);

  // Prepend \uFEFF UTF-8 BOM so Excel opens INR ₹ without garbled characters
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');

  const filename = filterMonth !== 'ALL' 
    ? `splitmate-expenses-${filterMonth}.csv` 
    : `splitmate-expenses-all.csv`;

  downloadLink.href = url;
  downloadLink.setAttribute('download', filename);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);

  showToast(`Exported ${exportList.length} expenses to ${filename}!`, 'success');
}

// ====================================================================
// UI Render Functions
// ====================================================================
function renderAll() {
  renderDashboardStats();
  renderMembersList();
  renderExpenseFormControls();
  renderBalancesAndSettlements();
  renderCompletedSettlements();
  updateMonthFilterDropdown();
  updateMonthlyReportBanner();
  renderExpenseTable();
  renderCharts();
}

/**
 * Top summary cards
 */
function renderDashboardStats() {
  const totalSpending = expenses
    .filter(exp => !exp.isSettlement)
    .reduce((sum, exp) => sum + exp.amount, 0);

  const balanceMap = calculateBalances();
  const settlements = calculateSettlements(balanceMap);

  document.getElementById('stat-total-spending').textContent = `${currentCurrency}${totalSpending.toFixed(2)}`;
  document.getElementById('stat-total-members').textContent = members.length;
  document.getElementById('stat-total-expenses').textContent = expenses.filter(e => !e.isSettlement).length;
  document.getElementById('stat-pending-settlements').textContent = settlements.length;
}

/**
 * Renders member chips with Edit (✏️) and Remove (✕) buttons
 */
function renderMembersList() {
  const container = document.getElementById('members-list');
  const countBadge = document.getElementById('members-count-badge');
  if (!container) return;

  countBadge.textContent = `${members.length} Student${members.length === 1 ? '' : 's'}`;

  if (members.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 1rem 0;">
        <span class="empty-icon">🎒</span>
        <p>No students in the group yet. Type a name above to begin!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  members.forEach(name => {
    const chip = document.createElement('div');
    chip.className = 'member-chip';

    const initials = getInitials(name);
    chip.innerHTML = `
      <div class="member-avatar">${initials}</div>
      <span class="member-name">${escapeHtml(name)}</span>
      <div class="chip-actions">
        <button type="button" class="btn-edit-chip" title="Edit / Rename ${escapeHtml(name)}" data-name="${escapeHtml(name)}">✏️</button>
        <button type="button" class="btn-remove-chip" title="Remove ${escapeHtml(name)}" data-name="${escapeHtml(name)}">&times;</button>
      </div>
    `;

    chip.querySelector('.btn-edit-chip').addEventListener('click', (e) => {
      const target = e.currentTarget.getAttribute('data-name');
      openEditMemberModal(target);
    });

    chip.querySelector('.btn-remove-chip').addEventListener('click', (e) => {
      const target = e.currentTarget.getAttribute('data-name');
      removeMember(target);
    });

    container.appendChild(chip);
  });
}

/**
 * Populates Payer dropdown and split members in Add Expense Card
 */
function renderExpenseFormControls() {
  const payerSelect = document.getElementById('expense-payer');
  const checkboxesContainer = document.getElementById('split-members-checkboxes');
  if (!payerSelect || !checkboxesContainer) return;

  const currentSelectedPayer = payerSelect.value;

  payerSelect.innerHTML = '<option value="" disabled selected>Select student</option>';
  members.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === currentSelectedPayer) opt.selected = true;
    payerSelect.appendChild(opt);
  });

  if (members.length === 0) {
    checkboxesContainer.innerHTML = '<span class="text-muted" style="font-size: 0.85rem;">Add students above first.</span>';
    updateSplitPreview();
    return;
  }

  checkboxesContainer.innerHTML = '';
  members.forEach(name => {
    const label = document.createElement('label');
    label.className = 'split-checkbox-label checked';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = name;
    checkbox.checked = true;

    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) label.classList.add('checked');
      else label.classList.remove('checked');
      updateSplitPreview();
    });

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(name));
    checkboxesContainer.appendChild(label);
  });

  updateSplitPreview();
  if (currentSplitMode === 'custom') {
    renderCustomSplitInputs();
  }
}

/**
 * Renders Member Balance Summary and Smart Settlement Suggestions
 */
function renderBalancesAndSettlements() {
  const balanceContainer = document.getElementById('balances-container');
  const settlementContainer = document.getElementById('settlement-container');
  const btnCopySettlements = document.getElementById('btn-copy-settlements');

  if (!balanceContainer || !settlementContainer) return;

  if (members.length === 0) {
    balanceContainer.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">👥</span>
        <p>No students in group yet.</p>
      </div>
    `;
    settlementContainer.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🤝</span>
        <p>Settlement suggestions will appear here once expenses are logged.</p>
      </div>
    `;
    if (btnCopySettlements) btnCopySettlements.style.display = 'none';
    return;
  }

  const balanceMap = calculateBalances();
  const settlements = calculateSettlements(balanceMap);

  // Render Balances
  balanceContainer.innerHTML = '';
  members.forEach(name => {
    const data = balanceMap[name];
    const item = document.createElement('div');
    item.className = 'balance-item';

    // Find all separate individual bills paid by this student
    const memberBills = expenses.filter(exp => exp.paidBy === name && !exp.isSettlement);

    let billsBreakdownHtml = '';
    if (memberBills.length > 0) {
      billsBreakdownHtml = `
        <div class="balance-bills-preview">
          ${memberBills.map(b => `<span class="bill-sub-pill" title="Bill #${b.id}">${escapeHtml(b.title)}: ${currentCurrency}${b.amount.toFixed(2)}</span>`).join(' ')}
        </div>
      `;
    }

    let statusHtml = '';
    if (data.net > 0) {
      statusHtml = `
        <span class="balance-status positive">+${currentCurrency}${data.net.toFixed(2)}</span>
        <span class="balance-tag" style="color: var(--success-dark);">Gets Back</span>
      `;
    } else if (data.net < 0) {
      statusHtml = `
        <span class="balance-status negative">-${currentCurrency}${Math.abs(data.net).toFixed(2)}</span>
        <span class="balance-tag" style="color: var(--danger);">Owes Money</span>
      `;
    } else {
      statusHtml = `
        <span class="balance-status settled">${currentCurrency}0.00</span>
        <span class="balance-tag" style="color: var(--text-muted);">Settled Up</span>
      `;
    }

    item.innerHTML = `
      <div class="balance-user">
        <div class="member-avatar">${getInitials(name)}</div>
        <div>
          <div class="balance-name">${escapeHtml(name)}</div>
          <div class="balance-sub">
            Paid: <strong>${currentCurrency}${data.paid.toFixed(2)}</strong> (${memberBills.length} separate bill${memberBills.length === 1 ? '' : 's'}) • Fair Share: ${currentCurrency}${data.share.toFixed(2)}
          </div>
          ${billsBreakdownHtml}
        </div>
      </div>
      <div class="balance-amount-box">
        ${statusHtml}
      </div>
    `;
    balanceContainer.appendChild(item);
  });

  // Render Settlements with "Mark Paid" buttons
  settlementContainer.innerHTML = '';
  if (settlements.length === 0) {
    settlementContainer.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🎉</span>
        <p><strong>All balances are settled up!</strong></p>
        <p style="font-size: 0.8rem; color: var(--text-muted);">No payments pending between students.</p>
      </div>
    `;
    if (btnCopySettlements) btnCopySettlements.style.display = 'none';
  } else {
    if (btnCopySettlements) btnCopySettlements.style.display = 'inline-flex';

    settlements.forEach(st => {
      const item = document.createElement('div');
      item.className = 'settlement-item';
      item.innerHTML = `
        <div class="settlement-flow">
          <span class="settlement-debtor">${escapeHtml(st.from)}</span>
          <span class="settlement-action">pays</span>
          <span class="settlement-arrow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </span>
          <span class="settlement-creditor">${escapeHtml(st.to)}</span>
        </div>
        <div class="settlement-actions-right">
          <div class="settlement-amount">${currentCurrency}${st.amount.toFixed(2)}</div>
          <button type="button" class="btn btn-success btn-mark-paid" data-from="${escapeHtml(st.from)}" data-to="${escapeHtml(st.to)}" data-amount="${st.amount}">
            ✓ Mark Paid
          </button>
        </div>
      `;

      item.querySelector('.btn-mark-paid').addEventListener('click', (e) => {
        const from = e.currentTarget.getAttribute('data-from');
        const to = e.currentTarget.getAttribute('data-to');
        const amt = e.currentTarget.getAttribute('data-amount');
        handleMarkSettled(from, to, amt);
      });

      settlementContainer.appendChild(item);
    });
  }
}

/**
 * Renders history of recorded settlement payments with Undo option
 */
function renderCompletedSettlements() {
  const container = document.getElementById('settled-payments-list');
  const countBadge = document.getElementById('settled-count-badge');
  if (!container || !countBadge) return;

  countBadge.textContent = `${settledPayments.length} Settled`;

  if (settledPayments.length === 0) {
    container.innerHTML = '<span class="text-muted" style="font-size: 0.82rem;">No settlements marked as paid yet.</span>';
    return;
  }

  container.innerHTML = '';
  settledPayments.forEach(p => {
    const item = document.createElement('div');
    item.className = 'settled-item';
    item.innerHTML = `
      <div>
        <span class="settled-text">✓ ${escapeHtml(p.from)} paid ${escapeHtml(p.to)}: ${currentCurrency}${p.amount.toFixed(2)}</span>
        <span class="settled-meta">(${formatDate(p.date)})</span>
      </div>
      <button type="button" class="btn-undo-settle" data-id="${p.id}" title="Undo this payment">Undo</button>
    `;

    item.querySelector('.btn-undo-settle').addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      undoSettledPayment(id);
    });

    container.appendChild(item);
  });
}

/**
 * Renders Expense History Table with Search, Category Filter, and Month Filter
 */
function renderExpenseTable() {
  const tbody = document.getElementById('expenses-table-body');
  const searchInput = document.getElementById('expense-search');
  const categoryFilter = document.getElementById('expense-filter-category');
  const monthFilter = document.getElementById('expense-filter-month');

  if (!tbody) return;

  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filterCat = categoryFilter ? categoryFilter.value : 'ALL';
  const filterMonth = monthFilter ? monthFilter.value : 'ALL';

  let filtered = expenses.filter(exp => {
    const matchesSearch = exp.title.toLowerCase().includes(searchQuery) || 
                          exp.paidBy.toLowerCase().includes(searchQuery) ||
                          (Array.isArray(exp.splitWith) && exp.splitWith.some(m => m.toLowerCase().includes(searchQuery)));
    const matchesCategory = filterCat === 'ALL' || exp.category === filterCat;
    const matchesMonth = filterMonth === 'ALL' || (exp.date && exp.date.startsWith(filterMonth));
    return matchesSearch && matchesCategory && matchesMonth;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <span class="empty-icon">🧾</span>
            <p><strong>${expenses.length === 0 ? 'No expenses recorded yet.' : 'No matching expenses found.'}</strong></p>
            <p style="font-size: 0.8rem; color: var(--text-muted);">
              ${expenses.length === 0 ? 'Use the form above to add your first expense!' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  filtered.forEach(exp => {
    const tr = document.createElement('tr');

    const categoryIcon = getCategoryIcon(exp.category);
    let splitSummary = '';

    if (exp.splitType === 'custom' && exp.customSplit) {
      const customShares = Object.keys(exp.customSplit).map(k => `${k}: ${currentCurrency}${exp.customSplit[k]}`).join(', ');
      splitSummary = `✍️ Custom: ${customShares}`;
    } else {
      const splitCount = exp.splitWith ? exp.splitWith.length : 0;
      splitSummary = splitCount === members.length 
        ? `All students (${splitCount}) • ${currentCurrency}${exp.sharePerPerson} ea` 
        : `${splitCount} students (${exp.splitWith.slice(0, 2).join(', ')}${splitCount > 2 ? '...' : ''}) • ${currentCurrency}${exp.sharePerPerson} ea`;
    }

    tr.innerHTML = `
      <td>
        <span class="bill-id-badge">#${escapeHtml(exp.id)}</span>
      </td>
      <td style="white-space: nowrap;">
        <span class="expense-date-sub">${formatDate(exp.date)}</span>
      </td>
      <td>
        <span class="expense-title">${escapeHtml(exp.title)}</span>
      </td>
      <td>
        <span class="category-tag">${categoryIcon} ${exp.category}</span>
      </td>
      <td>
        <strong>${escapeHtml(exp.paidBy)}</strong>
      </td>
      <td>
        <span class="split-pill-count" title="${escapeHtml(Array.isArray(exp.splitWith) ? exp.splitWith.join(', ') : '')}">
          ${splitSummary}
        </span>
      </td>
      <td class="text-right">
        <strong style="color: var(--primary-dark); font-size: 0.95rem;">
          ${currentCurrency}${exp.amount.toFixed(2)}
        </strong>
      </td>
      <td class="text-center">
        <div class="table-actions-cell">
          <button type="button" class="btn-icon-edit" title="Edit this bill (#${escapeHtml(exp.id)})" data-id="${escapeHtml(exp.id)}">✏️</button>
          <button type="button" class="btn-icon-delete" title="Delete this bill (#${escapeHtml(exp.id)})" data-id="${escapeHtml(exp.id)}">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    `;

    tr.querySelector('.btn-icon-edit').addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openEditBillModal(id);
    });

    tr.querySelector('.btn-icon-delete').addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      deleteExpense(id);
    });

    tbody.appendChild(tr);
  });
}

/**
 * Copies settlement plan to clipboard with safe fallback
 */
function copySettlementPlan() {
  const balanceMap = calculateBalances();
  const settlements = calculateSettlements(balanceMap);

  if (settlements.length === 0) {
    showToast('No pending settlements to copy.', 'info');
    return;
  }

  let text = `🎓 SplitMate - Group Settlement Plan\n`;
  text += `====================================\n`;
  settlements.forEach((s, idx) => {
    text += `${idx + 1}. ${s.from} pays ${s.to}: ${currentCurrency}${s.amount.toFixed(2)}\n`;
  });
  text += `====================================\n`;
  text += `Total Group Spending: ${currentCurrency}${expenses.filter(e => !e.isSettlement).reduce((s, e) => s + e.amount, 0).toFixed(2)}\n`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Settlement plan copied to clipboard!', 'success'))
      .catch(() => fallbackCopyText(text));
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) showToast('Settlement plan copied to clipboard!', 'success');
    else showToast('Could not copy to clipboard. Please copy manually.', 'warning');
  } catch (err) {
    showToast('Could not copy to clipboard. Please copy manually.', 'warning');
  }
}

// ====================================================================
// Demo Data (Indian Rupees ₹) & Reset
// ====================================================================
function loadSampleInitialData() {
  members = ['Alex', 'Priya', 'Jordan', 'Sam'];

  const today = new Date();
  const getOffsetDate = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  // Multiple separate bills, including multiple separate bills paid by the same student (e.g. Alex)
  expenses = [
    {
      id: 'BILL-1001',
      title: 'Hostel Semester Room Rent',
      amount: 6000.00,
      category: 'Rent',
      date: getOffsetDate(14),
      paidBy: 'Alex',
      splitType: 'equal',
      splitWith: ['Alex', 'Priya', 'Jordan', 'Sam'],
      customSplit: null,
      sharePerPerson: 1500.00
    },
    {
      id: 'BILL-1002',
      title: 'Hostel Electricity & Maintenance',
      amount: 500.00,
      category: 'Utilities',
      date: getOffsetDate(10),
      paidBy: 'Alex',
      splitType: 'equal',
      splitWith: ['Alex', 'Priya', 'Jordan', 'Sam'],
      customSplit: null,
      sharePerPerson: 125.00
    },
    {
      id: 'BILL-1003',
      title: 'Weekend Pizza Night',
      amount: 850.00,
      category: 'Food',
      date: getOffsetDate(7),
      paidBy: 'Priya',
      splitType: 'equal',
      splitWith: ['Alex', 'Priya', 'Jordan'],
      customSplit: null,
      sharePerPerson: 283.33
    },
    {
      id: 'BILL-1004',
      title: 'Weekly Hostel Groceries',
      amount: 1450.00,
      category: 'Groceries',
      date: getOffsetDate(4),
      paidBy: 'Jordan',
      splitType: 'equal',
      splitWith: ['Alex', 'Priya', 'Jordan', 'Sam'],
      customSplit: null,
      sharePerPerson: 362.50
    },
    {
      id: 'BILL-1005',
      title: 'Water Dispenser Refill',
      amount: 250.00,
      category: 'Utilities',
      date: getOffsetDate(3),
      paidBy: 'Jordan',
      splitType: 'equal',
      splitWith: ['Alex', 'Priya', 'Jordan', 'Sam'],
      customSplit: null,
      sharePerPerson: 62.50
    },
    {
      id: 'BILL-1006',
      title: 'Campus Project Printing & Stationery',
      amount: 320.00,
      category: 'Study',
      date: getOffsetDate(1),
      paidBy: 'Sam',
      splitType: 'custom',
      splitWith: ['Alex', 'Sam'],
      customSplit: { 'Alex': 200.00, 'Sam': 120.00 },
      sharePerPerson: 'Custom'
    }
  ];

  settledPayments = [];
  saveData();
}

function loadDemoData() {
  loadSampleInitialData();
  renderAll();
  showToast('Loaded sample student group data (₹)!', 'success');
}

function resetAllData() {
  members = [];
  expenses = [];
  settledPayments = [];
  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.SETTLED, JSON.stringify([]));
  renderAll();
  showToast('All student expense data has been reset.', 'info');
}

// ====================================================================
// Custom Confirmation Modal Helper
// ====================================================================
let modalConfirmCallback = null;

function openModal(title, message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('modal-title');
  const msgEl = document.getElementById('modal-message');
  const confirmBtn = document.getElementById('modal-btn-confirm');

  if (!modal || !titleEl || !msgEl || !confirmBtn) return;

  titleEl.textContent = title;
  msgEl.textContent = message;
  modalConfirmCallback = onConfirm;

  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  newConfirmBtn.addEventListener('click', () => {
    if (typeof modalConfirmCallback === 'function') modalConfirmCallback();
    closeModal();
  });

  modal.classList.remove('hidden');
}

function closeModal() {
  const modal = document.getElementById('confirm-modal');
  if (modal) modal.classList.add('hidden');
  modalConfirmCallback = null;
}

// ====================================================================
// Toast Notification Helper
// ====================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `
    <span>${icon}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
}

// ====================================================================
// Utilities
// ====================================================================
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getCategoryIcon(category) {
  const map = {
    'Food': '🍕',
    'Groceries': '🛒',
    'Rent': '🏠',
    'Utilities': '💡',
    'Travel': '🚗',
    'Entertainment': '🎬',
    'Study': '📚',
    'Settlement': '🤝',
    'Other': '📦'
  };
  return map[category] || '📦';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}

function formatMonthLabel(yyyyMm) {
  if (!yyyyMm || yyyyMm === 'Unknown') return 'Unknown';
  try {
    const parts = yyyyMm.split('-');
    if (parts.length === 2) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const d = new Date(year, monthIdx, 1);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    return yyyyMm;
  } catch (e) {
    return yyyyMm;
  }
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
