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

        <div class="budget-section">
          <div class="budget-section-header">
            <div class="budget-section-title">Categorie</div>
            <button class="budget-section-action" onclick="App.toggleCategoryForm()">+</button>
          </div>

          <div class="budget-category-form" id="category-form" style="display:none;">
            <input type="text" class="input-field input-field--inline emoji-input" id="new-category-emoji" placeholder="📦" maxlength="2">
            <input type="text" class="input-field input-field--inline" id="new-category" placeholder="Nome categoria">
            <button class="btn btn-secondary btn-sm" onclick="App.addCategoryUI()">Aggiungi</button>
          </div>

          <div class="budget-category-list" id="category-list"></div>
        </div>

        <div class="budget-section">
          <div class="budget-section-title">Imposta budget</div>

          <div class="budget-form">
            <div class="ios-select-trigger" onclick="App.showCategoryPicker()">
              <span id="selected-category-display" class="ios-select-value" data-value=""></span>
              <span class="ios-select-chevron">›</span>
            </div>

            <div class="budget-form-inline">
              <input type="number" class="input-field input-field--inline" id="budget-amount" placeholder="Importo mensile" step="0.01" min="0">
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

  getCategoryIcon(cat) {
    const map = {
      Alimentari: '🛒',
      Trasporti: '🚗',
      Casa: '🏠',
      Svago: '🎮',
      Salute: '💊',
      Ristoranti: '🍽️',
      Shopping: '🛍️',
      Viaggi: '✈️',
      Altro: '📦'
    };
    return map[cat] || '📦';
  }
};

export default budgetView;
