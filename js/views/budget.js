import storage from '../storage.js';
import app from '../app.js';

const budgetView = {
  async render() {
    const appEl = document.getElementById('app');
    appEl.innerHTML = this.getHTML();

    this.setupHeader();
    this.populateCategories();
    this.renderBudgetList();
    this.setupListeners();
  },

  getHTML() {
    return `
      <div class="header">
        <div class="header-top">
          <div class="header-top-left">
            <button class="back-button visible" onclick="App.switchView('home')">←</button>
            <div class="header-title">BudgeIT</div>
          </div>
          <button class="header-icon" onclick="App.openSettings()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m-9-9h6m6 0h6"></path>
            </svg>
          </button>
        </div>
        <div class="header-subtitle">Imposta i tuoi limiti</div>
      </div>

      <div class="tabs visible">
        <button class="tab" onclick="App.switchView('expenses')">
          <span class="tab-emoji">💳</span>
          <span>Spese</span>
        </button>
        <button class="tab active" onclick="App.switchView('budget')">
          <span class="tab-emoji">🎯</span>
          <span>Budget</span>
        </button>
        <button class="tab" onclick="App.switchView('stats')">
          <span class="tab-emoji">📊</span>
          <span>Stats</span>
        </button>
      </div>

      <div class="content">
        <div class="section-title">Gestione categorie</div>

        <div class="add-category">
          <input type="text" class="input-field" id="new-category" placeholder="Nuova categoria">
          <button class="btn btn-primary" onclick="App.addCategoryUI()">Aggiungi</button>
        </div>

        <div class="category-pills" id="category-list"></div>

        <div class="section-title" style="margin-top: 40px;">Budget mensili</div>

        <div class="input-group">
          <label class="input-label">Categoria</label>
          <select class="select-field" id="budget-category">
            <option value="">Seleziona categoria</option>
          </select>
        </div>

        <div class="input-group">
          <label class="input-label">Limite mensile (€)</label>
          <input type="number" class="input-field" id="budget-amount" placeholder="0.00" step="0.01" min="0">
        </div>

        <button class="btn btn-primary btn-full" onclick="App.setBudgetUI()">
          Imposta budget
        </button>

        <div class="section-title" style="margin-top: 40px;">Budget attivi</div>
        <div id="budget-list"></div>
      </div>
    `;
  },

  setupHeader() {
    // Header already set in HTML
  },

  populateCategories() {
    const categories = storage.getCategories();
    const budgetSelect = document.getElementById('budget-category');
    budgetSelect.innerHTML = '<option value="">Seleziona categoria</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      budgetSelect.appendChild(opt);
    });

    const list = document.getElementById('category-list');
    list.innerHTML = '';
    categories.forEach(cat => {
      const pill = document.createElement('button');
      pill.className = 'category-pill';
      pill.innerHTML = `
        ${app.escapeHtml(cat)}
        <span class="category-pill-remove" onclick="event.stopPropagation(); App.removeCategoryUI('${app.escapeHtml(cat)}')">×</span>
      `;
      list.appendChild(pill);
    });
  },

  renderBudgetList() {
    const list = document.getElementById('budget-list');
    const budgets = storage.getBudgets();
    const expenses = this.getCurrentMonthExpenses();
    const categories = Object.keys(budgets);

    if (categories.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">—</div>
          <div class="empty-state-text">Nessun budget impostato</div>
          <div class="empty-state-sub">Imposta un budget per iniziare</div>
        </div>
      `;
      return;
    }

    list.innerHTML = categories.map(cat => {
      const budget = budgets[cat];
      const spent = expenses
        .filter(e => e.category === cat)
        .reduce((sum, e) => sum + e.amount, 0);
      
      const percentage = Math.min((spent / budget) * 100, 100);
      const remaining = Math.max(budget - spent, 0);
      
      let fillClass = '';
      if (percentage >= 100) fillClass = 'danger';
      else if (percentage >= 80) fillClass = 'warning';
      
      return `
        <div class="budget-card">
          <div class="budget-header">
            <div class="budget-category">
              <div class="budget-category-icon">${this.getCategoryIcon(cat)}</div>
              <div class="budget-category-name">${app.escapeHtml(cat)}</div>
            </div>
            <div class="budget-amount">€${budget.toFixed(2)}</div>
          </div>
          <div class="budget-progress">
            <div class="budget-bar">
              <div class="budget-fill ${fillClass}" style="width: ${percentage}%"></div>
            </div>
            <div class="budget-info">
              <div class="budget-spent">€${spent.toFixed(2)}</div>
              <div class="budget-remaining">Rimangono €${remaining.toFixed(2)}</div>
            </div>
          </div>
          <div class="budget-actions">
            <button class="btn btn-secondary" onclick="App.openBudgetEdit('${app.escapeHtml(cat)}')">Modifica</button>
          </div>
        </div>
      `;
    }).join('');
  },

  getCurrentMonthExpenses() {
    const now = new Date();
    return storage.getExpenses().filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === now.getMonth() &&
             expDate.getFullYear() === now.getFullYear();
    });
  },

  getCategoryIcon(category) {
    const icons = {
      'Alimentari': '🛒',
      'Trasporti': '🚗',
      'Casa': '🏠',
      'Svago': '🎮',
      'Salute': '💊',
      'Altro': '📦'
    };
    return icons[category] || '📦';
  },

  setupListeners() {
    // Event listeners
  },

  destroy() {
    // Cleanup
  }
};

export default budgetView;
