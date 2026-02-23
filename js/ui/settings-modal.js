import storage from '../storage.js';
import app from '../app.js';

const settingsModal = {
  isOpen:      false,
  initialized: false,

  open() {
    const modalEl = this.getOrCreateModal();
    modalEl.classList.add('show');
    this.isOpen = true;

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
    this.syncThemeToggle();
  },

  getOrCreateModal() {
    let modal = document.getElementById('settings-modal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id        = 'settings-modal';
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
    const activeProfile = storage.getActiveProfile();
    const theme = storage.getSetting('theme') || 'auto';

    return `
      <!-- ══════════════════════════════════════════════════════
           HEADER
           ══════════════════════════════════════════════════════ -->
      <div class="modal-header">
        <div class="modal-title">Impostazioni</div>
        <button class="modal-close" onclick="App.UI.settingsModal.close()">&times;</button>
      </div>

      <!-- ══════════════════════════════════════════════════════
           PROFILO CARD - Top Section
           ══════════════════════════════════════════════════════ -->
      <div class="settings-profile-card">
        <div class="settings-profile-card-avatar">
          <span class="settings-profile-card-avatar-initial">${this.getInitial(activeProfile?.name)}</span>
          <span class="settings-profile-card-status-dot"></span>
        </div>
        <div class="settings-profile-card-info">
          <div class="settings-profile-card-name">${app.escapeHtml(activeProfile?.name || 'Profilo')}</div>
          <div class="settings-profile-card-subtitle">Rinomina Profilo</div>
        </div>
        <button class="settings-profile-card-chevron" onclick="App.renameProfileUI(); App.UI.settingsModal.refresh();">›</button>
      </div>

      <!-- ══════════════════════════════════════════════════════
           GENERALE SECTION
           ══════════════════════════════════════════════════════ -->
      <div class="settings-section">
        <div class="settings-section-title">GENERALE</div>
        
        <!-- Dark Mode Toggle -->
        <div class="settings-item-container">
          <div class="settings-item-with-icon">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            </div>
            <div class="settings-item-label">Dark mode</div>
            <div class="settings-theme-toggle">
              <input type="checkbox" id="dark-mode-toggle" 
                     ${theme === 'dark' ? 'checked' : ''} 
                     onchange="App.setTheme(this.checked ? 'dark' : 'light'); App.UI.settingsModal.syncThemeToggle();">
              <label for="dark-mode-toggle" class="toggle-slider"></label>
            </div>
          </div>
        </div>

        <!-- Dati -->
        <button class="settings-item-with-icon settings-item-button" onclick="App.UI.settingsModal.openDataSection()">
          <div class="settings-item-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </div>
          <div class="settings-item-label">Dati</div>
          <span class="settings-item-chevron">›</span>
        </button>

        <!-- Notifiche -->
        <button class="settings-item-with-icon settings-item-button">
          <div class="settings-item-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <div class="settings-item-label">Notifiche</div>
          <span class="settings-item-chevron">›</span>
        </button>
      </div>

      <!-- ══════════════════════════════════════════════════════
           ACCOUNT SECTION
           ══════════════════════════════════════════════════════ -->
      <div class="settings-section">
        <div class="settings-section-title">ACCOUNT</div>
        
        <!-- Modifica PIN -->
        <button class="settings-item-with-icon settings-item-button" onclick="App.editPinUI(); App.UI.settingsModal.refresh();">
          <div class="settings-item-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <div class="settings-item-label">Modifica PIN</div>
          <span class="settings-item-chevron">›</span>
        </button>

        <!-- Privacy e Sicurezza -->
        <button class="settings-item-with-icon settings-item-button" onclick="App.UI.settingsModal.openPrivacySection()">
          <div class="settings-item-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <div class="settings-item-label">Privacy e Sicurezza</div>
          <span class="settings-item-chevron">›</span>
        </button>

        <!-- Esci (Logout) -->
        <button class="settings-item-with-icon settings-item-button settings-item-danger" onclick="App.switchProfileFromSettings()">
          <div class="settings-item-icon settings-item-icon-danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 3 5 7 9 11"></polyline>
              <path d="M20 20H7a2 2 0 0 1-2-2V9"></path>
            </svg>
          </div>
          <div class="settings-item-label settings-item-label-danger">Esci</div>
          <span class="settings-item-chevron">›</span>
        </button>
      </div>

      <!-- ══════════════════════════════════════════════════════
           HIDDEN SECTIONS (Aperte dinamicamente)
           ══════════════════════════════════════════════════════ -->
      
      <!-- Sezione Dati (nascosta) -->
      <div id="data-section" style="display:none;">
        <div class="settings-section-header">
          <button class="settings-back-button" onclick="App.UI.settingsModal.closeDataSection()">‹</button>
          <div class="settings-section-title">Dati</div>
          <div style="width:36px"></div>
        </div>

        <div class="settings-section">
          <button class="settings-item-with-icon settings-item-button" onclick="App.exportDataUI()">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
            <div class="settings-item-label">Esporta dati</div>
            <span class="settings-item-chevron">›</span>
          </button>

          <button class="settings-item-with-icon settings-item-button" onclick="document.getElementById('import-file').click()">
            <div class="settings-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <div class="settings-item-label">Importa dati</div>
            <span class="settings-item-chevron">›</span>
          </button>

          <input type="file" id="import-file" accept=".json"
                 style="display:none"
                 onchange="App.importDataUI(event)">
        </div>
      </div>

      <!-- Sezione Privacy (nascosta) -->
      <div id="privacy-section" style="display:none;">
        <div class="settings-section-header">
          <button class="settings-back-button" onclick="App.UI.settingsModal.closePrivacySection()">‹</button>
          <div class="settings-section-title">Privacy e Sicurezza</div>
          <div style="width:36px"></div>
        </div>

        <div class="settings-section">
          ${activeProfile?.pin ? `
            <button class="settings-item-with-icon settings-item-button settings-item-danger" onclick="App.removePinUI(); App.UI.settingsModal.refresh();">
              <div class="settings-item-icon settings-item-icon-danger">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </div>
              <div class="settings-item-label settings-item-label-danger">Rimuovi PIN</div>
              <span class="settings-item-chevron">›</span>
            </button>
          ` : ''}

          <button class="settings-item-with-icon settings-item-button settings-item-danger" onclick="App.deleteProfileUI()">
            <div class="settings-item-icon settings-item-icon-danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </div>
            <div class="settings-item-label settings-item-label-danger">Elimina profilo</div>
            <span class="settings-item-chevron">›</span>
          </button>
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

    this.syncThemeToggle();
  },

  syncThemeToggle() {
    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) {
      const theme = storage.getSetting('theme') || 'auto';
      toggle.checked = theme === 'dark';
    }
  },

  getInitial(name) {
    return (name || 'P').charAt(0).toUpperCase();
  },

  // Gestione sezioni nascoste
  openDataSection() {
    document.querySelector('.modal-content > div:not(#data-section)').style.display = 'none';
    document.getElementById('data-section').style.display = 'block';
  },

  closeDataSection() {
    document.getElementById('data-section').style.display = 'none';
    document.querySelector('.modal-content > div:not(#data-section)').style.display = 'block';
  },

  openPrivacySection() {
    document.querySelector('.modal-content > div:not(#privacy-section)').style.display = 'none';
    document.getElementById('privacy-section').style.display = 'block';
  },

  closePrivacySection() {
    document.getElementById('privacy-section').style.display = 'none';
    document.querySelector('.modal-content > div:not(#privacy-section)').style.display = 'block';
  }
};

export default settingsModal;