// ===================== IMPORTS =====================
import storage from './storage.js';
import appState from './state.js';
import router from './router.js';

import homeView from './views/home.js';
import expensesView from './views/expenses.js';
import budgetView from './views/budget.js';
import statsView from './views/stats.js';
import onboardingView from './views/onboarding.js';

import settingsModal from './ui/settings-modal.js';
import alertModal from './ui/alert-modal.js';
import toastNotification from './ui/toast.js';

// ===================== APP =====================
class BudgeITApp {
  constructor() {
    this.initialized = false;

    this.UI = {
      settingsModal,
      alertModal,
      toastNotification
    };

    // state UI interno (ex window.*)
    this.editingBudgetCategory = null;
    this.calendarPickerDate = null;
    this.calendarPickerTarget = null;
  }

  // ===================== INIT =====================
  async init() {
    try {
      console.log('🚀 BudgeIT v4 booting...');

      router.register('home', homeView);
      router.register('expenses', expensesView);
      router.register('budget', budgetView);
      router.register('stats', statsView);
      router.register('onboarding', onboardingView);

      const profiles = storage.getAllProfiles();

      if (profiles.length === 0) {
        await router.navigate('onboarding');
      } else {
        const lastActiveId = storage.data.activeProfileId;
        const profileToLoad = lastActiveId
          ? storage.getProfile(lastActiveId)
          : profiles[0];

        if (profileToLoad) {
          storage.setActiveProfile(profileToLoad.id);
          appState.setActiveProfile(profileToLoad.id);
          await router.navigate('home');
        }
      }

      appState.onStateChange(({ event, data }) => {
        if (event === 'profile-changed') {
          console.log('👤 Profile changed:', data.profileId);
        }
      });

      const theme = storage.getSetting('theme') || 'auto';
      this.applyTheme(theme);

      this.initialized = true;
      console.log('✅ App initialized');
    } catch (e) {
      console.error('❌ App init failed:', e);
      this.showErrorUI();
    }
  }

