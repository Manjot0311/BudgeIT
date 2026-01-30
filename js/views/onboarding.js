import app from '../app.js';
import router from '../router.js';

const onboardingView = {
  async render() {
    const appEl = document.getElementById('app');
    appEl.innerHTML = this.getHTML();

    this.setupListeners();
  },

  getHTML() {
    return `
      <div class="onboarding-container">
        <div class="onboarding-icon">💰</div>
        <h1 class="onboarding-title">Benvenuto in BudgeIT</h1>
        <p class="onboarding-subtitle">Gestisci il tuo budget con eleganza e semplicità</p>

        <div class="onboarding-input">
          <label class="input-label">Nome profilo</label>
          <input type="text" class="input-field" id="profile-name" placeholder="es. Il mio budget">
        </div>

        <div class="onboarding-checkbox">
          <input type="checkbox" id="set-pin">
          <label class="onboarding-checkbox-label" for="set-pin">Voglio impostare un PIN</label>
        </div>

        <div class="onboarding-input" id="pin-container" style="display: none;">
          <label class="input-label">PIN (4 caratteri)</label>
          <input type="password" class="input-field" id="profile-pin" placeholder="****" maxlength="4">
        </div>

        <div class="onboarding-actions">
          <button class="btn btn-primary btn-full" onclick="App.completeOnboarding()">
            Inizia
          </button>
          <button class="btn btn-secondary btn-full" onclick="App.skipOnboarding()">
            Salta
          </button>
        </div>

        <div style="margin-top: 40px; text-align: center;">
          <p style="font-size: 12px; color: var(--text-tertiary);">v2.0 • Local-First • Nessun cloud</p>
        </div>
      </div>
    `;
  },

  setupListeners() {
    const pinCheckbox = document.getElementById('set-pin');
    const pinContainer = document.getElementById('pin-container');

    pinCheckbox.addEventListener('change', () => {
      pinContainer.style.display = pinCheckbox.checked ? 'block' : 'none';
    });
  },

  destroy() {
    // Cleanup
  }
};

export default onboardingView;
