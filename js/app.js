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

class BudgeITApp {
  constructor() {
    this.initialized = false;
    this.UI = {
      settingsModal,
      alertModal,
      toastNotification
    };
  }

  async init() {
    try {
      console.log('🚀 BudgeIT v2.0 booting...');

      // Registra tutte le rotte
      router.register('home', homeView);
      router.register('expenses', expensesView);
      router.register('budget', budgetView);
      router.register('stats', statsView);
      router.register('onboarding', onboardingView);

      // Controlla stato
      const profiles = storage.getAllProfiles();

      if (profiles.length === 0) {
        console.log('📋 First boot - show onboarding');
        await router.navigate('onboarding');
      } else {
        const lastActiveId = storage.data.activeProfileId;
        const profileToLoad = lastActiveId ? 
          storage.getProfile(lastActiveId) : 
          profiles[0];

        if (profileToLoad) {
          storage.setActiveProfile(profileToLoad.id);
          appState.setActiveProfile(profileToLoad.id);
          console.log('✅ Profile loaded:', profileToLoad.name);
          await router.navigate('home');
        }
      }

      // Setup listeners
      appState.onStateChange(({ event, data }) => {
        if (event === 'profile-changed') {
          console.log('👤 Profile changed:', data.profileId);
        }
      });

      // Apply theme
      const theme = storage.getSetting('theme') || 'auto';
      this.applyTheme(theme);

      this.initialized = true;
      console.log('✅ App initialized');
    } catch (e) {
      console.error('❌ App init failed:', e);
      this.showErrorUI();
    }
  }

  showErrorUI() {
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="
          padding: 40px 20px;
          text-align: center;
          font-family: system-ui, -apple-system, sans-serif;
        ">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <h1 style="font-size: 20px; margin-bottom: 8px; color: var(--text-primary);">Errore applicazione</h1>
          <p style="color: var(--text-secondary); margin-bottom: 24px;">
            Si è verificato un problema. Prova a ricaricare.
          </p>
          <button onclick="location.reload()" style="
            padding: 12px 24px;
            background: var(--accent);
            color: var(--bg-primary);
            border: none;
            border-radius: var(--radius);
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
          ">
            Ricarica
          </button>
        </div>
      `;
    }
  }

  createProfile(name, pin = null) {
    const profileId = storage.createProfile(name, pin);
    storage.setActiveProfile(profileId);
    appState.setActiveProfile(profileId);
    return profileId;
  }

  switchProfile(profileId, pin = null) {
    if (storage.getProfile(profileId)?.pin) {
      if (!storage.verifyPin(profileId, pin)) {
        throw new Error('PIN non valido');
      }
    }
    storage.setActiveProfile(profileId);
    appState.setActiveProfile(profileId);
    return true;
  }

  applyTheme(theme) {
    let actualTheme = theme;
    
    if (theme === 'auto') {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        actualTheme = 'dark';
      } else {
        actualTheme = 'light';
      }
    }
    
    document.documentElement.setAttribute('data-theme', actualTheme);
    
    document.querySelectorAll('.toggle-btn').forEach(b => {
      b.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`.toggle-btn[data-theme="${theme}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }

  setTheme(theme) {
    storage.setSetting('theme', theme);
    this.applyTheme(theme);
    this.UI.toastNotification.show(`Tema: ${theme === 'auto' ? 'Automatico' : theme === 'light' ? 'Chiaro' : 'Scuro'}`);
  }

  openSettings() {
    this.UI.settingsModal.open();
  }

  closeSettings() {
    this.UI.settingsModal.close();
  }

  showAlert(title, message, isConfirm = false, onConfirm = null) {
    this.UI.alertModal.show(title, message, isConfirm, onConfirm);
  }

  showToast(message) {
    this.UI.toastNotification.show(message);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

const app = new BudgeITApp();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

window.App = app;
export default app;
