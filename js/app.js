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
    router.register('home', homeView);
    router.register('expenses', expensesView);
    router.register('budget', budgetView);
    router.register('stats', statsView);
    router.register('onboarding', onboardingView);

    const profiles = storage.getProfiles();
    await router.navigate('onboarding', { mode: profiles.length ? 'login' : 'first' });

    const theme = storage.getSetting('theme') || 'auto';
    this.applyTheme(theme);
  }

  enterApp() {
    router.navigate('home');
  }

  /* ===================== THEME ===================== */
  applyTheme(theme) {
    const actual =
      theme === 'auto'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;

    document.documentElement.dataset.theme = actual;
    storage.setSetting('theme', theme);
  }

  setTheme(theme) {
    this.applyTheme(theme);
    this.showToast('Tema aggiornato');
  }

  /* ===================== CATEGORIE ===================== */

  toggleCategoryForm() {
    const form = document.getElementById('category-form');
    const icon = document.getElementById('category-toggle-icon');
    if (!form || !icon) return;

    const open = form.style.display === 'none';
    form.style.display = open ? 'flex' : 'none';
    icon.textContent = open ? '−' : '+';

    if (open) document.getElementById('new-category')?.focus();
    else {
      document.getElementById('new-category').value = '';
      document.getElementById('new-category-emoji').value = '';
    }
  }

  addCategoryUI() {
    const nameInput = document.getElementById('new-category');
    const emojiInput = document.getElementById('new-category-emoji');

    const name = nameInput?.value?.trim();
    const emoji = emojiInput?.value?.trim() || '📦';

    if (!name) {
      this.UI.toast.show('Inserisci un nome categoria', 'error');
      return;
    }

    const categories = storage.getCategories();
    if (categories.some(c => c.name === name)) {
      this.UI.toast.show('Categoria già esistente', 'error');
      return;
    }

    storage.addCategory({ name, emoji });

    nameInput.value = '';
    emojiInput.value = '';

    router.routes.budget?.populateCategories?.();
    router.routes.expenses?.populateCategories?.();

    this.UI.toast.show('Categoria aggiunta', 'success');
  }

  removeCategoryUI(name) {
    this.UI.alertModal.showConfirm({
      title: 'Elimina categoria',
      message: 'Le spese verranno spostate in "Altro". Continuare?',
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      onConfirm: () => {
        storage.removeCategory(name);

        router.routes.budget?.populateCategories?.();
        router.routes.budget?.renderBudgetList?.();
        router.routes.expenses?.populateCategories?.();
        router.routes.expenses?.renderExpenseList?.();

        this.showToast('Categoria eliminata');
      }
    });
  }

  /* ===================== iOS CATEGORY PICKER ===================== */

  showCategoryPicker() {
    const categories = storage.getCategories();
    if (!categories.length) {
      this.showAlert('Errore', 'Crea prima una categoria');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'ios-picker-overlay';

    overlay.innerHTML = `
      <div class="ios-picker-modal">
        <div class="ios-picker-header">
          <button class="ios-picker-cancel">Annulla</button>
          <div class="ios-picker-title">Seleziona categoria</div>
          <button class="ios-picker-done">Fine</button>
        </div>

        <div class="ios-picker-list">
          ${categories
            .map(
              c => `
            <div class="ios-picker-item" data-value="${this.escapeHtml(c.name)}">
              <span class="ios-picker-item-icon">${c.emoji}</span>
              <span class="ios-picker-item-name">${this.escapeHtml(c.name)}</span>
              <span class="ios-picker-item-check">✓</span>
            </div>`
            )
            .join('')}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    overlay.querySelector('.ios-picker-cancel').onclick = close;

    overlay.querySelector('.ios-picker-done').onclick = () => {
      const selected = overlay.querySelector('.ios-picker-item.selected');
      if (selected) this.applyPickedCategory(selected.dataset.value);
      close();
    };

    overlay.querySelectorAll('.ios-picker-item').forEach(item => {
      item.onclick = () => {
        overlay
          .querySelectorAll('.ios-picker-item')
          .forEach(i => i.classList.remove('selected'));

        item.classList.add('selected');
        this.applyPickedCategory(item.dataset.value);
        setTimeout(close, 160);
      };
    });

    overlay.onclick = e => {
      if (e.target === overlay) close();
    };

    setTimeout(() => overlay.classList.add('active'), 10);
  }

  applyPickedCategory(name) {
    const display = document.getElementById('selected-category-display');
    if (!display) return;

    display.textContent = name;
    display.dataset.value = name;
  }

  /* ===================== BUDGET ===================== */

  setBudgetUI() {
    const categoryEl = document.getElementById('selected-category-display');
    const amountEl = document.getElementById('budget-amount');

    const category = categoryEl?.dataset.value;
    const amount = parseFloat(amountEl?.value);

    if (!category) return this.showAlert('Errore', 'Seleziona una categoria');
    if (!amount || amount <= 0)
      return this.showAlert('Errore', 'Inserisci un importo valido');

    storage.setBudget(category, amount);

    categoryEl.textContent = 'Seleziona categoria';
    categoryEl.dataset.value = '';
    amountEl.value = '';

    budgetView.render();
    this.showToast('Budget impostato');
  }

  /* ===================== UTIL ===================== */

  showAlert(...args) {
    this.UI.alertModal.show(...args);
  }

  showToast(msg) {
    this.UI.toast.show(msg);
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

/* ===================== BOOT ===================== */

const app = new BudgeITApp();
window.App = app;

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', () => app.init())
  : app.init();

export default app;