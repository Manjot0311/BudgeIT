import storage from '../storage.js';

/**
 * Reports Configuration Module
 * Gestisce la configurazione e la costruzione dei dati per i report PDF
 */

const reportsConfig = {
  reportConfig: {
    period: 'month', // month, specific-month, month-range, ytd, fiscal-year
    startDate: null,
    endDate: null,
    includeFullLog: true,
    includeCategoryAnalysis: true,
    includeBudgetAnalysis: true,
    includeCharts: false
  },

  /**
   * Resetta la configurazione ai valori di default
   */
  resetConfig() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.reportConfig = {
      period: 'month',
      startDate: this._formatDate(firstDay),
      endDate: this._formatDate(lastDay),
      includeFullLog: true,
      includeCategoryAnalysis: true,
      includeBudgetAnalysis: true,
      includeCharts: false
    };
  },

  /**
   * Aggiorna configurazione (merge parziale)
   */
  setConfig(updates) {
    this.reportConfig = { ...this.reportConfig, ...updates };
  },

  /**
   * Costruisce i dati completi del report
   */
  buildReportData(config) {
    const profile = storage.getActiveProfile();
    const expenses = this._filterExpensesByPeriod(config);
    const stats = this._calculateStats(expenses);
    const grouped = this._groupByCategory(expenses);
    const percentages = this._calculatePercentages(grouped, stats.total);

    return {
      documentId: this._generateDocumentId(),
      profileName: profile?.name || 'BudgeIT',
      period: this._formatPeriod(config),
      generatedAt: this._getTimestamp(),
      config,
      expenses,
      stats,
      grouped,
      percentages,
      budgetAnalysis: this._analyzeBudgets(grouped)
    };
  },

  /**
   * Filtra spese in base al periodo selezionato
   */
  _filterExpensesByPeriod(config) {
    const allExpenses = storage.getExpenses();
    const { period, startDate, endDate } = config;
    const now = new Date();

    switch (period) {
      case 'month': {
        // Mese corrente
        return allExpenses.filter(e => {
          const d = new Date(e.date);
          return (
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          );
        });
      }

      case 'specific-month': {
        // Mese specifico
        if (!startDate) return [];
        const [year, month] = startDate.split('-').map(Number);
        return allExpenses.filter(e => {
          const d = new Date(e.date);
          return (
            d.getMonth() === month - 1 &&
            d.getFullYear() === year
          );
        });
      }

      case 'month-range': {
        // Intervallo personalizzato
        if (!startDate || !endDate) return [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        return allExpenses.filter(e => {
          const d = new Date(e.date);
          return d >= start && d <= end;
        });
      }

      case 'ytd': {
        // Da inizio anno a oggi
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return allExpenses.filter(e => {
          const d = new Date(e.date);
          return d >= yearStart && d <= now;
        });
      }

      case 'fiscal-year': {
        // Anno fiscale (1 aprile - 31 marzo)
        const fiscalStart = new Date(now.getFullYear() - 1, 3, 1);
        const fiscalEnd = new Date(now.getFullYear(), 3, 0);
        return allExpenses.filter(e => {
          const d = new Date(e.date);
          return d >= fiscalStart && d <= fiscalEnd;
        });
      }

      default:
        return allExpenses;
    }
  },

  /**
   * Calcola statistiche per un array di spese
   */
  _calculateStats(expenses) {
    const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const count = expenses.length;
    const average = count > 0 ? total / count : 0;
    const max = count > 0 ? Math.max(...expenses.map(e => Number(e.amount || 0))) : 0;
    const min = count > 0 ? Math.min(...expenses.map(e => Number(e.amount || 0))) : 0;

    return { total, count, average, max, min };
  },

  /**
   * Raggruppa spese per categoria
   */
  _groupByCategory(expenses) {
    return expenses.reduce((acc, e) => {
      const cat = e.category || 'Altro';
      if (!acc[cat]) {
        acc[cat] = { total: 0, count: 0, items: [] };
      }
      acc[cat].total += Number(e.amount || 0);
      acc[cat].count += 1;
      acc[cat].items.push(e);
      return acc;
    }, {});
  },

  /**
   * Calcola percentuali per categoria
   */
  _calculatePercentages(grouped, total) {
    const result = {};
    Object.keys(grouped).forEach(cat => {
      result[cat] = total > 0 ? ((grouped[cat].total / total) * 100).toFixed(1) : 0;
    });
    return result;
  },

  /**
   * Analizza budget vs speso
   */
  _analyzeBudgets(grouped) {
    const budgets = storage.getBudgets();
    const result = [];

    Object.keys(budgets).forEach(cat => {
      const limit = budgets[cat];
      const spent = grouped[cat]?.total || 0;
      const utilizationPct = limit > 0 ? (spent / limit) * 100 : 0;

      result.push({
        category: cat,
        limit,
        spent,
        utilizationPct
      });
    });

    return result;
  },

  /**
   * Formatta il periodo per visualizzazione
   */
  _formatPeriod(config) {
    const { period, startDate, endDate } = config;
    const now = new Date();

    switch (period) {
      case 'month': {
        return now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      }

      case 'specific-month': {
        if (!startDate) return 'Non specificato';
        const d = new Date(startDate);
        return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      }

      case 'month-range': {
        if (!startDate || !endDate) return 'Non specificato';
        const start = new Date(startDate).toLocaleDateString('it-IT');
        const end = new Date(endDate).toLocaleDateString('it-IT');
        return `${start} - ${end}`;
      }

      case 'ytd': {
        const end = now.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
        return `Da inizio anno - ${end}`;
      }

      case 'fiscal-year': {
        return `Anno fiscale ${now.getFullYear() - 1}-${now.getFullYear()}`;
      }

      default:
        return 'Periodo sconosciuto';
    }
  },

  /**
   * Formatta data in formato YYYY-MM-DD
   */
  _formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Genera ID univoco per documento
   */
  _generateDocumentId() {
    return (
      'DOC-' +
      Date.now() +
      '-' +
      Math.random().toString(36).substr(2, 9).toUpperCase()
    );
  },

  /**
   * Restituisce timestamp leggibile
   */
  _getTimestamp() {
    const now = new Date();
    return now.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
};

export default reportsConfig;