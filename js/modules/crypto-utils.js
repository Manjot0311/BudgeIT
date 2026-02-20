/**
 * Utility per operazioni crittografiche e di dati
 * Supporta hashing SHA-256 con fallback
 */

class CryptoUtils {
  /**
   * Hash SHA-256 con fallback a btoa
   */
  static async hashData(data) {
    if (typeof data !== 'string' || !data) return null;

    try {
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (e) {
      console.warn('SHA-256 non disponibile, fallback a btoa:', e);
      return btoa(data);
    }
  }

  /**
   * Formatta numero come valuta EUR
   */
  static formatCurrency(value) {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }

  /**
   * Formatta data in formato leggibile
   */
  static formatDate(dateString) {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * Genera timestamp leggibile
   */
  static getTimestamp() {
    const now = new Date();
    return now.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Genera ID univoco per documento
   */
  static generateDocumentId() {
    return 'DOC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  /**
   * Calcola statistiche per un array di spese
   */
  static calculateStats(expenses) {
    const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const count = expenses.length;
    const average = count > 0 ? total / count : 0;
    const max = count > 0 ? Math.max(...expenses.map(e => Number(e.amount || 0))) : 0;
    const min = count > 0 ? Math.min(...expenses.map(e => Number(e.amount || 0))) : 0;

    return { total, count, average, max, min };
  }

  /**
   * Raggruppa spese per categoria
   */
  static groupByCategory(expenses) {
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
  }

  /**
   * Calcola percentuali per categoria
   */
  static calculateCategoryPercentages(groupedData, total) {
    const result = {};
    Object.keys(groupedData).forEach(cat => {
      result[cat] = total > 0 ? ((groupedData[cat].total / total) * 100).toFixed(1) : 0;
    });
    return result;
  }
}

export default CryptoUtils;