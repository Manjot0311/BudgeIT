import storage from '../storage.js';

/* ===================== HELPERS ===================== */
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

/**
 * Separa l'emoji dal nome della categoria.
 * Es: "📦 Spese" → { emoji: "📦", label: "Spese" }
 * Se non c'è emoji restituisce un fallback.
 */
function splitCategory(cat = '') {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u;
  const match = cat.match(emojiRegex);
  if (match) {
    return {
      emoji: match[0].trim(),
      label: cat.replace(emojiRegex, '').trim()
    };
  }
  // Categoria senza emoji (es. categorie di default): usa getCategoryIcon di App
  return {
    emoji: window.App?.getCategoryIcon(cat) || '🏷️',
    label: cat
  };
}

/* ===================== VIEW ===================== */
const expensesView = {
  currentMonth:  new Date(),
  filterCategory: '',
  filterSort:    'date-desc',

  // ── mount ──────────────────────────────────────────
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
    this.currentMonth   = new Date();
    this.filterCategory = '';
    this.filterSort     = 'date-desc';
  },

  // ── template ───────────────────────────────────────
  getHTML() {
    return `
      <!-- ── header ── -->
      <div class="header">
        <div class="header-top">
          <div class="header-top-left">
            <button class="back-button visible" data-action="back">&larr;</button>
            <div class="header-title">BudgeIT</div>
          </div>
          <button class="header-icon" data-action="settings">&#x2630;</button>
        </div>
        <div class="header-subtitle">Registra e consulta le spese</div>
      </div>

      <!-- ── tabs ── -->
      <div class="tabs visible">
        <button class="tab active" data-nav="expenses">&#x1F4B3; Spese</button>
        <button class="tab"        data-nav="budget">&#x1F3AF; Budget</button>
        <button class="tab"        data-nav="stats">&#x1F4CA; Stats</button>
      </div>

      <!-- ── contenuto ── -->
      <div class="content">

        <!-- nuova spesa -->
        <div class="section-title">Nuova spesa</div>
        <input  id="expense-name"     class="input-field"  placeholder="Nome spesa">
        <input  id="expense-amount"   class="input-field"  type="number" step="0.01" placeholder="Importo">
        <select id="expense-category" class="select-field"></select>
        <input  id="expense-date"     class="input-field"  type="date">
        <button class="btn btn-primary btn-full" data-action="save-expense">Salva spesa</button>

        <!-- lista spese -->
        <div class="section-title" style="margin-top:40px;">Le tue spese</div>

        <div class="month-selector">
          <button class="month-btn" data-month="-1">&#x2039;</button>
          <div id="current-month" class="month-display"></div>
          <button class="month-btn" data-month="1">&#x203A;</button>
        </div>

        <div class="filters">
          <select id="filter-category" class="select-field"></select>
          <select id="filter-sort"     class="select-field">
            <option value="date-desc">Data &#x2193;</option>
            <option value="date-asc">Data &#x2191;</option>
            <option value="amount-desc">Importo &#x2193;</option>
            <option value="amount-asc">Importo &#x2191;</option>
          </select>
          <button class="btn btn-secondary" data-action="apply-filters">Applica</button>
          <button class="btn btn-secondary" data-action="reset-filters">Reset</button>
        </div>

        <div id="expense-list" class="expense-list"></div>
      </div>
    `;
  },

  // ── setup iniziale ─────────────────────────────────
  setupHeader() {
    const label = this.currentMonth.toLocaleDateString('it-IT', {
      month: 'long',
      year:  'numeric'
    });
    const el = document.getElementById('current-month');
    if (el) el.textContent = label.charAt(0).toUpperCase() + label.slice(1);

    // Data precompilata = oggi
    const dateEl = document.getElementById('expense-date');
    if (dateEl) dateEl.valueAsDate = new Date();
  },

  populateCategories() {
    const categories = storage.getCategories();

    // select "Nuova spesa"
    const expSel = document.getElementById('expense-category');
    if (expSel) {
      expSel.innerHTML = '<option value="">Categoria</option>';
      categories.forEach(c => {
        const opt      = document.createElement('option');
        opt.value      = c;
        opt.textContent = c;
        expSel.appendChild(opt);
      });
    }

    // select filtro
    const filterSel = document.getElementById('filter-category');
    if (filterSel) {
      filterSel.innerHTML = '<option value="">Tutte</option>';
      categories.forEach(c => {
        const opt      = document.createElement('option');
        opt.value      = c;
        opt.textContent = c;
        filterSel.appendChild(opt);
      });
    }
  },

  // ── dati ───────────────────────────────────────────
  getMonthExpenses() {
    return storage.getExpenses().filter(e => {
      const d = toDate(e.date);
      return (
        d.getMonth()    === this.currentMonth.getMonth()  &&
        d.getFullYear() === this.currentMonth.getFullYear()
      );
    });
  },

  // ── render lista ───────────────────────────────────
  renderExpenseList() {
    const list = document.getElementById('expense-list');
    if (!list) return;

    let expenses = this.getMonthExpenses();

    // filtro categoria
    if (this.filterCategory) {
      expenses = expenses.filter(e => e.category === this.filterCategory);
    }

    // ordinamento
    expenses.sort((a, b) => {
      switch (this.filterSort) {
        case 'amount-asc':  return (Number(a.amount) || 0) - (Number(b.amount) || 0);
        case 'amount-desc': return (Number(b.amount) || 0) - (Number(a.amount) || 0);
        case 'date-asc':    return toDate(a.date) - toDate(b.date);
        default:            return toDate(b.date) - toDate(a.date);   // date-desc
      }
    });

    if (!expenses.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💸</div>
          <div class="empty-state-text">Nessuna spesa</div>
          <div class="empty-state-sub">Aggiungi la tua prima spesa questo mese</div>
        </div>`;
      return;
    }

    list.innerHTML = expenses.map(e => {
      const { emoji, label } = splitCategory(e.category);
      const formattedDate = toDate(e.date).toLocaleDateString('it-IT', {
        day: '2-digit', month: 'short'
      });

      return `
        <div class="expense-item">
          <div class="expense-icon">${emoji}</div>
          <div class="expense-info">
            <div class="expense-name">${escapeHTML(e.name)}</div>
            <small class="expense-meta">${escapeHTML(label)} · ${formattedDate}</small>
          </div>
          <div class="expense-amount">&euro;${(Number(e.amount) || 0).toFixed(2)}</div>
          <button class="expense-delete" data-delete="${e.id}">&times;</button>
        </div>
      `;
    }).join('');
  },

  // ── eventi ─────────────────────────────────────────
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
        this.filterSort     = document.getElementById('filter-sort')?.value  || 'date-desc';
        this.renderExpenseList();
      }
      if (btn.dataset.action === 'reset-filters') {
        this.filterCategory = '';
        this.filterSort     = 'date-desc';
        document.getElementById('filter-category').value = '';
        document.getElementById('filter-sort').value      = 'date-desc';
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
  }
};

export default expensesView;