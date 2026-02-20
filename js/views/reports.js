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
            <button class="report-period-btn" data-period="ytd">
              <div class="report-period-label">YTD</div>
              <div class="report-period-sub">anno da oggi</div>
            </button>
            <button class="report-period-btn" data-period="fiscal-year">
              <div class="report-period-label">Fiscale</div>
              <div class="report-period-sub">anno contabile</div>
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
          <div class="report-section-title">Contenuti da includere</div>

          <div class="report-checklist">
            <div class="report-checkbox-item">
              <input type="checkbox" id="check-full-log" checked>
              <label for="check-full-log">
                <span class="check-label">Log completo transazioni</span>
                <span class="check-sub">Dettaglio di tutte le spese</span>
              </label>
            </div>
            <div class="report-checkbox-item">
              <input type="checkbox" id="check-category-analysis" checked>
              <label for="check-category-analysis">
                <span class="check-label">Analisi per categoria</span>
                <span class="check-sub">Suddivisione spese e percentuali</span>
              </label>
            </div>
            <div class="report-checkbox-item">
              <input type="checkbox" id="check-budget-analysis" checked>
              <label for="check-budget-analysis">
                <span class="check-label">Analisi budget</span>
                <span class="check-sub">Confronto budget vs speso</span>
              </label>
            </div>
            <div class="report-checkbox-item">
              <input type="checkbox" id="check-charts" disabled title="Disponibile in v0.4">
              <label for="check-charts" style="opacity:0.5;">
                <span class="check-label">Grafici e trend</span>
                <span class="check-sub">Visualizzazioni (v0.4)</span>
              </label>
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

    // Checkbox
    root.querySelector('#check-full-log')?.addEventListener('change', (e) => {
      reportsConfig.setConfig({ includeFullLog: e.target.checked });
    });

    root.querySelector('#check-category-analysis')?.addEventListener('change', (e) => {
      reportsConfig.setConfig({ includeCategoryAnalysis: e.target.checked });
    });

    root.querySelector('#check-budget-analysis')?.addEventListener('change', (e) => {
      reportsConfig.setConfig({ includeBudgetAnalysis: e.target.checked });
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