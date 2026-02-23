import reportsConfig from '../modules/reports-config.js';
import reportGenerator from '../modules/report-generator.js';

const reportsView = {
  async render() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    appEl.innerHTML = this.getHTML();
    this.setupHeader();
    this.bindEvents();
  },

  destroy() {},

  getHTML() {
    return `
      <!-- ── header ── -->
      <div class="header">
        <div class="header-top">
          <div class="header-top-left">
            <button class="back-button visible" onclick="App.switchView('home')">&larr;</button>
            <div class="header-title">BudgeIT</div>
          </div>
          <button class="header-icon" onclick="App.openSettings()">☰</button>
        </div>
        <div class="header-subtitle">Genera report finanziario</div>
      </div>

      <div class="content">
        <div class="report-section">
          <div class="report-section-title">Configurazione Periodo</div>

          <!-- Selezione periodo -->
          <div class="report-period-grid">
            <button class="report-period-btn active" data-period="month">
              <div class="report-period-label">Mese</div>
              <div class="report-period-sub">corrente</div>
            </button>
            <button class="report-period-btn" data-period="specific-month">
              <div class="report-period-label">Mese</div>
              <div class="report-period-sub">specifico</div>
            </button>
            <button class="report-period-btn" data-period="month-range">
              <div class="report-period-label">Intervallo</div>
              <div class="report-period-sub">personalizzato</div>
            </button>
          </div>

          <!-- Selezione date (mostrate solo se rilevante) -->
          <div id="date-inputs" style="display:none; margin-top: 20px;">
            <div id="specific-month-input" style="display:none;">
              <label class="report-label">Seleziona mese</label>
              <input type="month" id="report-month" class="input-field">
            </div>
            <div id="range-inputs" style="display:none;">
              <label class="report-label">Data inizio</label>
              <input type="date" id="report-start-date" class="input-field">
              <label class="report-label" style="margin-top:12px;">Data fine</label>
              <input type="date" id="report-end-date" class="input-field">
            </div>
          </div>
        </div>

        <div class="report-section">
          <div class="report-section-title">Anteprima</div>
          <div class="report-preview" id="report-preview">
            <div class="report-preview-info">
              <div class="report-preview-item">
                <div class="report-preview-label">Periodo</div>
                <div class="report-preview-value" id="preview-period">—</div>
              </div>
              <div class="report-preview-item">
                <div class="report-preview-label">Spese incluse</div>
                <div class="report-preview-value" id="preview-count">—</div>
              </div>
            </div>
          </div>
        </div>

        <button class="btn btn-primary btn-full" id="btn-generate-report" style="margin-top: 32px;">
          Genera Report PDF
        </button>

      </div>
    `;
  },

  setupHeader() {
    // Configurazione iniziale
    reportsConfig.resetConfig();
    this.updatePreview();
  },

  bindEvents() {
    const root = document.getElementById('app');
    if (!root) return;

    // Selezione periodo
    root.querySelectorAll('.report-period-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        root.querySelectorAll('.report-period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const period = btn.dataset.period;
        reportsConfig.setConfig({ period });
        this.updateDateInputs(period);
        this.updatePreview();
      });
    });

    // Input date
    root.querySelector('#report-month')?.addEventListener('change', (e) => {
      reportsConfig.setConfig({ startDate: e.target.value + '-01' });
      this.updatePreview();
    });

    root.querySelector('#report-start-date')?.addEventListener('change', (e) => {
      reportsConfig.setConfig({ startDate: e.target.value });
      this.updatePreview();
    });

    root.querySelector('#report-end-date')?.addEventListener('change', (e) => {
      reportsConfig.setConfig({ endDate: e.target.value });
      this.updatePreview();
    });

    // Genera report
    root.querySelector('#btn-generate-report')?.addEventListener('click', async () => {
      const startDate = root.querySelector('#report-start-date')?.value;
      const endDate = root.querySelector('#report-end-date')?.value;

      if (reportsConfig.reportConfig.period === 'month-range') {
        if (!startDate || !endDate) {
          alert('Specifica data inizio e fine');
          return;
        }
      }

      await reportGenerator.generatePDF(reportsConfig.reportConfig);
    });
  },

  updateDateInputs(period) {
    const root = document.getElementById('app');
    const dateInputs = root?.querySelector('#date-inputs');
    const specificMonthInput = root?.querySelector('#specific-month-input');
    const rangeInputs = root?.querySelector('#range-inputs');

    if (!dateInputs) return;

    dateInputs.style.display = 'none';
    if (specificMonthInput) specificMonthInput.style.display = 'none';
    if (rangeInputs) rangeInputs.style.display = 'none';

    if (period === 'specific-month') {
      dateInputs.style.display = 'block';
      if (specificMonthInput) specificMonthInput.style.display = 'block';
    } else if (period === 'month-range') {
      dateInputs.style.display = 'block';
      if (rangeInputs) rangeInputs.style.display = 'block';
    }
  },

  updatePreview() {
    const root = document.getElementById('app');
    if (!root) return;

    const config = reportsConfig.reportConfig;
    const reportData = reportsConfig.buildReportData(config);

    const periodEl = root.querySelector('#preview-period');
    const countEl = root.querySelector('#preview-count');

    if (periodEl) periodEl.textContent = reportData.period;
    if (countEl) countEl.textContent = `${reportData.stats.count} spese`;
  }
};

export default reportsView;