import storage from '../storage.js';
import app from '../app.js';
import router from '../router.js';

const expensesView = {
  currentMonth: new Date(),
  filterCategory: '',
  filterSort: 'date-desc',

  async render() {
    const appEl = document.getElementById('app');
    appEl.innerHTML = this.getHTML();

    this.setupHeader();
    this.populateCategories();
    this.renderExpenseList();
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
        <div class="header-subtitle">Gestisci le tue transazioni</div>
      </div>

      <div class="tabs visible">
        <button class="tab active" onclick="App.switchView('expenses')">
          <span class="tab-emoji">💳</span>
          <span>Spese</span>
        </button>
        <button class="tab" onclick="App.switchView('budget')">
          <span class="tab-emoji">🎯</span>
          <span>Budget</span>
        </button>
        <button class="tab" onclick="App.switchView('stats')">
          <span class="tab-emoji">📊</span>
          <span>Stats</span>
        </button>
      </div>

      <div class="content">
        <div class="section-title">Registra una spesa</div>

        <div class="input-group">
          <label class="input-label">Nome spesa</label>
          <input type="text" class="input-field" id="expense-name" placeholder="es. Spesa al supermercato">
        </div>

        <div class="input-group">
          <label class="input-label">Importo (€)</label>
          <input type="number" class="input-field" id="expense-amount" placeholder="0.00" step="0.01" min="0">
        </div>

        <div class="input-group">
          <label class="input-label">Categoria</label>
          <select class="select-field" id="expense-category">
            <option value="">Seleziona una categoria</option>
          </select>
        </div>

        <div class="input-group">
          <label class="input-label">Data</label>
          <input type="date" class="input-field" id="expense-date" onclick="App.openCalendarPicker('expense-date')">
        </div>

        <div class="input-group">
          <label class="input-label">Note (opzionale)</label>
          <textarea class="textarea-field" id="expense-notes" placeholder="Aggiungi dettagli..."></textarea>
        </div>

        <button class="btn btn-primary btn-full" onclick="App.saveExpenseUI()">
          Salva spesa
        </button>

        <div class="section-title" style="margin-top: 40px;">Le tue spese</div>

        <div class="month-selector">
          <button class="month-btn" onclick="App.changeExpenseMonth(-1)">‹</button>
          <div class="month-display" id="current-month">Gennaio 2024</div>
          <button class="month-btn" onclick="App.changeExpenseMonth(1)">›</button>
        </div>

        <div class="filters">
          <div class="filter-row">
            <div>
              <label class="input-label">Categoria</label>
              <select class="select-field" id="filter-category">
                <option value="">Tutte</option>
              </select>
            </div>
            <div>
              <label class="input-label">Ordina per</label>
              <select class="select-field" id="filter-sort">
                <option value="date-desc">Data (più recenti)</option>
                <option value="date-asc">Data (meno recenti)</option>
                <option value="amount-desc">Importo (maggiore)</option>
                <option value="amount-asc">Importo (minore)</option>
              </select>
            </div>
          </div>
          <div class="filter-actions">
            <button class="btn btn-secondary" onclick="App.applyExpenseFilters()">Applica</button>
            <button class="btn btn-secondary" onclick="App.clearExpenseFilters()">Reset</button>
          </div>
        </div>

        <div class="expense-list" id="expense-list"></div>
      </div>
    `;
  },

  setupHeader() {
    const formatted = this.currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    const capitalised = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    document.getElementById('current-month').textContent = capitalised;
    document.getElementById('expense-date').valueAsDate = new Date();
  },

  populateCategories() {
    const categories = storage.getCategories();
    
    const expenseSelect = document.getElementById('expense-category');
    expenseSelect.innerHTML = '<option value="">Seleziona una categoria</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      expenseSelect.appendChild(opt);
    });

    const filterSelect = document.getElementById('filter-category');
    filterSelect.innerHTML = '<option value="">Tutte</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      filterSelect.appendChild(opt);
    });
  },

  getMonthExpenses() {
    return storage.getExpenses().filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === this.currentMonth.getMonth() &&
             expDate.getFullYear() === this.currentMonth.getFullYear();
    });
  },

  renderExpenseList() {
    const list = document.getElementById('expense-list');
    let expenses = this.getMonthExpenses();

    this.filterCategory = document.getElementById('filter-category')?.value || '';
    this.filterSort = document.getElementById('filter-sort')?.value || 'date-desc';

    if (this.filterCategory) {
      expenses = expenses.filter(e => e.category === this.filterCategory);
    }

    expenses.sort((a, b) => {
      switch (this.filterSort) {
        case 'date-desc':
          return new Date(b.date) - new Date(a.date);
        case 'date-asc':
          return new Date(a.date) - new Date(b.date);
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        default:
          return new Date(b.date) - new Date(a.date);
      }
    });

    if (expenses.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">—</div>
          <div class="empty-state-text">Nessuna spesa registrata</div>
          <div class="empty-state-sub">Inizia aggiungendo la tua prima spesa</div>
        </div>
      `;
      return;
    }

    list.innerHTML = expenses.map(exp => {
      const date = new Date(exp.date);
      const formattedDate = date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
      
      return `
        <div class="expense-item">
          <div class="expense-info">
            <div class="expense-icon">${this.getCategoryIcon(exp.category)}</div>
            <div class="expense-details">
              <div class="expense-name">${app.escapeHtml(exp.name)}</div>
              <div class="expense-meta">
                <span>${app.escapeHtml(exp.category)}</span>
                <span>•</span>
                <span>${formattedDate}</span>
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center;">
            <div class="expense-amount">€${exp.amount.toFixed(2)}</div>
            <button class="expense-delete" onclick="App.deleteExpenseUI('${exp.id}')">×</button>
          </div>
        </div>
      `;
    }).join('');
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

export default expensesView;
