import storage from '../storage.js';

function toLocalDate(value) {
  if (!value) return new Date();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
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

const budgetView = {
  async render() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    appEl.innerHTML = this.getHTML();
    this.populateCategories();
    this.renderBudgetList();
  },

  getHTML() {
    return `
      <div class="header">
        <div class="header-top">
          <div class="header-top-left">
            <button class="back-button visible" onclick="App.switchView('home')">←</button>
            <div class="header-title">BudgeIT</div>
          </div>
          <button class="header-icon" onclick="App.openSettings()">☰</button>
        </div>
        <div class="header-subtitle">Imposta i tuoi limiti</div>
      </div>

      <div class="tabs visible">
        <button class="tab" onclick="App.switchView('expenses')">💳 Spese</button>
        <button class="tab active">🎯 Budget</button>
        <button class="tab" onclick="App.switchView('stats')">📊 Stats</button>
      </div>

      <div class="content">

        <div class="budget-section">
          <div class="budget-section-header">
            <div class="budget-section-title">Categorie</div>
            <button class="budget-section-action" onclick="App.toggleCategoryForm()">
              <span id="category-toggle-icon">＋</span>
            </button>
          </div>

          <div class="budget-category-form" id="category-form" style="display:none;">
            <input id="new-category-emoji" class="input-field input-field--inline emoji-input" placeholder="📦" maxlength="2">
            <input id="new-category" class="input-field input-field--inline" placeholder="Nome categoria">
            <button class="btn btn-secondary btn-sm" onclick="App.addCategoryUI()">Aggiungi</button>
          </div>

          <div class="budget-category-list" id="category-list"></div>
        </div>

        <div class="budget-section">
          <div class="budget-section-title">Imposta budget</div>

          <div class="budget-form">
            <div class="ios-select-trigger" onclick="App.showCategoryPicker()">
              <span id="selected-category-display" class="ios-select-value" data-value="">
                Seleziona categoria
              </span>
              <span class="ios-select-chevron">›</span>
            </div>

            <div class="budget-form-inline">
              <input type="number" id="budget-amount" class="input-field input-field--inline" placeholder="Importo mensile">
              <button class="btn btn-primary" onclick="App.setBudgetUI()">Imposta</button>
            </div>
          </div>
        </div>

        <div class="budget-section">
          <div class="budget-section-title">Budget attivi</div>
          <div id="budget-list"></div>
        </div>

      </div>
    `;
  },

  populateCategories() {
    const categories = storage.getCategories();
    const list = document.getElementById('category-list');
    if (!list) return;

    if (!categories.length) {
      list.innerHTML = `<div class="budget-empty-hint">Nessuna categoria creata</div>`;
      return;
    }

    list.innerHTML = categories.map(name => {
      const parts = name.split(' ');
      const emoji = parts[0];
      const label = parts.slice(1).join(' ');

      return `
        <div class="budget-category-item">
          <div class="budget-category-item-content">
            <span class="budget-category-item-icon">${emoji}</span>
            <span class="budget-category-item-name">${escapeHTML(label)}</span>
          </div>
          <button
            class="budget-category-item-remove"
            onclick="App.removeCategoryUI('${escapeHTML(name)}')"
          >×</button>
        </div>
      `;
    }).join('');
  },

  renderBudgetList() {
    const list = document.getElementById('budget-list');
    if (!list) return;

    const budgets = storage.getBudgets();
    const expenses = this.getCurrentMonthExpenses();
    const categories = Object.keys(budgets);

    if (!categories.length) {
      list.innerHTML = `<div class="empty-state">Nessun budget impostato</div>`;
      return;
    }

    list.innerHTML = categories.map(cat => {
      const budget = budgets[cat];
      const spent = expenses
        .filter(e => e.category === cat)
        .reduce((s, e) => s + Number(e.amount || 0), 0);

      const pct = budget ? Math.min((spent / budget) * 100, 100) : 0;

      return `
        <div class="budget-card-clean" onclick="App.editBudgetUI('${escapeHTML(cat)}')">
          <div class="budget-card-header">
            <span>${escapeHTML(cat)}</span>
            <span>€${budget.toFixed(0)}</span>
          </div>
          <div class="budget-card-progress">
            <div class="budget-card-fill" style="width:${pct}%"></div>
          </div>
          <div class="budget-card-footer">
            €${spent.toFixed(2)} spesi
          </div>
        </div>
      `;
    }).join('');
  },

  getCurrentMonthExpenses() {
    const now = new Date();
    return storage.getExpenses().filter(e => {
      const d = toLocalDate(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }
};

export default budgetView;
