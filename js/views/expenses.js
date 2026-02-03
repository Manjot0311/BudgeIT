import storage from '../storage.js';

function toDate(value) {
  if (!value) return new Date();
  return new Date(value);
}

function escapeHTML(text = '') {
  return String(text).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

const expensesView = {
  currentMonth: new Date(),
  filterCategory: '',
  filterSort: 'date-desc',

  render() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    appEl.innerHTML = this.getHTML();

    this.setupHeader();
    this.populateCategories();
    this.renderExpenseList();
    this.bindEvents();
  },

  destroy() {
    this.currentMonth = new Date();
    this.filterCategory = '';
    this.filterSort = 'date-desc';
  },

  getHTML() {
    return `
      <div class="header">
        <div class="header-top">
          <div class="header-top-left">
            <button class="back-button visible" data-action="back">←</button>
            <div class="header-title">BudgeIT</div>
          </div>
          <button class="header-icon" data-action="settings">☰</button>
        </div>
        <div class="header-subtitle">Registra e consulta le spese</div>
      </div>

      <div class="tabs visible">
        <button class="tab active" data-nav="expenses">💳 Spese</button>
        <button class="tab" data-nav="budget">🎯 Budget</button>
        <button class="tab" data-nav="stats">📊 Stats</button>
      </div>

      <div class="content expenses-view">
        <div class="section-title">Nuova spesa</div>

        <input id="expense-name" class="input-field" placeholder="Nome spesa">
        <input id="expense-amount" class="input-field" type="number" step="0.01" placeholder="Importo">
        <select id="expense-category" class="select-field"></select>

        <!-- Data: campo allineato con gli altri input -->
        <input id="expense-date" class="input-field" type="date">

        <button class="btn btn-primary btn-full" data-action="save-expense">
          Salva spesa
        </button>

        <div class="section-title" style="margin-top:40px;">Le tue spese</div>

        <div class="month-selector">
          <button class="month-btn" data-month="-1">‹</button>
          <div id="current-month" class="month-display"></div>
          <button class="month-btn" data-month="1">›</button>
        </div>

        <div class="filters">
          <select id="filter-category" class="select-field"></select>
          <select id="filter-sort" class="select-field">
            <option value="date-desc">Data ↓</option>
            <option value="date-asc">Data ↑</option>
            <option value="amount-desc">Importo ↓</option>
            <option value="amount-asc">Importo ↑</option>
          </select>
          <button class="btn btn-secondary" data-action="apply-filters">Applica</button>
          <button class="btn btn-secondary" data-action="reset-filters">Reset</button>
        </div>

        <div id="expense-list" class="expense-list"></div>
      </div>
    `;
  },

  setupHeader() {
    const label = this.currentMonth.toLocaleDateString('it-IT', {
      month: 'long',
      year: 'numeric'
    });
    const el = document.getElementById('current-month');
    if (el) el.textContent = label.charAt(0).toUpperCase() + label.slice(1);

    // Data precompilata = oggi
    const dateEl = document.getElementById('expense-date');
    if (dateEl) dateEl.valueAsDate = new Date();
  },

  populateCategories() {
    const categories = storage.getCategories();
    const categoryEmojis = storage.getCategoryEmojis() || {};

    const expSel = document.getElementById('expense-category');
    if (expSel) {
      expSel.innerHTML = '<option value="">Categoria</option>';
      categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        expSel.appendChild(opt);
      });
    }

    const filterSel = document.getElementById('filter-category');
    if (filterSel) {
      filterSel.innerHTML = '<option value="">Tutte</option>';
      categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        filterSel.appendChild(opt);
      });
    }
  },

  getMonthExpenses() {
    return storage.getExpenses().filter(e => {
      const d = toDate(e.date);
      return (
        d.getMonth() === this.currentMonth.getMonth() &&
        d.getFullYear() === this.currentMonth.getFullYear()
      );
    });
  },

  renderExpenseList() {
    const list = document.getElementById('expense-list');
    if (!list) return;

    let expenses = this.getMonthExpenses();

    if (this.filterCategory) {
      expenses = expenses.filter(e => e.category === this.filterCategory);
    }

    expenses.sort((a, b) => {
      switch (this.filterSort) {
        case 'amount-asc':
          return (Number(a.amount) || 0) - (Number(b.amount) || 0);
        case 'amount-desc':
          return (Number(b.amount) || 0) - (Number(a.amount) || 0);
        case 'date-asc':
          return toDate(a.date) - toDate(b.date);
        default:
          return toDate(b.date) - toDate(a.date);
      }
    });

    if (!expenses.length) {
      list.innerHTML = `<div class="empty-state">Nessuna spesa</div>`;
      return;
    }

    const categoryEmojis = storage.getCategoryEmojis() || {};

    list.innerHTML = expenses.map(e => `
      <div class="expense-item">
        <div>${categoryEmojis[e.category] || this.getCategoryIcon(e.category)}</div>
        <div class="expense-info">
          <div>${escapeHTML(e.name)}</div>
          <small>${escapeHTML(e.category)}</small>
        </div>
        <div>€${(Number(e.amount) || 0).toFixed(2)}</div>
        <button class="expense-delete" data-delete="${e.id}">×</button>
      </div>
    `).join('');
  },

  bindEvents() {
    const root = document.getElementById('app');
    if (!root) return;

    root.onclick = (e) => {
      const btn = e.target.closest('[data-action],[data-nav],[data-delete],[data-month]');
      if (!btn) return;

      if (btn.dataset.nav) {
        window.App?.switchView(btn.dataset.nav);
      }

      if (btn.dataset.action === 'back') {
        window.App?.switchView('home');
      }

      if (btn.dataset.action === 'settings') {
        window.App?.openSettings();
      }

      if (btn.dataset.action === 'save-expense') {
        window.App?.saveExpenseUI();
      }

      if (btn.dataset.action === 'apply-filters') {
        this.filterCategory = document.getElementById('filter-category')?.value || '';
        this.filterSort = document.getElementById('filter-sort')?.value || 'date-desc';
        this.renderExpenseList();
      }

      if (btn.dataset.action === 'reset-filters') {
        this.filterCategory = '';
        this.filterSort = 'date-desc';
        document.getElementById('filter-category').value = '';
        document.getElementById('filter-sort').value = 'date-desc';
        this.renderExpenseList();
      }

      if (btn.dataset.delete) {
        window.App?.deleteExpenseUI(btn.dataset.delete);
      }

      if (btn.dataset.month) {
        this.currentMonth.setMonth(
          this.currentMonth.getMonth() + Number(btn.dataset.month)
        );
        this.setupHeader();
        this.renderExpenseList();
      }
    };
  },

  getCategoryIcon(cat) {
    return {
      Alimentari: '🛒',
      Trasporti: '🚗',
      Casa: '🏠',
      Svago: '🎮',
      Salute: '💊',
      Altro: '📦'
    }[cat] || '📦';
  }
};

export default expensesView;