  // ===================== CORE =====================
  showErrorUI() {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div style="padding:40px;text-align:center;font-family:system-ui">
        <div style="font-size:48px">⚠️</div>
        <h2>Errore applicazione</h2>
        <p>Prova a ricaricare la pagina</p>
        <button onclick="location.reload()">Ricarica</button>
      </div>
    `;
  }

  createProfile(name, pin = null) {
    const id = storage.createProfile(name, pin);
    storage.setActiveProfile(id);
    appState.setActiveProfile(id);
    return id;
  }

  switchProfile(profileId, pin = null) {
    if (storage.getProfile(profileId)?.pin) {
      if (!storage.verifyPin(profileId, pin)) {
        throw new Error('PIN non valido');
      }
    }
    storage.setActiveProfile(profileId);
    appState.setActiveProfile(profileId);
  }

  applyTheme(theme) {
    let actual = theme;
    if (theme === 'auto') {
      actual = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    document.documentElement.setAttribute('data-theme', actual);

    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.toggle-btn[data-theme="${theme}"]`)?.classList.add('active');
  }

  setTheme(theme) {
    storage.setSetting('theme', theme);
    this.applyTheme(theme);
    this.UI.toastNotification.show(`Tema: ${theme}`);
  }

  openSettings() { this.UI.settingsModal.open(); }
  closeSettings() { this.UI.settingsModal.close(); }
  showAlert(...args) { this.UI.alertModal.show(...args); }
  showToast(msg) { this.UI.toastNotification.show(msg); }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ===================== NAVIGATION =====================
  async switchView(view) {
    const views = ['home', 'expenses', 'budget', 'stats'];
    if (!views.includes(view)) return;

    const tabs = document.getElementById('tabs');
    if (tabs) {
      tabs.classList.toggle('visible', view !== 'home');
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      const idx = ['expenses', 'budget', 'stats'].indexOf(view);
      if (idx >= 0) document.querySelectorAll('.tab')[idx]?.classList.add('active');
    }

    await router.navigate(view);
  }

  // ===================== ONBOARDING =====================
  async completeOnboarding() {
    const name = document.getElementById('profile-name').value.trim();
    const setPin = document.getElementById('set-pin').checked;
    const pin = setPin ? document.getElementById('profile-pin').value.trim() : null;

    if (!name) return this.showAlert('Errore', 'Inserisci un nome profilo');
    if (setPin && (!pin || pin.length < 4))
      return this.showAlert('Errore', 'PIN minimo 4 caratteri');

    this.createProfile(name, pin);
    this.showToast('Profilo creato 🎉');
    await this.switchView('home');
  }

  async skipOnboarding() {
    this.createProfile('Il mio budget');
    await this.switchView('home');
  }

  // ===================== EXPENSES =====================
  async saveExpenseUI() {
    const name = document.getElementById('expense-name').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    const date = document.getElementById('expense-date').value;
    const notes = document.getElementById('expense-notes').value.trim();

    if (!name || !amount || !category || !date)
      return this.showAlert('Errore', 'Campi obbligatori');

    if (amount <= 0)
      return this.showAlert('Errore', 'Importo non valido');

    storage.addExpense({ name, amount, category, date, notes });

    document.getElementById('expense-name').value = '';
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-category').value = '';
    document.getElementById('expense-date').valueAsDate = new Date();
    document.getElementById('expense-notes').value = '';

    this.showToast('Spesa aggiunta');
    router.routes['expenses']?.renderExpenseList();
  }

  async deleteExpenseUI(id) {
    this.showAlert('Elimina spesa', 'Confermi?', true, () => {
      storage.deleteExpense(id);
      this.showToast('Spesa eliminata');
      router.routes['expenses']?.renderExpenseList();
    });
  }

  changeExpenseMonth(delta) {
    const v = router.routes['expenses'];
    if (!v) return;
    v.currentMonth = new Date(v.currentMonth.getFullYear(), v.currentMonth.getMonth() + delta, 1);
    v.setupHeader();
    v.renderExpenseList();
  }

  applyExpenseFilters() {
    const v = router.routes['expenses'];
    if (!v) return;
    v.filterCategory = document.getElementById('filter-category').value;
    v.filterSort = document.getElementById('filter-sort').value;
    v.renderExpenseList();
    this.showToast('Filtri applicati');
  }

  clearExpenseFilters() {
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-sort').value = 'date-desc';
    const v = router.routes['expenses'];
    if (!v) return;
    v.filterCategory = '';
    v.filterSort = 'date-desc';
    v.renderExpenseList();
    this.showToast('Filtri resettati');
  }

  // ===================== CATEGORIES =====================
  async addCategoryUI() {
    const input = document.getElementById('new-category');
    const name = input.value.trim();

    if (!name) return this.showAlert('Errore', 'Nome mancante');
    if (storage.getCategories().includes(name))
      return this.showAlert('Errore', 'Categoria esistente');

    storage.addCategory(name);
    router.routes['budget']?.populateCategories();
    router.routes['expenses']?.populateCategories();
    input.value = '';
    this.showToast('Categoria aggiunta');
  }

  async removeCategoryUI(name) {
    this.showAlert(
      'Elimina categoria',
      `Vuoi eliminare "${this.escapeHtml(name)}"?`,
      true,
      () => {
        storage.removeCategory(name);
        router.routes['budget']?.renderBudgetList();
        router.routes['expenses']?.populateCategories();
        this.showToast('Categoria eliminata');
      }
    );
  }

  // ===================== BUDGET =====================
  async setBudgetUI() {
    const cat = document.getElementById('budget-category').value;
    const amt = parseFloat(document.getElementById('budget-amount').value);
    if (!cat || amt <= 0)
      return this.showAlert('Errore', 'Dati non validi');

    storage.setBudget(cat, amt);
    router.routes['budget']?.renderBudgetList();
    document.getElementById('budget-category').value = '';
    document.getElementById('budget-amount').value = '';
    this.showToast('Budget impostato');
  }

  openBudgetEdit(category) {
    const modal = this.getOrCreateBudgetEditModal();
    document.getElementById('edit-budget-category').value = category;
    document.getElementById('edit-budget-amount').value = storage.getBudgets()[category];
    this.editingBudgetCategory = category;
    modal.classList.add('show');
  }

  closeBudgetEdit() {
    document.getElementById('budget-edit-modal')?.classList.remove('show');
    this.editingBudgetCategory = null;
  }

  saveBudgetEdit() {
    const amt = parseFloat(document.getElementById('edit-budget-amount').value);
    if (amt <= 0) return this.showAlert('Errore', 'Importo non valido');

    this.showAlert('Conferma', 'Salvare modifica?', true, () => {
      storage.setBudget(this.editingBudgetCategory, amt);
      router.routes['budget']?.renderBudgetList();
      this.closeBudgetEdit();
      this.showToast('Budget modificato');
    });
  }

  getOrCreateBudgetEditModal() {
    let m = document.getElementById('budget-edit-modal');
    if (m) return m;

    m = document.createElement('div');
    m.id = 'budget-edit-modal';
    m.className = 'modal';
    m.innerHTML = `...`;
    document.getElementById('modals-root').appendChild(m);
    return m;
  }

  // ===================== STATS =====================
  changeStatsMonth(delta) {
    const v = router.routes['stats'];
    if (!v) return;
    v.currentMonth = new Date(v.currentMonth.getFullYear(), v.currentMonth.getMonth() + delta, 1);
    v.setupHeader();
    v.updateStats();
    v.renderBreakdown();
  }

  // ===================== PROFILE =====================
  async switchProfileUI() {
    const id = document.getElementById('profile-selector').value;
    if (!id) return;
    const p = storage.getProfile(id);
    if (!p) return;

    if (p.pin) {
      const pin = prompt('Inserisci PIN');
      if (!pin) return;
      this.switchProfile(id, pin);
    } else {
      this.switchProfile(id);
    }

    this.closeSettings();
    this.showToast(`Accesso a ${p.name}`);
    await this.switchView('home');
  }

  // ===================== DATA =====================
  exportDataUI() {
    const json = storage.exportProfileJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `budgetit_backup.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.showToast('Dati esportati');
  }

  importDataUI(e) {
    const file = e.target.files[0];
    if (!file) return;

    const r = new FileReader();
    r.onload = () => {
      storage.importProfileJSON(r.result);
      router.routes['expenses']?.renderExpenseList();
      router.routes['budget']?.renderBudgetList();
      router.routes['stats']?.updateStats();
      this.showToast('Dati importati');
    };
    r.readAsText(file);
    e.target.value = '';
  }
}

// ===================== BOOT =====================
const app = new BudgeITApp();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

window.App = app;
export default app;
