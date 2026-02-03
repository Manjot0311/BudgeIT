import storage from '../storage.js';

/* ===================== FUNZIONI PURE ===================== */

function filterExpensesByMonth(expenses, monthDate) {
  return expenses.filter(e => {
    const d = new Date(e.date);
    return (
      d.getMonth() === monthDate.getMonth() &&
      d.getFullYear() === monthDate.getFullYear()
    );
  });
}

function calculateSummary(expenses) {
  const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const count = expenses.length;
  const average = count > 0 ? total / count : 0;
  return { total, count, average };
}

function groupByCategory(expenses) {
  return expenses.reduce((acc, e) => {
    const key = e.category || 'Altro';
    acc[key] = (acc[key] || 0) + (Number(e.amount) || 0);
    return acc;
  }, {});
}

/* ===================== VIEW ===================== */

const statsView = {
  currentMonth: new Date(),
  chart: null,

  // â”€â”€â”€ RENDER INIZIALE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Monta l'HTML una sola volta, poi delega i contenuti a update().
  render() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    appEl.innerHTML = this.getHTML();
    this.update();
  },

  // â”€â”€â”€ AGGIORNAMENTO CONTENUTI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Chiamato da App.changeStatsMonth() dopo ogni cambio mese.
  // Non tocca l'HTML base, aggiorna solo i valori e il grafico.
  update() {
    this.updateHeader();
    this.updateStats();
    this.renderBreakdown();
  },

  destroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  },

  /* ===================== UI ===================== */

  getHTML() {
    return `
      <div class="header">
        <div class="header-top">
          <div class="header-top-left">
            <button class="back-button visible" onclick="App.switchView('home')">â†</button>
            <div class="header-title">BudgeIT</div>
          </div>
          <button class="header-icon" onclick="App.openSettings()">â˜°</button>
        </div>
        <div class="header-subtitle">Analizza i tuoi dati</div>
      </div>

      <div class="tabs visible">
        <button class="tab" onclick="App.switchView('expenses')">ðŸ’³ Spese</button>
        <button class="tab" onclick="App.switchView('budget')">ðŸŽ¯ Budget</button>
        <button class="tab active">ðŸ“Š Stats</button>
      </div>

      <div class="content">
        <div class="section-title">Statistiche mensili</div>

        <div class="month-selector">
          <button class="month-btn" onclick="App.changeStatsMonth(-1)">â€¹</button>
          <div class="month-display" id="stats-month"></div>
          <button class="month-btn" onclick="App.changeStatsMonth(1)">â€º</button>
        </div>

        <div class="hero-card">
          <div class="hero-card-label">Totale spese</div>
          <div class="hero-card-value" id="stats-total">â‚¬0.00</div>

          <div style="display:flex;gap:24px;margin-top:16px;">
            <div>
              <div class="hero-sub-label">TRANSAZIONI</div>
              <div class="hero-sub-value" id="stats-count">0</div>
            </div>
            <div>
              <div class="hero-sub-label">MEDIA</div>
              <div class="hero-sub-value" id="stats-avg">â‚¬0.00</div>
            </div>
          </div>
        </div>

        <div class="section-title">Suddivisione per categoria</div>
        <div class="chart-container" id="chart-container"></div>
      </div>
    `;
  },

  updateHeader() {
    const el = document.getElementById('stats-month');
    if (!el) return;

    const label = this.currentMonth.toLocaleDateString('it-IT', {
      month: 'long',
      year: 'numeric'
    });

    el.textContent = label.charAt(0).toUpperCase() + label.slice(1);
  },

  getMonthExpenses() {
    return filterExpensesByMonth(
      storage.getExpenses(),
      this.currentMonth
    );
  },

  updateStats() {
    const totalEl = document.getElementById('stats-total');
    const countEl = document.getElementById('stats-count');
    const avgEl = document.getElementById('stats-avg');
    if (!totalEl || !countEl || !avgEl) return;

    const expenses = this.getMonthExpenses();
    const { total, count, average } = calculateSummary(expenses);

    totalEl.textContent = `â‚¬${total.toFixed(2)}`;
    countEl.textContent = count;
    avgEl.textContent = `â‚¬${average.toFixed(2)}`;
  },

  renderBreakdown() {
    const container = document.getElementById('chart-container');
    if (!container) return;

    // Distruggi sempre il grafico precedente prima di fare qualsiasi cosa
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const expenses = this.getMonthExpenses();

    if (!expenses.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">â€”</div>
          <div class="empty-state-text">Nessun dato disponibile</div>
          <div class="empty-state-sub">Aggiungi spese per visualizzare le statistiche</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `<canvas id="breakdown-chart"></canvas>`;

    const grouped = groupByCategory(expenses);
    const labels = Object.keys(grouped);
    const data = Object.values(grouped);

    const ctx = document.getElementById('breakdown-chart').getContext('2d');

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: [
            '#FF3B30', '#FF9500', '#34C759',
            '#00B7FF', '#5856D6', '#FF2D55', '#A2845E'
          ].slice(0, labels.length),
          borderWidth: 3,
          borderRadius: 8,
          spacing: 2
        }]
      },
      options: {
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label(ctx) {
                const value = ctx.parsed || 0;
                const total = data.reduce((a, b) => a + b, 0);
                const pct = total ? ((value / total) * 100).toFixed(1) : 0;
                return `${ctx.label}: â‚¬${value.toFixed(2)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }
};

export default statsView;