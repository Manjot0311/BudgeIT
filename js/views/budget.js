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
            <button class="header-icon" onclick="App.openSettings()">
            ☰
          </button>
        </div>
        <div class="header-subtitle">Imposta i tuoi limiti</div>
      </div>

      <div class="tabs visible">
        <button class="tab" onclick="App.switchView('expenses')">
          <span class="tab-emoji">💳</span>
          <span>Spese</span>
        </button>
        <button class="tab active">
          <span class="tab-emoji">🎯</span>
          <span>Budget</span>
        </button>
        <button class="tab" onclick="App.switchView('stats')">
          <span class="tab-emoji">📊</span>
          <span>Stats</span>
        </button>
      </div>

      <div class="content">
        
        <!-- SEZIONE CATEGORIE: più pulita e integrata -->
        <div class="budget-section">
          <div class="budget-section-header">
            <div class="budget-section-title">Categorie</div>
            <button class="budget-section-action" onclick="App.toggleCategoryForm()">
              <span id="category-toggle-icon">+</span>
            </button>
          </div>
          
          <!-- Form add categoria: nascosto di default -->
          <div class="budget-category-form" id="category-form" style="display:none;">
            <input type="text" class="input-field input-field--inline" id="new-category" placeholder="Nome categoria">
            <!-- CORREZIONE BUG #6: Campo per emoji -->
            <input type="text" class="input-field input-field--inline" id="new-category-emoji" placeholder="Emoji" maxlength="2" style="max-width: 80px; text-align: center; font-size: 24px;">
            <button class="btn btn-secondary btn-sm" onclick="App.addCategoryUI()">Aggiungi</button>
          </div>

          <!-- Lista categorie: lista pulita, non pills -->
          <div class="budget-category-list" id="category-list"></div>
        </div>

        <!-- SEZIONE IMPOSTA BUDGET: form più minimal con iOS picker -->
        <div class="budget-section">
          <div class="budget-section-title">Imposta budget</div>
          
          <div class="budget-form">
            <!-- iOS-style select trigger -->
            <div class="ios-select-trigger" onclick="App.showCategoryPicker()">
              <span id="selected-category-display" class="ios-select-value" data-value="">Seleziona categoria</span>
              <span class="ios-select-chevron">›</span>
            </div>
            
            <div class="budget-form-inline">
              <input type="number" class="input-field input-field--inline" id="budget-amount" placeholder="Importo mensile" step="0.01" min="0">
              <button class="btn btn-primary" onclick="App.setBudgetUI()">Imposta</button>
            </div>
          </div>
        </div>

        <!-- SEZIONE BUDGET ATTIVI: card più pulite -->
        <div class="budget-section">
          <div class="budget-section-title">Budget attivi</div>
          <div id="budget-list"></div>
        </div>

      </div>
    `;
  },

  populateCategories() {
    const categories = storage.getCategories();
    const categoryEmojis = storage.getCategoryEmojis() || {};

    // Popola lista categorie (non pills)
    const list = document.getElementById('category-list');
    if (list) {
      if (!categories.length) {
        list.innerHTML = `
          <div class="budget-empty-hint">
            Nessuna categoria creata
          </div>
        `;
        return;
      }

      list.innerHTML = categories.map(cat => `
        <div class="budget-category-item">
          <div class="budget-category-item-content">
            <span class="budget-category-item-icon">${categoryEmojis[cat] || this.getCategoryIcon(cat)}</span>
            <span class="budget-category-item-name">${escapeHTML(cat)}</span>
          </div>
          <button class="budget-category-item-remove" onclick="App.removeCategoryUI('${escapeHTML(cat)}')">
            ×
          </button>
        </div>
      `).join('');
    }
  },

  // iOS-style category picker
  showCategoryPicker() {
    const categories = storage.getCategories();
    const categoryEmojis = storage.getCategoryEmojis() || {};
    
    if (!categories.length) {
      alert('Crea prima una categoria');
      return;
    }

    // Crea overlay
    const overlay = document.createElement('div');
    overlay.className = 'ios-picker-overlay';
    overlay.innerHTML = `
      <div class="ios-picker-modal">
        <div class="ios-picker-header">
          <button class="ios-picker-cancel">Annulla</button>
          <div class="ios-picker-title">Seleziona categoria</div>
          <button class="ios-picker-done">Fine</button>
        </div>
        <div class="ios-picker-list">
          ${categories.map(cat => `
            <div class="ios-picker-item" data-value="${escapeHTML(cat)}">
              <span class="ios-picker-item-icon">${categoryEmojis[cat] || this.getCategoryIcon(cat)}</span>
              <span class="ios-picker-item-name">${escapeHTML(cat)}</span>
              <span class="ios-picker-item-check">✓</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Event listeners
    const closeOverlay = () => overlay.remove();
    
    overlay.querySelector('.ios-picker-cancel').addEventListener('click', closeOverlay);
    overlay.querySelector('.ios-picker-done').addEventListener('click', () => {
      const selected = overlay.querySelector('.ios-picker-item.selected');
      if (selected) {
        const categoryName = selected.dataset.value;
        const displayEl = document.getElementById('selected-category-display');
        displayEl.textContent = categoryName;
        displayEl.dataset.value = categoryName;
      }
      closeOverlay();
    });
    
    // Click su item per selezionare
    overlay.querySelectorAll('.ios-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        overlay.querySelectorAll('.ios-picker-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
      });
    });
    
    // Click su overlay per chiudere
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });
    
    // Anima entrata
    setTimeout(() => overlay.classList.add('active'), 10);
  },

  renderBudgetList() {
    const list = document.getElementById('budget-list');
    if (!list) return;

    const budgets = storage.getBudgets();
    const expenses = this.getCurrentMonthExpenses();
    const validCategories = storage.getCategories();
    const categoryEmojis = storage.getCategoryEmojis() || {};

    const categories = Object.keys(budgets).filter(cat => validCategories.includes(cat));

    if (!categories.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">—</div>
          <div class="empty-state-text">Nessun budget impostato</div>
          <div class="empty-state-sub">Seleziona una categoria e imposta un limite</div>
        </div>
      `;
      return;
    }

    list.innerHTML = categories.map(cat => {
      const budget = budgets[cat];
      const spent = expenses.filter(e => e.category === cat).reduce((s, e) => s + (Number(e.amount) || 0), 0);

      const pct = (budget && budget > 0) ? Math.min((spent / budget) * 100, 100) : 0;
      const remaining = (budget && budget > 0) ? Math.max(budget - spent, 0) : 0;

      let cls = '';
      if (pct >= 100) cls = 'danger';
      else if (pct >= 80) cls = 'warning';

      return `
        <div class="budget-card-clean" onclick="App.editBudgetUI('${escapeHTML(cat)}')">
          <div class="budget-card-header">
            <div class="budget-card-info">
              <span class="budget-card-icon">${categoryEmojis[cat] || this.getCategoryIcon(cat)}</span>
              <span class="budget-card-name">${escapeHTML(cat)}</span>
            </div>
            <div class="budget-card-limit">€${(budget || 0).toFixed(0)}</div>
          </div>

          <div class="budget-card-progress">
            <div class="budget-card-bar">
              <div class="budget-card-fill ${cls}" style="width:${pct}%"></div>
            </div>
          </div>

          <div class="budget-card-footer">
            <span class="budget-card-spent">€${spent.toFixed(2)} spesi</span>
            <span class="budget-card-remaining">€${remaining.toFixed(2)} rimangono</span>
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
  },

  getCategoryIcon(cat) {
    const map = {
      Alimentari: '🛒',
      Trasporti: '🚗',
      Casa: '🏠',
      Svago: '🎮',
      Salute: '💊',
      Altro: '📦'
    };
    return map[cat] || '📦';
  }
};

export default budgetView;