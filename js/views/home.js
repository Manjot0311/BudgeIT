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
    this.renderRecentExpenses();
    
    // ← NUOVO: Crea il menu FUORI da #app
    this.createActionMenuInRoot();
    
    this.setupActionMenu();
  },

  // ← NUOVO METODO: Crea il menu nel modals-root (fuori da #app)
  createActionMenuInRoot() {
    let menu = document.getElementById('action-menu');
    
    // Se esiste già, rimuovilo
    if (menu) menu.remove();

    const modalsRoot = document.getElementById('modals-root');
    if (!modalsRoot) return;

    menu = document.createElement('div');
    menu.id = 'action-menu';
    menu.className = 'home-action-menu';
    menu.innerHTML = `
      <button class="home-action-menu-item" onclick="App.switchView('expenses')">
        <span class="home-action-menu-icon">✎</span>
        <span class="home-action-menu-label">Registra nuova spesa</span>
      </button>
      <button class="home-action-menu-item" onclick="App.switchView('reports')">
        <span class="home-action-menu-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;">
            <!-- Documento -->
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            
            <!-- Linee testo -->
            <line x1="9" y1="11" x2="15" y2="11"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
            
            <!-- PDF badge rosso -->
            <rect x="9" y="17" width="6" height="4" rx="0.5" fill="currentColor"></rect>
            <text x="12" y="20.5" text-anchor="middle" font-size="2" font-weight="bold" fill="white">PDF</text>
          </svg>
        </span>
        <span class="home-action-menu-label">Genera Report PDF</span>
      </button>
    `;
    
    modalsRoot.appendChild(menu);
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

        <!-- HERO: numero dominante SENZA emoji -->
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

        <!-- SPESE RECENTI -->
        <div class="recent-expenses-section">
          <div class="recent-expenses-header">
            <h3 class="recent-expenses-title">Spese Recenti</h3>
          </div>
          <div class="recent-expenses-list" id="recent-expenses-list">
            <!-- Riempito dinamicamente -->
          </div>
          <button class="recent-expenses-see-all" onclick="App.switchView('expenses')">
            → Vedi tutte le spese
          </button>
        </div>

        <!-- AZIONI RAPIDE - Stile iPhone Dock -->
        <div class="home-actions-dock">
          <button class="home-action-dock-item" onclick="App.switchView('stats')" title="Statistiche">
            <!-- GRAFICO ANALYTICS - ESATTO COME L'IMMAGINE -->
            <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
              <!-- Trend line con 4 punti -->
              <circle cx="15" cy="50" r="5"></circle>
              <circle cx="40" cy="18" r="5"></circle>
              <circle cx="60" cy="33" r="5"></circle>
              <circle cx="85" cy="5" r="5"></circle>
              <polyline points="15,50 40,18 60,33 85,5"></polyline>
              
              <!-- Bar chart - 4 barre con angoli arrotondati ALLINEATE -->
              <rect x="10" y="65" width="12" height="15" rx="3" ry="3"></rect>
              <rect x="32" y="55" width="12" height="25" rx="3" ry="3"></rect>
              <rect x="54" y="42" width="12" height="38" rx="3" ry="3"></rect>
              <rect x="76" y="28" width="12" height="52" rx="3" ry="3"></rect>
            </svg>
          </button>

          <button class="home-action-dock-center" id="action-menu-btn">
            <span class="home-action-plus">+</span>
          </button>

          <button class="home-action-dock-item" onclick="App.switchView('budget')" title="Budget">
            <!-- BUDGET - MANO CON MONETE E FRECCIA SU - ALLINEATO -->
            <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
              <!-- Freccia su (up arrow) -->
              <path d="M 50 8 L 50 28"></path>
              <polyline points="40 18 50 8 60 18"></polyline>
              
              <!-- Stack di monete (3 rettangoli arrotondati) - ALLINEATO -->
              <rect x="55" y="32" width="35" height="10" rx="3" ry="3"></rect>
              <rect x="55" y="45" width="35" height="10" rx="3" ry="3"></rect>
              <rect x="55" y="58" width="35" height="10" rx="3" ry="3"></rect>
              
              <!-- Cerchio con $ al centro - ALLINEATO -->
              <circle cx="35" cy="55" r="18" stroke-width="5"></circle>
              <text x="35" y="61" text-anchor="middle" font-size="20" font-weight="bold" stroke="none" fill="currentColor">$</text>

            </svg>
          </button>
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

  getRecentExpenses(limit = 5) {
    const expenses = storage.getExpenses();
    return expenses
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  },

  renderRecentExpenses() {
    const listEl = document.getElementById('recent-expenses-list');
    if (!listEl) return;

    const recent = this.getRecentExpenses(5);

    if (!recent.length) {
      listEl.innerHTML = `
        <div class="recent-expenses-empty">
          <p>Nessuna spesa registrata</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = recent.map(expense => {
      const date = toLocalDate(expense.date);
      const timeStr = date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short'
      });

      // ✅ CORRETTO: Estrai emoji SOLO dalla categoria
      const categoryEmoji = expense.category?.match(/[\p{Emoji}]/u)?.[0] || '📦';
      const categoryName = expense.category?.replace(/^[\p{Emoji}]+\s*/u, '') || 'Altro';
      const expenseName = expense.name || 'Spesa';

      return `
        <div class="recent-expense-item">
          <div class="recent-expense-icon">${categoryEmoji}</div>
          <div class="recent-expense-info">
            <div class="recent-expense-name">${App.escapeHtml(expenseName)}</div>
            <div class="recent-expense-category">${App.escapeHtml(categoryName)}</div>
            <div class="recent-expense-date">${timeStr}</div>
          </div>
          <div class="recent-expense-amount">-€${Number(expense.amount || 0).toFixed(2)}</div>
        </div>
      `;
    }).join('');
  },

  setupActionMenu() {
    const btn = document.getElementById('action-menu-btn');
    const menu = document.getElementById('action-menu');

    if (!btn || !menu) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const isOpen = menu.classList.contains('show');
      
      if (isOpen) {
        menu.classList.remove('show');
        btn.classList.remove('open');
        this.removeFullScreenBackdrop();
      } else {
        menu.classList.add('show');
        btn.classList.add('open');
        this.addFullScreenBackdrop();
      }
    });

    // Chiudi il menu cliccando fuori
    document.addEventListener('click', (e) => {
      if (!btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('show');
        btn.classList.remove('open');
        this.removeFullScreenBackdrop();
      }
    });

    // Chiudi il menu cliccando una delle opzioni
    menu.querySelectorAll('.home-action-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        setTimeout(() => {
          menu.classList.remove('show');
          btn.classList.remove('open');
          this.removeFullScreenBackdrop();
        }, 100);
      });
    });
  },

  addFullScreenBackdrop() {
    let backdrop = document.getElementById('fullscreen-backdrop');
    if (backdrop) return;

    backdrop = document.createElement('div');
    backdrop.id = 'fullscreen-backdrop';
    backdrop.className = 'fullscreen-backdrop show';
    document.body.insertBefore(backdrop, document.body.firstChild);

    // Sfoca tutto lo schermo
    const app = document.getElementById('app');
    if (app) app.classList.add('blurred');

    backdrop.addEventListener('click', () => {
      const menu = document.getElementById('action-menu');
      const btn = document.getElementById('action-menu-btn');
      if (menu) menu.classList.remove('show');
      if (btn) btn.classList.remove('open');
      this.removeFullScreenBackdrop();
    });
  },

  removeFullScreenBackdrop() {
    const backdrop = document.getElementById('fullscreen-backdrop');
    const app = document.getElementById('app');

    if (backdrop) {
      backdrop.classList.remove('show');
      setTimeout(() => backdrop.remove(), 300);
    }

    if (app) app.classList.remove('blurred');
  },

  updateStats() {
    const expenses = this.getCurrentMonthExpenses();
    const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

    const totalEl = document.getElementById('home-total');
    const countEl = document.getElementById('home-count');
    const avgEl = document.getElementById('home-avg');

    if (!totalEl || !countEl || !avgEl) return;

    totalEl.textContent = `€${total.toFixed(2)}`;
    countEl.textContent = expenses.length;
    avgEl.textContent = expenses.length ? `€${(total / expenses.length).toFixed(0)}` : '€0';

    this.updateDelta();
    this.updateBudgetIndicator();
  },

  updateDelta() {
    const cur = this.getCurrentMonthExpenses().reduce((s, e) => s + Number(e.amount || 0), 0);
    const prev = this.getPreviousMonthExpenses().reduce((s, e) => s + Number(e.amount || 0), 0);

    const el = document.getElementById('home-delta');
    const icon = document.getElementById('delta-icon');
    const text = document.getElementById('delta-text');

    if (!el || !icon || !text) return;

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

    const indicatorEl = document.getElementById('budget-indicator');
    const percentageEl = document.getElementById('budget-percentage');
    const spentEl = document.getElementById('budget-spent-total');
    const remainingEl = document.getElementById('budget-remaining-total');
    const fill = document.getElementById('budget-progress-fill');

    if (!indicatorEl || !percentageEl || !spentEl || !remainingEl || !fill) return;

    indicatorEl.style.display = 'block';
    percentageEl.textContent = `${pct.toFixed(0)}%`;
    spentEl.textContent = `€${spent.toFixed(2)} spesi`;
    remainingEl.textContent = `€${Math.max(totalBudget - spent, 0).toFixed(2)} disponibili`;

    fill.style.width = `${pct}%`;
    fill.className = 'budget-progress-fill' + (pct >= 100 ? ' danger' : pct >= 80 ? ' warning' : '');
  },

  destroy() {}
};

export default homeView;