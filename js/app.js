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
import toast from './ui/toast.js';

class BudgeITApp {
  constructor() {
    this.UI = { settingsModal, alertModal, toast };
  }

  /* ===================== INIT ===================== */
  async init() {
    router.register('home',       homeView);
    router.register('expenses',   expensesView);
    router.register('budget',     budgetView);
    router.register('stats',      statsView);
    router.register('onboarding', onboardingView);

    const profiles = storage.getProfiles();
    await router.navigate('onboarding', { mode: profiles.length ? 'login' : 'first' });

    const theme = storage.getSetting('theme') || 'auto';
    this.applyTheme(theme);

    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('service-worker.js');
        console.log('Service worker registrato');
      } catch (e) {
        console.warn('Service worker registration failed', e);
      }
    }
  }

  enterApp() {
    router.navigate('home');
  }

  /* ===================== THEME ===================== */
  applyTheme(theme) {
    const actual = theme === 'auto'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : theme;
    document.documentElement.dataset.theme = actual;
    storage.setSetting('theme', theme);
  }

  setTheme(theme) {
    this.applyTheme(theme);
    this.showToast('Tema aggiornato');
  }

  /* ===================== PROFILI ===================== */
  createProfileUI() {
    this.UI.alertModal.showInput(
      'Nuovo profilo',
      'Inserisci il nome del profilo',
      'text',
      (name) => {
        const clean = name?.trim();
        if (!clean) { return this.showAlert('Errore', 'Nome profilo mancante'); }
        this.createProfile(clean);
      }
    );
  }

  selectProfileUI(profileId) {
    const profile = storage.getProfile(profileId);
    if (!profile) return;

    if (profile.pin) {
      this.UI.alertModal.showInput(
        'Profilo protetto',
        'Inserisci PIN',
        'password',
        (pin) => this.loginProfile(profileId, pin)
      );
    } else {
      this.loginProfile(profileId);
    }
  }

  loginProfile(profileId, pin = null) {
    if (!storage.verifyPin(profileId, pin)) {
      this.showAlert('Errore', 'PIN non valido');
      return;
    }
    appState.reset();
    storage.setActiveProfile(profileId);
    appState.notify('profile-changed', { profileId });
    this.enterApp();
  }

  createProfile(name, pin = null) {
    const id = storage.createProfile(name, pin);
    appState.reset();
    appState.notify('profile-changed', { profileId: id });
    this.enterApp();
    this.showToast('Profilo creato');
  }

  switchProfileFromSettings() {
    storage.clearActiveProfile();
    appState.reset();
    router.navigate('onboarding', { mode: 'switch' });
    this.UI.settingsModal.close();
  }

  renameProfileUI() {
    const profile = storage.getActiveProfile();
    if (!profile) return;

    this.UI.alertModal.showInput(
      'Rinomina profilo',
      'Inserisci il nuovo nome',
      'text',
      (name) => {
        const clean = name?.trim();
        if (!clean) return;
        storage.renameProfile(profile.id, clean);
        appState.notify('profile-renamed', { profileId: profile.id, name: clean });
        this.UI.settingsModal.open();
        this.showToast('Profilo rinominato');
      },
      profile.name
    );
  }

  /* ===================== BUDGET ===================== */
  showCategoryPicker() {
    const categories = storage.getCategories();
    if (!categories.length) {
      this.showAlert('Errore', 'Crea prima una categoria');
      return;
    }

    // Crea overlay
    const overlay = document.createElement('div');
    overlay.className = 'ios-picker-overlay';
    overlay.innerHTML = `
      <div class="ios-picker-modal">
        <div class="ios-picker-header">
          <button class="ios-picker-cancel">Annulla</button>
          <div  class="ios-picker-title">Seleziona categoria</div>
          <button class="ios-picker-done">Fine</button>
        </div>
        <div class="ios-picker-list">
          ${categories.map(cat => {
            const icon     = this.getCategoryIcon(cat);
            const escaped  = this.escapeHtml(cat);
            return `
              <div class="ios-picker-item" data-value="${escaped}">
                <span class="ios-picker-item-icon">${icon}</span>
                <span class="ios-picker-item-name">${escaped}</span>
                <span class="ios-picker-item-check">&#x2713;</span>
              </div>`;
          }).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // ── event listeners ──────────────────────────────
    const closeOverlay = () => overlay.remove();

    overlay.querySelector('.ios-picker-cancel')
      .addEventListener('click', closeOverlay);

    overlay.querySelector('.ios-picker-done')
      .addEventListener('click', () => {
        const selected = overlay.querySelector('.ios-picker-item.selected');
        if (selected) {
          const categoryName = selected.dataset.value;
          const displayEl    = document.getElementById('selected-category-display');
          if (displayEl) {
            displayEl.textContent  = categoryName;
            displayEl.dataset.value = categoryName;
          }
        }
        closeOverlay();
      });

    // Click su item → seleziona + chiudi dopo flash
    overlay.querySelectorAll('.ios-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        overlay.querySelectorAll('.ios-picker-item')
          .forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');

        const categoryName = item.dataset.value;
        const displayEl    = document.getElementById('selected-category-display');
        if (displayEl) {
          displayEl.textContent  = categoryName;
          displayEl.dataset.value = categoryName;
        }
        setTimeout(() => closeOverlay(), 200);
      });
    });

    // Click sul fondo grigio → chiudi
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });

    // Anima entrata
    setTimeout(() => overlay.classList.add('active'), 10);
  }

  // Mappa categoria → emoji (stringa JS, non HTML)
  getCategoryIcon(cat) {
    const map = {
      Alimentari: '\uD83D\uDED2',   // 🛒
      Trasporti:  '\uD83D\uDE97',   // 🚗
      Casa:       '\uD83C\uDFE0',   // 🏠
      Svago:      '\uD83C\uDFAE',   // 🎮
      Salute:     '\uD83D\uDC8A',   // 💊
      Altro:      '\uD83D\uDCE6'    // 📦
    };
    return map[cat] || '\uD83D\uDCE6'; // default 📦
  }

  setBudgetUI() {
    const categoryDisplay = document.getElementById('selected-category-display');
    const category = categoryDisplay ? categoryDisplay.dataset.value : null;
    const amount   = parseFloat(document.getElementById('budget-amount').value);

    if (!category) {
      this.showAlert('Errore', 'Seleziona una categoria');
      return;
    }
    if (!amount || amount <= 0) {
      this.showAlert('Errore', 'Inserisci un importo valido');
      return;
    }

    storage.setBudget(category, amount);

    // Reset form
    categoryDisplay.textContent  = 'Seleziona categoria';
    categoryDisplay.dataset.value = '';
    document.getElementById('budget-amount').value = '';

    budgetView.render();
    this.showToast('Budget impostato');
  }

  editBudgetUI(category) {
    const current = storage.getBudgets()[category];
    if (current == null) return;

    this.UI.alertModal.showInput(
      'Modifica budget',
      `Nuovo limite mensile per "${category}"`,
      'number',
      (value) => {
        const amount = parseFloat(value);
        if (isNaN(amount) || amount <= 0) return;
        storage.setBudget(category, amount);
        appState.notify('budget-updated', { category, amount });
        router.routes.budget?.renderBudgetList();
        this.showToast('Budget aggiornato');
      },
      current
    );
  }

  /* ===================== CATEGORIE ===================== */
  toggleCategoryForm() {
    const form = document.getElementById('category-form');
    const icon = document.getElementById('category-toggle-icon');
    if (!form || !icon) return;

    if (form.style.display === 'none') {
      form.style.display = 'flex';
      icon.textContent   = '&#x2212;'; // −
      const input = document.getElementById('new-category');
      if (input) input.focus();
    } else {
      form.style.display = 'none';
      icon.textContent   = '+';
      const input = document.getElementById('new-category');
      if (input) input.value = '';
    }
  }

  addCategoryUI() {
    const nameInput  = document.getElementById('new-category');
    const emojiInput = document.getElementById('new-category-emoji');
    const name       = nameInput?.value?.trim();
    const emoji      = emojiInput?.value?.trim() || '\uD83D\uDCE6'; // 📦

    if (!name) {
      this.UI.toast.show('Inserisci un nome', 'error');
      return;
    }
    if (!emoji) {
      this.UI.toast.show('Inserisci un\'emoji', 'error');
      return;
    }

    const categories = storage.getCategories();
    if (categories.includes(name)) {
      this.UI.toast.show('Categoria già esistente', 'error');
      return;
    }

    storage.addCategory({ name, emoji });

    // Reset inputs
    nameInput.value  = '';
    emojiInput.value = '';

    // Refresh view
    this.currentView?.populateCategories?.();
    this.UI.toast.show('Categoria aggiunta', 'success');
  }

  removeCategoryUI(name) {
    this.UI.alertModal.showConfirm({
      title:       'Elimina categoria',
      message:     'Le spese verranno spostate in "Altro". Continuare?',
      confirmText: 'Elimina',
      cancelText:  'Annulla',
      onConfirm:   () => {
        const active = storage.getActiveProfile();
        if (!active) return;

        storage.removeCategory(name);
        appState.notify('categories-changed', { profileId: active.id });

        router.routes.budget?.populateCategories?.();
        router.routes.budget?.renderBudgetList?.();
        router.routes.expenses?.populateCategories?.();
        router.routes.expenses?.renderExpenseList?.();
        this.showToast('Categoria eliminata');
      }
    });
  }

  /* ===================== EXPENSES ===================== */
  saveExpenseUI() {
    const nameEl     = document.getElementById('expense-name');
    const amountEl   = document.getElementById('expense-amount');
    const categoryEl = document.getElementById('expense-category');
    const dateEl     = document.getElementById('expense-date');
    const notesEl    = document.getElementById('expense-notes');

    const name     = nameEl?.value?.trim();
    const amount   = parseFloat(amountEl?.value);
    const category = categoryEl?.value || 'Altro';
    const today    = new Date().toISOString().slice(0, 10);
    const date     = dateEl?.value || today;

    // ❌ BLOCCO SPESE FUTURE
    if (date > today) {
      return this.showAlert('Data non valida', 'Non puoi registrare spese future');
    }

    const notes = notesEl?.value?.trim();

    if (!name) {
      return this.showAlert('Errore', 'Nome spesa mancante');
    }
    if (isNaN(amount) || amount <= 0) {
      return this.showAlert('Errore', 'Importo non valido');
    }

    storage.addExpense({ name, amount, category, date, notes });

    // Reset campi
    if (nameEl)     nameEl.value     = '';
    if (amountEl)   amountEl.value   = '';
    if (categoryEl) categoryEl.value = '';
    if (dateEl)     dateEl.value     = today;
    if (notesEl)    notesEl.value    = '';

    router.routes.expenses?.renderExpenseList?.();
    router.routes.home?.updateStats?.();
    this.showToast('Spesa salvata');
  }

  deleteExpenseUI(id) {
    this.UI.alertModal.showConfirm({
      title:       'Elimina spesa',
      message:     'Sei sicuro?',
      confirmText: 'Elimina',
      cancelText:  'Annulla',
      onConfirm:   () => {
        storage.deleteExpense(id);
        router.routes.expenses?.renderExpenseList?.();
        router.routes.home?.updateStats?.();
        this.showToast('Spesa eliminata');
      }
    });
  }

  /* ===================== STATS ===================== */
  changeStatsMonth(delta) {
    const stats = router.routes.stats;
    if (!stats) return;
    stats.currentMonth.setMonth(stats.currentMonth.getMonth() + delta);
    stats.update();
  }

  /* ===================== UTIL ===================== */
  switchView(name, params = {}) {
    router.navigate(name, params);
  }

  openSettings() {
    this.UI.settingsModal.refresh();
    this.UI.settingsModal.open();
  }

  showAlert(...args) {
    this.UI.alertModal.show(...args);
  }

  showToast(message) {
    this.UI.toast.show(message);
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }
}

/* ===================== BOOT ===================== */
const app = new BudgeITApp();
window.App = app;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

export default app;