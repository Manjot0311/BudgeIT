import storage from '../storage.js';
import app from '../app.js';

const homeView = {
  myChart: null,

  async render() {
    const appEl = document.getElementById('app');
    appEl.innerHTML = this.getHTML();

    // Setup header
    this.setupHeader();

    // Hide tabs
    const tabs = document.getElementById('tabs');
    if (tabs) tabs.classList.remove('visible');

    // Update stats
    this.updateStats();

    // Setup event listeners
    this.setupListeners();
  },

  getHTML() {
    return `
      <div class="header">
        <div class="header-top">
          <div class="header-top-left">
            <div class="header-title">BudgeIT</div>
          </div>
          <button class="header-icon" onclick="App.openSettings()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m-9-9h6m6 0h6"></path>
            </svg>
          </button>
        </div>
        <div class="header-subtitle" id="header-subtitle">Overview • ${this.getMonthName()}</div>
      </div>

      <div class="content">
        <!-- Hero Card -->
        <div class="hero-card">
          <div class="hero-card-label">Spese questo mese</div>
          <div class="hero-card-value" id="home-total">€0.00</div>
          <span class="hero-card-delta" id="home-delta">
            <span id="delta-icon">—</span>
            <span id="delta-text">Nessun confronto</span>
          </span>
        </div>

        <!-- Budget Indicator -->
        <div class="budget-indicator" id="budget-indicator" style="display: none;">
          <div class="budget-indicator-header">
            <div class="budget-indicator-label">Budget utilizzato</div>
            <div class="budget-indicator-value" id="budget-percentage">0%</div>
          </div>
          <div class="budget-progress-bar">
            <div class="budget-progress-fill" id="budget-progress-fill" style="width: 0%"></div>
          </div>
          <div class="budget-indicator-info">
            <div class="budget-spent" id="budget-spent-total">€0 spesi</div>
            <div class="budget-remaining" id="budget-remaining-total">€0 disponibili</div>
          </div>
        </div>

        <!-- Metrics -->
        <div class="metrics">
          <div class="metric-pill">
            <div class="metric-label">Transazioni</div>
            <div class="metric-value" id="home-count">0</div>
          </div>
          <div class="metric-pill">
            <div class="metric-label">Media</div>
            <div class="metric-value" id="home-avg">€0</div>
          </div>
        </div>

        <!-- Actions -->
        <div class="actions">
          <button class="action-btn primary" onclick="App.switchView('expenses')">
            <div class="action-btn-label">Aggiungi spesa</div>
            <div class="action-btn-hint">Ci vogliono 5 secondi</div>
          </button>
          <button class="action-btn" onclick="App.switchView('budget')">
            <div class="action-btn-label">Gestisci budget</div>
          </button>
        </div>

        <!-- Quick Access -->
        <div class="quick-access-title">Accesso rapido</div>
        <div class="quick-access">
          <button class="access-item" onclick="App.switchView('expenses')">
            <div class="access-icon">📝</div>
            <div class="access-content">
              <div class="access-label">Tutte le spese</div>
              <div class="access-description">Visualizza e modifica le tue transazioni</div>
            </div>
            <div class="access-arrow">›</div>
          </button>
          <button class="access-item" onclick="App.switchView('stats')">
            <div class="access-icon">📈</div>
            <div class="access-content">
              <div class="access-label">Statistiche</div>
              <div class="access-description">Scopri dove spendi di più</div>
            </div>
            <div class="access-arrow">›</div>
          </button>
          <button class="access-item" onclick="App.switchView('budget')">
            <div class="access-icon">🎯</div>
            <div class="access-content">
              <div class="access-label">Budget per categoria</div>
              <div class="access-description">Tieni tutto sotto controllo</div>
            </div>
            <div class="access-arrow">›</div>
          </button>
        </div>
      </div>
    `;
  },

  setupHeader() {
    const formatted = new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    const capitalised = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    document.getElementById('header-subtitle').textContent = `Overview • ${capitalised}`;
  },

  getMonthName() {
    const date = new Date();
    const formatted = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  },

  getCurrentMonthExpenses() {
    const now = new Date();
    return storage.getExpenses().filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === now.getMonth() &&
             expDate.getFullYear() === now.getFullYear();
    });
  },

  getPreviousMonthExpenses() {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return storage.getExpenses().filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === prevMonth.getMonth() &&
             expDate.getFullYear() === prevMonth.getFullYear();
    });
  },

  updateStats() {
    const expenses = this.getCurrentMonthExpenses();
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const count = expenses.length;
    const avg = count > 0 ? total / count : 0;

    document.getElementById('home-total').textContent = `€${total.toFixed(2)}`;
    document.getElementById('home-count').textContent = count;
    document.getElementById('home-avg').textContent = `€${avg.toFixed(0)}`;

    this.updateDelta();
    this.updateBudgetIndicator();
  },

  updateDelta() {
    const currentExpenses = this.getCurrentMonthExpenses();
    const currentTotal = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    const prevExpenses = this.getPreviousMonthExpenses();
    const prevTotal = prevExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    const deltaEl = document.getElementById('home-delta');
    const iconEl = document.getElementById('delta-icon');
    const textEl = document.getElementById('delta-text');
    
    if (prevTotal === 0) {
      deltaEl.className = 'hero-card-delta';
      iconEl.textContent = '—';
      textEl.textContent = 'Nessun confronto';
      return;
    }
    
    const diff = currentTotal - prevTotal;
    const percentage = ((diff / prevTotal) * 100).toFixed(1);
    
    if (diff > 0) {
      deltaEl.className = 'hero-card-delta negative';
      iconEl.textContent = '↑';
      textEl.textContent = `+${percentage}% vs mese scorso`;
    } else if (diff < 0) {
      deltaEl.className = 'hero-card-delta positive';
      iconEl.textContent = '↓';
      textEl.textContent = `${percentage}% vs mese scorso`;
    } else {
      deltaEl.className = 'hero-card-delta';
      iconEl.textContent = '→';
      textEl.textContent = 'Uguale al mese scorso';
    }
  },

  updateBudgetIndicator() {
    const budgets = storage.getBudgets();
    const expenses = this.getCurrentMonthExpenses();
    
    const totalBudget = Object.values(budgets).reduce((sum, b) => sum + b, 0);
    
    if (totalBudget === 0) {
      document.getElementById('budget-indicator').style.display = 'none';
      return;
    }
    
    document.getElementById('budget-indicator').style.display = 'block';
    
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const percentage = Math.min((totalSpent / totalBudget) * 100, 100);
    const remaining = Math.max(totalBudget - totalSpent, 0);
    
    document.getElementById('budget-percentage').textContent = `${percentage.toFixed(0)}%`;
    document.getElementById('budget-spent-total').textContent = `€${totalSpent.toFixed(2)} spesi`;
    document.getElementById('budget-remaining-total').textContent = `€${remaining.toFixed(2)} disponibili`;
    
    const fillEl = document.getElementById('budget-progress-fill');
    fillEl.style.width = `${percentage}%`;
    
    fillEl.className = 'budget-progress-fill';
    if (percentage >= 100) {
      fillEl.classList.add('danger');
    } else if (percentage >= 80) {
      fillEl.classList.add('warning');
    }
  },

  setupListeners() {
    // Event listeners if needed
  },

  destroy() {
    if (this.myChart) {
      this.myChart.destroy();
      this.myChart = null;
    }
  }
};

export default homeView;
