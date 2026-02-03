import storage from '../storage.js';
import app from '../app.js';

const settingsModal = {
  isOpen: false,
  initialized: false,

  open() {
    const modalEl = this.getOrCreateModal();
    modalEl.classList.add('show');
    this.isOpen = true;

    // listener UNA SOLA VOLTA
    if (!this.initialized) {
      this.setupListeners();
      this.initialized = true;
    }
  },

  close() {
    const modalEl = document.getElementById('settings-modal');
    if (modalEl) modalEl.classList.remove('show');
    this.isOpen = false;
  },

  refresh() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.querySelector('.modal-content').innerHTML = this.getContentHTML();
    this.syncThemeButtons();
  },

  getOrCreateModal() {
    let modal = document.getElementById('settings-modal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'settings-modal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          ${this.getContentHTML()}
        </div>
      `;
      document.getElementById('modals-root').appendChild(modal);
    } else {
      this.refresh();
    }

    return modal;
  },

  getContentHTML() {
    const profiles = storage.getProfiles();
    const activeProfile = storage.getActiveProfile();

    return `
      <div class="modal-header">
        <div class="modal-title">Impostazioni</div>
        <button class="modal-close" onclick="App.UI.settingsModal.close()">✕</button>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Profilo</div>

        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-label">Profilo attivo</div>
            <div style="font-weight:500">
              ${app.escapeHtml(activeProfile?.name || '—')}
            </div>
          </div>

          <div class="settings-item settings-btn-row">
            <button class="btn btn-secondary btn-row"
              onclick="App.renameProfileUI(); App.UI.settingsModal.close();">
              Rinomina profilo
            </button>
            <button class="btn btn-secondary btn-row"
              onclick="App.switchProfileFromSettings()">
              Cambia profilo
            </button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Aspetto</div>

        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-label">Tema</div>
            <div class="theme-toggle">
              <button class="toggle-btn" data-theme="light"
                onclick="App.setTheme('light'); App.UI.settingsModal.syncThemeButtons();">Chiaro</button>
              <button class="toggle-btn" data-theme="auto"
                onclick="App.setTheme('auto'); App.UI.settingsModal.syncThemeButtons();">Auto</button>
              <button class="toggle-btn" data-theme="dark"
                onclick="App.setTheme('dark'); App.UI.settingsModal.syncThemeButtons();">Scuro</button>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Dati</div>

        <div class="settings-group">
          <div class="settings-item settings-btn-row">
            <button class="btn btn-secondary btn-row"
              onclick="App.exportDataUI()">
              Esporta dati
            </button>
            <input type="file" id="import-file" accept=".json"
              style="display:none"
              onchange="App.importDataUI(event)">
            <button class="btn btn-secondary btn-row"
              onclick="document.getElementById('import-file').click()">
              Importa dati
            </button>
          </div>
        </div>
      </div>

    `;
  },

  setupListeners() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });

    this.syncThemeButtons();
  },

  syncThemeButtons() {
    // Prendi il tema salvato (profilo) o fallback al dataset attuale
    const themeFromStorage = storage.getSetting('theme');
    const currentTheme = themeFromStorage || document.documentElement.dataset.theme || 'auto';

    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.classList.toggle(
        'active',
        btn.dataset.theme === currentTheme
      );
    });
  }
};

export default settingsModal;