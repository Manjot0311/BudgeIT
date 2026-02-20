import reportsConfig from './reports-config.js';
import CryptoUtils from './crypto-utils.js';

/**
 * Report Generator
 * Genera PDF con jsPDF + html2canvas
 * 
 * Dipendenze esterne:
 * - jsPDF (da CDN)
 * - html2canvas (da CDN)
 */

class ReportGenerator {
  constructor() {
    this.isGenerating = false;
  }

  /**
   * Genera il PDF completo
   * Mostra progress screen durante la generazione
   */
  async generatePDF(config) {
    if (this.isGenerating) return;
    this.isGenerating = true;

    // Mostra schermata di progress
    const progressScreen = this.createProgressScreen();
    document.body.appendChild(progressScreen);

    try {
      // Step 1: Costruisci dati
      this.updateProgress(progressScreen, 'Aggregating financial records...', 15);
      await this.delay(300);

      const reportData = reportsConfig.buildReportData(config);

      // Step 2: Valida dati
      this.updateProgress(progressScreen, 'Validating entries...', 35);
      await this.delay(400);

      if (!reportData.expenses.length) {
        throw new Error('Nessuna spesa trovata nel periodo selezionato');
      }

      // Step 3: Rendering
      this.updateProgress(progressScreen, 'Rendering document...', 60);
      await this.delay(300);

      // Step 4: Genera PDF
      this.updateProgress(progressScreen, 'Finalizing document...', 85);
      await this.delay(300);

      const pdf = await this.buildPDF(reportData);

      // Step 5: Completo
      this.updateProgress(progressScreen, 'Download starting...', 100);
      await this.delay(400);

      // Download
      pdf.save(`BudgeIT_Report_${reportData.documentId}.pdf`);

      // Chiudi schermata
      progressScreen.remove();
      this.isGenerating = false;

      return true;
    } catch (error) {
      console.error('Report generation failed:', error);
      progressScreen.remove();
      this.isGenerating = false;
      alert('Errore nella generazione del report: ' + error.message);
      return false;
    }
  }

  /**
   * Costruisce il PDF vero e proprio
   */
  async buildPDF(reportData) {
    // Controlla disponibilità librerie
    if (!window.jspdf) {
      throw new Error('jsPDF non caricato. Aggiungi il CDN a index.html');
    }
    if (!window.html2canvas) {
      throw new Error('html2canvas non caricato. Aggiungi il CDN a index.html');
    }

    // Accedi a jsPDF dal CDN
    const jsPDF = window.jspdf.jsPDF;

    // Crea PDF in formato A4
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // ─── COPERTINA ───
    this.addCover(pdf, reportData, pageWidth, pageHeight);
    pdf.addPage();
    yPosition = margin;

    // ─── RIEPILOGO ───
    this.addSummary(pdf, reportData, pageWidth, yPosition);
    yPosition += 60;

    // ─── ANALISI CATEGORIE ───
    if (reportData.config.includeCategoryAnalysis) {
      if (yPosition > pageHeight - 80) {
        pdf.addPage();
        yPosition = margin;
      }
      this.addCategoryAnalysis(pdf, reportData, pageWidth, yPosition);
      yPosition += 80;
    }

    // ─── ANALISI BUDGET ───
    if (reportData.config.includeBudgetAnalysis) {
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = margin;
      }
      this.addBudgetAnalysis(pdf, reportData, pageWidth, yPosition);
      yPosition += 60;
    }

    // ─── LOG COMPLETO ───
    if (reportData.config.includeFullLog) {
      pdf.addPage();
      yPosition = margin;
      this.addFullLog(pdf, reportData, pageWidth, yPosition);
    }

