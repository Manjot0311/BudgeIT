import storage from '../storage.js';

function toLocalDate(value) {
  if (!value) return new Date();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

const homeView = {
  myChart: null,

  async render() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    appEl.innerHTML = this.getHTML();
    this.setupHeader();

    const tabs = document.getElementById('tabs');
    if (tabs) tabs.classList.remove('visible');

    this.updateStats();
  },

  getHTML() {
    return `
      <div class="header">
        <div class="header-top">
          <div class="header-top-left">
            <div class="header-title">BudgeIT</div>
          </div>
          <button class="header-icon" onclick="App.openSettings()">
            ☰
          </button>
        </div>
        <div class="header-subtitle" id="header-subtitle">
          Overview • ${this.getMonthName()}
        </div>
      </div>

      <div class="content">

        <!-- HERO: numero dominante, gradient esistente -->
        <div class="hero-card">
          <div class="hero-card-label">Spese questo mese</div>
          <div class="hero-card-value" id="home-total">€0.00</div>
          <div class="hero-card-delta" id="home-delta">
            <span id="delta-icon">—</span>
            <span id="delta-text">Nessun confronto</span>
          </div>
        </div>

        <!-- BUDGET: usa design system esistente -->
        <div class="budget-indicator" id="budget-indicator" style="display:none;">
          <div class="budget-indicator-header">
            <div class="budget-indicator-label">Budget utilizzato</div>
            <div class="budget-indicator-value" id="budget-percentage">0%</div>
          </div>
          <div class="budget-progress-bar">
            <div class="budget-progress-fill" id="budget-progress-fill"></div>
          </div>
          <div class="budget-indicator-info">
            <div id="budget-spent-total">€0 spesi</div>
            <div id="budget-remaining-total">€0 disponibili</div>
          </div>
        </div>

        <!-- METRICHE: due card discrete affiancate -->
        <div class="metrics metrics--compact">
          <div class="metric-card metric-card--minimal">
            <div class="metric-value" id="home-count">0</div>
            <div class="metric-label">transazioni</div>
          </div>
          <div class="metric-card metric-card--minimal">
            <div class="metric-value" id="home-avg">€0</div>
            <div class="metric-label">in media</div>
          </div>
        </div>

        <!-- AZIONE PRIMARIA -->
        <button class="btn btn-primary btn-full" onclick="App.switchView('expenses')">
          Aggiungi spesa
        </button>

        <!-- AZIONI SECONDARIE: lista pulita stile iOS -->
        <div class="quick-actions">
          <div class="quick-action-item" onclick="App.switchView('expenses')">
            <span class="quick-action-label">Spese</span>
            <span class="quick-action-chevron">›</span>
          </div>
          <div class="quick-action-item" onclick="App.switchView('stats')">
            <span class="quick-action-label">Statistiche</span>
            <span class="quick-action-chevron">›</span>
          </div>
          <div class="quick-action-item" onclick="App.switchView('budget')">
            <span class="quick-action-label">Budget</span>
            <span class="quick-action-chevron">›</span>
          </div>
        </div>

      </div>
    `;
  },

  setupHeader() {
    const formatted = new Date().toLocaleDateString('it-IT', {
      month: 'long',
      year: 'numeric'
    });
    const el = document.getElementById('header-subtitle');
    if (el) el.textContent = `Overview • ${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`;
  },

  getMonthName() {
    const d = new Date();
    const f = d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    return f.charAt(0).toUpperCase() + f.slice(1);
  },

  getCurrentMonthExpenses() {
    const now = new Date();
    return storage.getExpenses().filter(e => {
      const d = toLocalDate(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  },

  getPreviousMonthExpenses() {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return storage.getExpenses().filter(e => {
      const d = toLocalDate(e.date);
      return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear();
    });
  },

  updateStats() {
    const expenses = this.getCurrentMonthExpenses();
    const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

    document.getElementById('home-total').textContent = `€${total.toFixed(2)}`;
    document.getElementById('home-count').textContent = expenses.length;
    document.getElementById('home-avg').textContent =
      expenses.length ? `€${(total / expenses.length).toFixed(0)}` : '€0';

    this.updateDelta();
    this.updateBudgetIndicator();
  },

  updateDelta() {
    const cur = this.getCurrentMonthExpenses().reduce((s, e) => s + Number(e.amount || 0), 0);
    const prev = this.getPreviousMonthExpenses().reduce((s, e) => s + Number(e.amount || 0), 0);

    const el = document.getElementById('home-delta');
    const icon = document.getElementById('delta-icon');
    const text = document.getElementById('delta-text');

    if (!prev) {
      el.className = 'hero-card-delta';
      icon.textContent = '—';
      text.textContent = 'Nessun confronto';
      return;
    }

    const diff = ((cur - prev) / prev) * 100;
    el.className = `hero-card-delta ${diff > 0 ? 'negative' : 'positive'}`;
    icon.textContent = diff > 0 ? '↑' : '↓';
    text.textContent = `${diff.toFixed(1)}% vs mese scorso`;
  },

  updateBudgetIndicator() {
    const budgets = storage.getBudgets();
    const expenses = this.getCurrentMonthExpenses();

    const totalBudget = Object.values(budgets).reduce((s, b) => s + Number(b || 0), 0);
    if (!totalBudget) return;

    const spent = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const pct = Math.min((spent / totalBudget) * 100, 100);

    document.getElementById('budget-indicator').style.display = 'block';
    document.getElementById('budget-percentage').textContent = `${pct.toFixed(0)}%`;
    document.getElementById('budget-spent-total').textContent = `€${spent.toFixed(2)} spesi`;
    document.getElementById('budget-remaining-total').textContent =
      `€${Math.max(totalBudget - spent, 0).toFixed(2)} disponibili`;

    const fill = document.getElementById('budget-progress-fill');
    fill.style.width = `${pct}%`;
    fill.className = 'budget-progress-fill' + (pct >= 100 ? ' danger' : pct >= 80 ? ' warning' : '');
  },

  destroy() {}
};

export default homeView;