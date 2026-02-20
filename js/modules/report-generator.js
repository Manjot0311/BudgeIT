import reportsConfig from './reports-config.js';
import CryptoUtils from './crypto-utils.js';

/**
 * Report Generator - VERSIONE MIGLIORATA
 * Genera PDF professionali con jsPDF
 */

class ReportGenerator {
  constructor() {
    this.isGenerating = false;
  }

  /**
   * Genera il PDF completo
   */
  async generatePDF(config) {
    if (this.isGenerating) return;
    this.isGenerating = true;

    const progressScreen = this.createProgressScreen();
    document.body.appendChild(progressScreen);

    try {
      this.updateProgress(progressScreen, 'Aggregating financial records...', 15);
      await this.delay(300);

      const reportData = reportsConfig.buildReportData(config);

      this.updateProgress(progressScreen, 'Validating entries...', 35);
      await this.delay(400);

      if (!reportData.expenses.length) {
        throw new Error('Nessuna spesa trovata nel periodo selezionato');
      }

      this.updateProgress(progressScreen, 'Rendering document...', 60);
      await this.delay(300);

      this.updateProgress(progressScreen, 'Finalizing document...', 85);
      await this.delay(300);

      const pdf = await this.buildPDF(reportData);

      this.updateProgress(progressScreen, 'Download starting...', 100);
      await this.delay(400);

      // ✅ NOME FILE MIGLIORATO: BudgeIT_Report_[Periodo].pdf
      const fileName = this.generateFileName(reportData);
      pdf.save(fileName);

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
   * ✅ Genera nome file: BudgeIT_Report_[Periodo]
   */
  generateFileName(reportData) {
    let periodName = '';
    
    const { period, startDate, endDate } = reportData.config;
    
    switch (period) {
      case 'month': {
        const now = new Date();
        const monthName = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
        periodName = this.capitalizeFirst(monthName).replace(' ', '_');
        break;
      }
      case 'specific-month': {
        if (startDate) {
          const d = new Date(startDate);
          const monthName = d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
          periodName = this.capitalizeFirst(monthName).replace(' ', '_');
        }
        break;
      }
      case 'month-range': {
        if (startDate && endDate) {
          const start = new Date(startDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
          const end = new Date(endDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
          periodName = `${start}_to_${end}`;
        }
        break;
      }
      case 'ytd': {
        const now = new Date();
        periodName = `YTD_${now.getFullYear()}`;
        break;
      }
      case 'fiscal-year': {
        const now = new Date();
        periodName = `FY_${now.getFullYear() - 1}_${now.getFullYear()}`;
        break;
      }
      default:
        periodName = 'Report';
    }

    return `BudgeIT_Report_${periodName}.pdf`;
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Costruisce il PDF
   */
  async buildPDF(reportData) {
    if (!window.jspdf) {
      throw new Error('jsPDF non caricato');
    }

    const jsPDF = window.jspdf.jsPDF;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;

    // ─── COPERTINA ───
    this.addCover(pdf, reportData, pageWidth, pageHeight);
    pdf.addPage();

    // ─── RIEPILOGO ───
    let yPosition = margin;
    this.addSummary(pdf, reportData, pageWidth, yPosition);
    yPosition += 60; // ← RIDOTTO: meno spazio occupato

    // ─── ANALISI CATEGORIE ───
    if (reportData.config.includeCategoryAnalysis) {
      if (yPosition > pageHeight - 90) {
        pdf.addPage();
        yPosition = margin;
      }
      this.addCategoryAnalysis(pdf, reportData, pageWidth, yPosition);
      yPosition += 90;
    }

    // ─── ANALISI BUDGET ───
    if (reportData.config.includeBudgetAnalysis) {
      if (yPosition > pageHeight - 70) {
        pdf.addPage();
        yPosition = margin;
      }
      this.addBudgetAnalysis(pdf, reportData, pageWidth, yPosition);
      yPosition += 70;
    }

    // ─── LOG COMPLETO ───
    if (reportData.config.includeFullLog) {
      pdf.addPage();
      yPosition = margin;
      this.addFullLog(pdf, reportData, pageWidth, yPosition);
    }

    // ─── FOOTER SU TUTTE LE PAGINE ───
    const pages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i);
      this.addFooter(pdf, reportData, pageWidth, pageHeight, i, pages);
    }

    return pdf;
  }

  /**
   * ✅ COPERTINA ELEGANTE
   */
  addCover(pdf, reportData, pageWidth, pageHeight) {
    const centerX = pageWidth / 2;

    // Background gradient (simulato con rettangoli)
    pdf.setFillColor(26, 26, 26);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Decorazione superiore
    pdf.setFillColor(100, 100, 100);
    pdf.rect(0, 0, pageWidth, 60, 'F');

    // Logo/Titolo principale
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(56);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BudgeIT', centerX, pageHeight / 2 - 30, { align: 'center' });

    // Sottotitolo
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(180, 180, 180);
    pdf.text('Financial Report', centerX, pageHeight / 2 + 5, { align: 'center' });

    // Periodo
    pdf.setFontSize(14);
    pdf.setTextColor(220, 220, 220);
    pdf.text(reportData.period, centerX, pageHeight / 2 + 25, { align: 'center' });

    // Linea decorativa
    pdf.setDrawColor(100, 100, 100);
    pdf.setLineWidth(1);
    pdf.line(centerX - 30, pageHeight / 2 + 35, centerX + 30, pageHeight / 2 + 35);

    // Profilo
    pdf.setFontSize(11);
    pdf.setTextColor(160, 160, 160);
    pdf.text(`Profilo: ${reportData.profileName}`, centerX, pageHeight / 2 + 50, { align: 'center' });

    // Data e ID in basso
    pdf.setFontSize(10);
    pdf.setTextColor(128, 128, 128);
    pdf.text(`Generated: ${reportData.generatedAt}`, centerX, pageHeight - 50, { align: 'center' });

    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Doc ID: ${reportData.documentId}`, centerX, pageHeight - 40, { align: 'center' });

    // Versione
    pdf.setFontSize(8);
    pdf.setTextColor(80, 80, 80);
    pdf.text('BudgeIT v0.3 • Report Generator', centerX, pageHeight - 30, { align: 'center' });
  }

  /**
   * ✅ RIEPILOGO SEMPLIFICATO (solo Total + Transazioni)
   */
  addSummary(pdf, reportData, pageWidth, startY) {
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    const colWidth = contentWidth / 2;

    // Titolo sezione
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(26, 26, 26);
    pdf.text('Riepilogo', margin, startY);

    startY += 12;

    // ─── BOX STATISTICHE ───
    // Box totale spese (sinistro)
    pdf.setFillColor(248, 248, 248);
    pdf.setDrawColor(220, 220, 220);
    pdf.rect(margin, startY, colWidth - 5, 50, 'FD');

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    pdf.text('TOTALE SPESE', margin + 5, startY + 8);

    pdf.setFontSize(32);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(26, 26, 26);
    pdf.text(CryptoUtils.formatCurrency(reportData.stats.total), margin + 5, startY + 32);

    // Box transazioni (destro)
    const col2X = margin + colWidth;
    pdf.setFillColor(248, 248, 248);
    pdf.setDrawColor(220, 220, 220);
    pdf.rect(col2X + 5, startY, colWidth - 5, 50, 'FD');

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    pdf.text('TRANSAZIONI', col2X + 10, startY + 8);

    pdf.setFontSize(32);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(26, 26, 26);
    pdf.text(reportData.stats.count.toString(), col2X + 10, startY + 32);
  }

  /**
   * ✅ ANALISI CATEGORIE MIGLIORATA
   */
  addCategoryAnalysis(pdf, reportData, pageWidth, startY) {
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    // Titolo
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(26, 26, 26);
    pdf.text('Analisi per Categoria', margin, startY);

    startY += 12;

    // Header tabella
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    pdf.setFillColor(248, 248, 248);
    pdf.rect(margin, startY, contentWidth, 7, 'F');

    pdf.text('Categoria', margin + 3, startY + 5);
    pdf.text('Importo', margin + 70, startY + 5);
    pdf.text('%', margin + 110, startY + 5);
    pdf.text('N°', margin + 125, startY + 5);

    startY += 10;

    // Righe categoria
    const categories = Object.keys(reportData.grouped).sort(
      (a, b) => reportData.grouped[b].total - reportData.grouped[a].total
    );

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(50, 50, 50);

    categories.forEach((cat, idx) => {
      const data = reportData.grouped[cat];
      const pct = reportData.percentages[cat];

      // Alternare colori di sfondo
      if (idx % 2 === 0) {
        pdf.setFillColor(252, 252, 252);
        pdf.rect(margin, startY - 3.5, contentWidth, 6, 'F');
      }

      pdf.setFontSize(9);
      pdf.text(cat, margin + 3, startY);
      pdf.text(CryptoUtils.formatCurrency(data.total), margin + 70, startY);
      
      // Colore per percentuale
      if (pct > 50) {
        pdf.setTextColor(200, 53, 50);
      } else if (pct > 30) {
        pdf.setTextColor(200, 122, 0);
      } else {
        pdf.setTextColor(30, 123, 75);
      }
      
      pdf.text(`${pct}%`, margin + 110, startY);
      pdf.setTextColor(50, 50, 50);
      pdf.text(data.count.toString(), margin + 125, startY);

      startY += 6;
    });
  }

  /**
   * ✅ ANALISI BUDGET MIGLIORATA
   */
  addBudgetAnalysis(pdf, reportData, pageWidth, startY) {
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(26, 26, 26);
    pdf.text('Budget vs Utilizzo', margin, startY);

    startY += 12;

    const budgetItems = reportData.budgetAnalysis.filter(b => b.limit > 0);

    if (!budgetItems.length) {
      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Nessun budget impostato', margin, startY);
      return;
    }

    // Header
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    pdf.setFillColor(248, 248, 248);
    pdf.rect(margin, startY, contentWidth, 7, 'F');

    pdf.text('Categoria', margin + 3, startY + 5);
    pdf.text('Limite', margin + 60, startY + 5);
    pdf.text('Speso', margin + 95, startY + 5);
    pdf.text('% Utilizzo', margin + 125, startY + 5);

    startY += 10;

    pdf.setFont('helvetica', 'normal');

    budgetItems.forEach((item, idx) => {
      // Sfondo alternato
      if (idx % 2 === 0) {
        pdf.setFillColor(252, 252, 252);
        pdf.rect(margin, startY - 3.5, contentWidth, 6, 'F');
      }

      pdf.setFontSize(9);
      pdf.setTextColor(50, 50, 50);
      pdf.text(item.category, margin + 3, startY);
      pdf.text(CryptoUtils.formatCurrency(item.limit), margin + 60, startY);
      pdf.text(CryptoUtils.formatCurrency(item.spent), margin + 95, startY);

      // Colore basato su utilizzo
      const pct = item.utilizationPct;
      if (pct >= 100) {
        pdf.setTextColor(200, 53, 50); // Rosso
      } else if (pct >= 80) {
        pdf.setTextColor(200, 122, 0); // Arancio
      } else {
        pdf.setTextColor(30, 123, 75); // Verde
      }

      pdf.setFont('helvetica', 'bold');
      pdf.text(`${pct.toFixed(1)}%`, margin + 125, startY);
      pdf.setFont('helvetica', 'normal');

      startY += 6;
    });
  }

  /**
   * ✅ LOG COMPLETO TRANSAZIONI
   */
  addFullLog(pdf, reportData, pageWidth, startY) {
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(26, 26, 26);
    pdf.text('Log Completo Transazioni', margin, startY);

    startY += 12;

    // Header tabella
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    pdf.setFillColor(248, 248, 248);
    pdf.rect(margin, startY, contentWidth, 6, 'F');

    pdf.text('Data', margin + 2, startY + 4);
    pdf.text('Categoria', margin + 25, startY + 4);
    pdf.text('Descrizione', margin + 60, startY + 4);
    pdf.text('Importo', margin + 120, startY + 4);

    startY += 8;

    // Righe spese
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(50, 50, 50);

    const pageHeight = pdf.internal.pageSize.getHeight();

    reportData.expenses.forEach((exp, idx) => {
      if (startY > pageHeight - 25) {
        pdf.addPage();
        startY = margin;
      }

      // Sfondo alternato
      if (idx % 2 === 0) {
        pdf.setFillColor(252, 252, 252);
        pdf.rect(margin, startY - 2.5, contentWidth, 5, 'F');
      }

      pdf.setFontSize(8);
      pdf.setTextColor(50, 50, 50);

      const date = new Date(exp.date).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit'
      });

      const categoryName = exp.category.replace(/^[\p{Emoji}]+\s*/u, '');
      const expName = exp.name.substring(0, 40);

      pdf.text(date, margin + 2, startY);
      pdf.text(categoryName, margin + 25, startY);
      pdf.text(expName, margin + 60, startY);
      pdf.text(CryptoUtils.formatCurrency(exp.amount), margin + 120, startY);

      startY += 5;
    });
  }

  /**
   * ✅ FOOTER MIGLIORATO CON NUMERO PAGINA
   */
  addFooter(pdf, reportData, pageWidth, pageHeight, pageNum, totalPages) {
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    
    const footerY = pageHeight - 10;
    const centerX = pageWidth / 2;

    // Numero pagina al centro
    pdf.text(`Pagina ${pageNum} di ${totalPages}`, centerX, footerY, { align: 'center' });

    // BudgeIT a sinistra
    pdf.setFontSize(7);
    pdf.setTextColor(180, 180, 180);
    pdf.text('BudgeIT v0.3', 15, footerY);

    // Profilo a destra
    pdf.text(reportData.profileName, pageWidth - 15, footerY, { align: 'right' });

    // Linea decorativa
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.5);
    pdf.line(15, pageHeight - 12, pageWidth - 15, pageHeight - 12);
  }

  /**
   * Crea schermata di progress
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

  updateProgress(screen, message, percentage) {
    const fill = screen.querySelector('#report-progress-fill');
    const msg = screen.querySelector('#report-progress-message');
    const pct = screen.querySelector('#report-progress-percentage');

    if (fill) fill.style.width = `${percentage}%`;
    if (msg) msg.textContent = message;
    if (pct) pct.textContent = `${percentage}%`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new ReportGenerator();