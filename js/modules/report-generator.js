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

    // Tempo minimo di visibilità del loader: 800ms
    const minVisibilityStart = Date.now();

    try {
      const reportData = reportsConfig.buildReportData(config);

      if (!reportData.expenses.length) {
        throw new Error('Nessuna spesa trovata nel periodo selezionato');
      }

      const pdf = await this.buildPDF(reportData);

      // Garantisce almeno 800ms di loader visibile
      const elapsed = Date.now() - minVisibilityStart;
      if (elapsed < 800) await this.delay(800 - elapsed);

      const fileName = this.generateFileName(reportData);
      pdf.save(fileName);

      progressScreen.remove();
      this.isGenerating = false;

      return true;
    } catch (error) {
      console.error('Report generation failed:', error);
      const elapsed = Date.now() - minVisibilityStart;
      if (elapsed < 800) await this.delay(800 - elapsed);
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
   * Costruisce il PDF — struttura definitiva
   * Header → Titolo → Tabella → Totale (solo ultima pagina) → Footer
   */
  async buildPDF(reportData) {
    if (!window.jspdf) throw new Error('jsPDF non caricato');

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const mL    = 18;
    const mR    = 18;
    const mTop  = 32;
    const mBot  = 20;
    const contW = pageW - mL - mR;

    // 1. Header
    let y = this.addHeader(pdf, reportData, pageW, mL, mR, mTop);

    // 2. Tabella movimenti + totale in fondo
    this.addMovementsTable(pdf, reportData, pageW, pageH, mL, mR, mTop, mBot, contW, y);

    // 3. Footer su tutte le pagine
    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      this.addFooter(pdf, reportData, pageW, pageH, mL, mR, i, totalPages);
    }

    return pdf;
  }

  /**
   * HEADER istituzionale
   * Sinistra: BudgeIT bold
   * Destra: descrizione + periodo + data
   * Sotto: linea divisoria
   */
  addHeader(pdf, reportData, pageW, mL, mR, mTop) {
    const rightX = pageW - mR;

    // BudgeIT — 18pt bold
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(20, 20, 20);
    pdf.text('BudgeIT', mL, mTop);

    // Blocco destra — 8pt normale
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(80, 80, 80);
    pdf.text('Documento riepilogativo delle spese', rightX, mTop - 6, { align: 'right' });
    pdf.text(`Periodo: ${reportData.period}`,        rightX, mTop - 1, { align: 'right' });
    pdf.text(`Generato il: ${reportData.generatedAt}`, rightX, mTop + 4, { align: 'right' });

    // Linea divisoria
    const lineY = mTop + 9;
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(mL, lineY, pageW - mR, lineY);

    return lineY + 10;
  }

  /**
   * TABELLA MOVIMENTI
   * Titolo → header colonne → righe → totale contabile solo sull'ultima pagina
   */
  addMovementsTable(pdf, reportData, pageW, pageH, mL, mR, mTop, mBot, contW, startY) {
    const expenses = [...reportData.expenses].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const rowH    = 6;
    const footerH = 15; // spazio riservato al footer
    const totalH  = 14; // spazio riservato al totale contabile

    // ── Titolo sezione ──
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(20, 20, 20);
    pdf.text('Dettaglio movimenti registrati', mL, startY);
    startY += 8;

    // ── Funzione disegno header colonne ──
    const drawTableHeader = (y) => {
      pdf.setFillColor(240, 240, 240);
      pdf.rect(mL, y - 4, contW, 6.5, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(50, 50, 50);

      pdf.text('Data',         mL + 2,         y);
      pdf.text('Categoria',    mL + 26,         y);
      pdf.text('Descrizione',  mL + 68,         y);
      pdf.text('Importo (€)',  mL + contW - 2,  y, { align: 'right' });

      pdf.setDrawColor(160, 160, 160);
      pdf.setLineWidth(0.3);
      pdf.line(mL, y + 2.5, mL + contW, y + 2.5);

      return y + 6;
    };

    startY = drawTableHeader(startY);

    // ── Righe spese ──
    expenses.forEach((exp, idx) => {
      // Spazio necessario: riga + eventuale totale se è l'ultima riga
      const isLast    = idx === expenses.length - 1;
      const neededH   = rowH + (isLast ? totalH : 0);

      if (startY + neededH > pageH - mBot - footerH) {
        pdf.addPage();
        startY = this.addHeader(pdf, reportData, pageW, mL, mR, mTop);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(20, 20, 20);
        pdf.text('Dettaglio movimenti registrati', mL, startY);
        startY += 8;
        startY = drawTableHeader(startY);
      }

      // Sfondo riga alternato
      if (idx % 2 === 0) {
        pdf.setFillColor(251, 251, 251);
        pdf.rect(mL, startY - 3.5, contW, rowH, 'F');
      }

      // Linea riga
      pdf.setDrawColor(230, 230, 230);
      pdf.setLineWidth(0.15);
      pdf.line(mL, startY + 2.5, mL + contW, startY + 2.5);

      // Contenuto — 9pt
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(40, 40, 40);

      const date = new Date(exp.date).toLocaleDateString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });

      const cat = (exp.category || 'Altro')
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
        .replace(/[\u{2600}-\u{27BF}]/gu, '')
        .trim()
        .substring(0, 20);

      const desc   = (exp.name || '').substring(0, 38);
      const amount = this.formatAmount(exp.amount);

      pdf.text(date,   mL + 2,         startY);
      pdf.text(cat,    mL + 26,        startY);
      pdf.text(desc,   mL + 68,        startY);

      pdf.setFont('helvetica', 'bold');
      pdf.text(amount, mL + contW - 2, startY, { align: 'right' });

      startY += rowH;

      // ── TOTALE — solo dopo l'ultima riga ──
      if (isLast) {
        startY += 4; // respiro prima del totale

        // Linea sopra il totale
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.4);
        pdf.line(mL, startY, mL + contW, startY);

        startY += 5;

        // Mini-tabella invisibile a 2 colonne:
        // [spazio vuoto] | [Totale spese: € xxx]
        const totalLabel  = 'Totale spese:';
        const totalValue  = `\u20AC ${this.formatAmount(reportData.stats.total)}`;

        // Label — 10pt bold
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(20, 20, 20);
        pdf.text(totalLabel, mL + contW - 52, startY);

        // Valore — 11pt bold, allineato a destra con la colonna importo
        pdf.setFontSize(11);
        pdf.text(totalValue, mL + contW - 2, startY, { align: 'right' });
      }
    });
  }

  /**
   * Formatta importo: € 1.234,56
   * Usa metodo nativo per evitare problemi encoding
   */
  formatAmount(amount) {
    const num = Number(amount || 0);
    return num.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * FOOTER — presente su tutte le pagine
   * Sinistra: testo generazione + profilo
   * Destra: Pagina X di N
   */
  addFooter(pdf, reportData, pageW, pageH, mL, mR, pageNum, totalPages) {
    const footerY = pageH - 10;

    // Linea superiore footer
    pdf.setDrawColor(210, 210, 210);
    pdf.setLineWidth(0.3);
    pdf.line(mL, footerY - 5, pageW - mR, footerY - 5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(160, 160, 160);

    // Sinistra
    pdf.text(
      `Documento generato da BudgeIT per ${reportData.profileName}`,
      mL, footerY
    );

    // Destra
    pdf.text(
      `Pagina ${pageNum} di ${totalPages}`,
      pageW - mR, footerY,
      { align: 'right' }
    );
  }

  /**
   * Crea schermata di progress — minimal, indeterminata
   */
  createProgressScreen() {
    const overlay = document.createElement('div');
    overlay.id = 'report-progress-screen';
    overlay.className = 'report-progress-screen show';
    overlay.innerHTML = `
      <div class="report-progress-content">
        <div class="report-progress-title">Generazione documento finanziario</div>
        <div class="report-progress-subtitle">Stiamo preparando il documento.<br>Attendere qualche istante.</div>
        <div class="report-progress-track">
          <div class="report-progress-runner"></div>
        </div>
      </div>
    `;
    return overlay;
  }

  updateProgress(screen, message, percentage) {
    // Mantenuto per compatibilità, non usato nel nuovo design
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new ReportGenerator();