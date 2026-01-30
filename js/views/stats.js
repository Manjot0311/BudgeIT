import storage from '../storage.js';
import app from '../app.js';

const statsView = {
  currentMonth: new Date(),
  myChart: null,

  async render() {
    const appEl = document.getElementById('app');
    appEl.innerHTML = this.getHTML();

    this.setupHeader();
    this.updateStats();
    this.renderBreakdown();
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
        <div class="header-subtitle">Analizza i tuoi dati</div>
      </div>

      <div class="tabs visible">
        <button class="tab" onclick="App.switchView('expenses')">
          <span class="tab-emoji">💳</span>
          <span>Spese</span>
        </button>
        <button class="tab" onclick="App.switchView('budget')">
          <span class="tab-emoji">🎯</span>
          <span>Budget</span>
        </button>
        <button class="tab active" onclick="App.switchView('stats')">
          <span class="tab-emoji">📊</span>
          <span>Stats</span>
        </button>
      </div>

      <div class="content">
        <div class="section-title">Statistiche mensili</div>

        <div class="month-selector">
          <button class="month-btn" onclick="App.changeStatsMonth(-1)">‹</button>
          <div class="month-display" id="stats-month">Gennaio 2024</div>
          <button class="month-btn" onclick="App.changeStatsMonth(1)">›</button>
        </div>

        <div class="hero-card">
          <div class="hero-card-label">Totale spese</div>
          <div class="hero-card-value" id="stats-total">€0.00</div>
          <div style="display: flex; gap: 24px; margin-top: 16px;">
            <div>
              <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px; letter-spacing: 0.08em;">TRANSAZIONI</div>
              <div style="font-size: 24px; font-weight: 500; color: #FFF;" id="stats-count">0</div>
            </div>
            <div>
              <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px; letter-spacing: 0.08em;">MEDIA</div>
              <div style="font-size: 24px; font-weight: 500; color: #FFF;" id="stats-avg">€0.00</div>
            </div>
          </div>
        </div>

        <div class="section-title">Suddivisione per categoria</div>
        <div class="chart-container" id="chart-container">
          <canvas id="breakdown-chart"></canvas>
        </div>
      </div>
    `;
  },

  setupHeader() {
    const formatted = this.currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    const capitalised = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    document.getElementById('stats-month').textContent = capitalised;
  },

  getMonthExpenses() {
    return storage.getExpenses().filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === this.currentMonth.getMonth() &&
             expDate.getFullYear() === this.currentMonth.getFullYear();
    });
  },

  updateStats() {
    const expenses = this.getMonthExpenses();
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const count = expenses.length;
    const avg = count > 0 ? total / count : 0;

    document.getElementById('stats-total').textContent = `€${total.toFixed(2)}`;
    document.getElementById('stats-count').textContent = count;
    document.getElementById('stats-avg').textContent = `€${avg.toFixed(2)}`;
  },

  renderBreakdown() {
    const container = document.getElementById('chart-container');
    if (!container) return;

    const expenses = this.getMonthExpenses();
    
    if (expenses.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">—</div>
          <div class="empty-state-text">Nessun dato disponibile</div>
          <div class="empty-state-sub">Aggiungi spese per visualizzare le statistiche</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = '<canvas id="breakdown-chart"></canvas>';
    
    const byCategory = {};
    expenses.forEach(exp => {
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
    });
    
    const labels = Object.keys(byCategory);
    const data = Object.values(byCategory);
    
    if (this.myChart) {
      this.myChart.destroy();
      this.myChart = null;
    }
    
    const canvas = document.getElementById('breakdown-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    const chartColors = [
      '#FF3B30', '#FF9500', '#34C759', '#00B7FF', '#5856D6', '#FF2D55', '#A2845E'
    ];
    
    try {
      this.myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: chartColors.slice(0, labels.length),
            borderColor: isDark ? '#1A1A1A' : '#FFFFFF',
            borderWidth: 3,
            spacing: 2,
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          layout: { padding: 0 },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 16,
                font: { size: 13, family: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif', weight: '500' },
                color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || (isDark ? '#FAFAFA' : '#1A1A1A'),
                usePointStyle: true,
                pointStyle: 'circle',
                boxWidth: 12,
                boxHeight: 12
              }
            },
            tooltip: {
              backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-surface').trim() || (isDark ? '#0F0F0F' : '#FFFFFF'),
              titleColor: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || (isDark ? '#FAFAFA' : '#1A1A1A'),
              bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || (isDark ? '#FAFAFA' : '#1A1A1A'),
              borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-divider').trim() || (isDark ? '#2A2A2A' : '#E5E5E5'),
              borderWidth: 1,
              padding: 12,
              displayColors: true,
              boxWidth: 12,
              boxHeight: 12,
              cornerRadius: 8,
              callbacks: {
                label: (context) => {
                  const value = context.parsed || 0;
                  const percentage = ((value / data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                  return `${context.label}: €${value.toFixed(2)} (${percentage}%)`;
                }
              }
            }
          },
          animation: { animateRotate: true, animateScale: false, duration: 800, easing: 'easeInOutQuart' }
        }
      });
    } catch (e) {
      console.error('Chart render error:', e);
    }
  },

  setupListeners() {
    // Event listeners
  },

  destroy() {
    if (this.myChart) {
      this.myChart.destroy();
      this.myChart = null;
    }
  }
};

export default statsView;