    // ─── FOOTER ───
    const pages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i);
      this.addFooter(pdf, reportData, pageWidth, pageHeight);
    }

    return pdf;
  }

  /**
   * Copertina del report
   */
  addCover(pdf, reportData, pageWidth, pageHeight) {
    const centerX = pageWidth / 2;

    // Background
    pdf.setFillColor(26, 26, 26);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Logo/Titolo
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(48);
    pdf.text('BudgeIT', centerX, pageHeight / 2 - 20, { align: 'center' });

    pdf.setFontSize(16);
    pdf.setTextColor(160, 160, 160);
    pdf.text('Financial Report', centerX, pageHeight / 2 + 10, { align: 'center' });

    // Periodo
    pdf.setFontSize(12);
    pdf.setTextColor(200, 200, 200);
    pdf.text(reportData.period, centerX, pageHeight / 2 + 30, { align: 'center' });

    // Data generazione
    pdf.setFontSize(10);
    pdf.setTextColor(128, 128, 128);
    pdf.text(`Generated: ${reportData.generatedAt}`, centerX, pageHeight - 40, { align: 'center' });

    // ID documento
    pdf.setFontSize(9);
    pdf.text(`Doc ID: ${reportData.documentId}`, centerX, pageHeight - 30, { align: 'center' });
  }

  /**
   * Sezione riepilogo
   */
  addSummary(pdf, reportData, pageWidth, startY) {
    const margin = 15;
    const colWidth = (pageWidth - 2 * margin) / 2;

    // Titolo
    pdf.setFontSize(16);
    pdf.setTextColor(26, 26, 26);
    pdf.text('Riepilogo', margin, startY);

    startY += 12;

    // Rettangolo contenitore
    pdf.setDrawColor(200, 200, 200);
    pdf.setFillColor(248, 248, 248);
    pdf.rect(margin, startY, pageWidth - 2 * margin, 40, 'FD');

    pdf.setFontSize(11);
    pdf.setTextColor(100, 100, 100);
    pdf.text('TOTALE SPESE', margin + 5, startY + 8);

    pdf.setFontSize(24);
    pdf.setTextColor(26, 26, 26);
    pdf.text(
      CryptoUtils.formatCurrency(reportData.stats.total),
      margin + 5,
      startY + 20
    );

    // Colonna destra
    const col2X = margin + colWidth;
    pdf.setFontSize(11);
    pdf.setTextColor(100, 100, 100);
    pdf.text('TRANSAZIONI', col2X + 5, startY + 8);

    pdf.setFontSize(24);
    pdf.setTextColor(26, 26, 26);
    pdf.text(reportData.stats.count.toString(), col2X + 5, startY + 20);

    // Media
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Media: ${CryptoUtils.formatCurrency(reportData.stats.average)}`,
      margin + 5,
      startY + 35
    );
  }

  /**
   * Analisi per categoria
   */
  addCategoryAnalysis(pdf, reportData, pageWidth, startY) {
    const margin = 15;

    pdf.setFontSize(14);
    pdf.setTextColor(26, 26, 26);
    pdf.text('Analisi per categoria', margin, startY);

    startY += 10;

    let yPos = startY;
    const categories = Object.keys(reportData.grouped).sort(
      (a, b) => reportData.grouped[b].total - reportData.grouped[a].total
    );

    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Categoria', margin, yPos);
    pdf.text('Importo', margin + 80, yPos);
    pdf.text('%', margin + 110, yPos);
    pdf.text('Transazioni', margin + 120, yPos);

    yPos += 6;
    pdf.setDrawColor(230, 230, 230);
    pdf.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 3;

    categories.forEach(cat => {
      const data = reportData.grouped[cat];
      const pct = reportData.percentages[cat];

      pdf.setFontSize(9);
      pdf.setTextColor(50, 50, 50);
      pdf.text(cat, margin, yPos);
      pdf.text(CryptoUtils.formatCurrency(data.total), margin + 80, yPos);
      pdf.text(`${pct}%`, margin + 110, yPos);
      pdf.text(data.count.toString(), margin + 120, yPos);

      yPos += 6;
    });
  }

  /**
   * Analisi budget
   */
  addBudgetAnalysis(pdf, reportData, pageWidth, startY) {
    const margin = 15;

    pdf.setFontSize(14);
    pdf.setTextColor(26, 26, 26);
    pdf.text('Budget vs Utilizzo', margin, startY);

    startY += 10;

    let yPos = startY;

    const budgetItems = reportData.budgetAnalysis.filter(b => b.limit > 0);

    if (!budgetItems.length) {
      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Nessun budget impostato', margin, yPos);
      return;
    }

    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Categoria', margin, yPos);
    pdf.text('Limite', margin + 60, yPos);
    pdf.text('Speso', margin + 95, yPos);
    pdf.text('% Utilizzo', margin + 120, yPos);

    yPos += 6;
    pdf.setDrawColor(230, 230, 230);
    pdf.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 3;

    budgetItems.forEach(item => {
      pdf.setFontSize(9);
      pdf.setTextColor(50, 50, 50);
      pdf.text(item.category, margin, yPos);
      pdf.text(CryptoUtils.formatCurrency(item.limit), margin + 60, yPos);
      pdf.text(CryptoUtils.formatCurrency(item.spent), margin + 95, yPos);

      // Colore per utilizzo
      if (item.utilizationPct >= 100) {
        pdf.setTextColor(200, 53, 50); // Rosso
      } else if (item.utilizationPct >= 80) {
        pdf.setTextColor(200, 122, 0); // Arancio
      } else {
        pdf.setTextColor(30, 123, 75); // Verde
      }

      pdf.text(`${item.utilizationPct.toFixed(1)}%`, margin + 120, yPos);

      yPos += 6;
    });
  }

  /**
   * Log completo transazioni
   */
  addFullLog(pdf, reportData, pageWidth, startY) {
    const margin = 15;

    pdf.setFontSize(14);
    pdf.setTextColor(26, 26, 26);
    pdf.text('Log completo transazioni', margin, startY);

    startY += 10;

    let yPos = startY;

    // Header
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Data', margin, yPos);
    pdf.text('Categoria', margin + 25, yPos);
    pdf.text('Descrizione', margin + 55, yPos);
    pdf.text('Importo', margin + 110, yPos);

    yPos += 5;
    pdf.setDrawColor(230, 230, 230);
    pdf.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 3;

    // Righe spese
    reportData.expenses.forEach(exp => {
      if (yPos > 270) {
        pdf.addPage();
        yPos = 15;
      }

      pdf.setFontSize(8);
      pdf.setTextColor(50, 50, 50);

      const date = new Date(exp.date).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit'
      });

      pdf.text(date, margin, yPos);
      pdf.text(exp.category, margin + 25, yPos);
      pdf.text(exp.name.substring(0, 30), margin + 55, yPos);
      pdf.text(CryptoUtils.formatCurrency(exp.amount), margin + 110, yPos);

      yPos += 4;
    });
  }

  /**
   * Footer con numero pagina
   */
  addFooter(pdf, reportData, pageWidth, pageHeight) {
    const pageNum = pdf.internal.pages.indexOf(pdf.internal.page) - 1;

    pdf.setFontSize(9);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Pagina ${pageNum} | BudgeIT | ${reportData.profileName}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  /**
   * Crea schermata di progress full-screen
   */
  createProgressScreen() {
    const overlay = document.createElement('div');
    overlay.id = 'report-progress-screen';
    overlay.className = 'report-progress-screen show';
    overlay.innerHTML = `
      <div class="report-progress-content">
        <div class="report-progress-header">
          <div class="report-progress-title">Generazione Report</div>
          <div class="report-progress-subtitle">Preparazione documento finanziario</div>
        </div>

        <div class="report-progress-body">
          <div class="report-progress-indicator">
            <div class="report-progress-bar">
              <div class="report-progress-fill" id="report-progress-fill" style="width: 0%"></div>
            </div>
            <div class="report-progress-percentage" id="report-progress-percentage">0%</div>
          </div>

          <div class="report-progress-message" id="report-progress-message">
            Preparazione documento...
          </div>
        </div>

        <div class="report-progress-footer">
          <div class="report-progress-microcopy">
            BudgeIT v0.3 • Report Generator
          </div>
        </div>
      </div>
    `;

    return overlay;
  }

  /**
   * Aggiorna la schermata di progress
   */
  updateProgress(screen, message, percentage) {
    const fill = screen.querySelector('#report-progress-fill');
    const msg = screen.querySelector('#report-progress-message');
    const pct = screen.querySelector('#report-progress-percentage');

    if (fill) fill.style.width = `${percentage}%`;
    if (msg) msg.textContent = message;
    if (pct) pct.textContent = `${percentage}%`;
  }

  /**
   * Utility: delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new ReportGenerator();