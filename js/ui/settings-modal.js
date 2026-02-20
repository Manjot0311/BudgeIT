import storage from '../storage.js';
import app from '../app.js';

const settingsModal = {
  isOpen:      false,
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
    const profiles = storage.getProfiles();
    const hasProfils = profiles.length > 1;

    return `
      <!-- ── header ── -->
      <div class="modal-header">
        <div class="modal-title">Impostazioni</div>
        <button class="modal-close" onclick="App.UI.settingsModal.close()">&times;</button>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           SEZIONE 1: PROFILO
           ═══════════════════════════════════════════════════════ -->
      <div class="settings-section">
        <div class="settings-section-title">Profilo</div>
        <div class="settings-group">
          
          <!-- Informazioni profilo attivo -->
          <div class="settings-item">
            <div class="settings-item-label">Profilo attivo</div>
            <div style="font-weight:500">
              ${app.escapeHtml(activeProfile?.name || '&ndash;')}
            </div>
          </div>

          <!-- Rinomina profilo -->
          <button class="settings-action-item"
                  onclick="App.renameProfileUI(); App.UI.settingsModal.refresh();">
            <div class="settings-action-content">
              <svg class="settings-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span class="settings-action-label">Rinomina</span>
            </div>
            <span class="settings-action-chevron">›</span>
          </button>

          <!-- Modifica PIN -->
          <button class="settings-action-item"
                  onclick="App.editPinUI(); App.UI.settingsModal.refresh();">
            <div class="settings-action-content">
              <svg class="settings-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                <circle cx="12" cy="16" r="1"></circle>
              </svg>
              <span class="settings-action-label">Modifica PIN</span>
            </div>
            <span class="settings-action-chevron">›</span>
          </button>

          <!-- Rimuovi PIN (se esiste) -->
          ${activeProfile?.pin ? `
            <button class="settings-action-item settings-action-item--danger"
                    onclick="App.removePinUI(); App.UI.settingsModal.refresh();">
              <div class="settings-action-content">
                <svg class="settings-action-icon settings-action-icon--danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                <span class="settings-action-label">Rimuovi PIN</span>
              </div>
              <span class="settings-action-chevron">›</span>
            </button>
          ` : ''}

        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           SEZIONE 2: CAMBIO PROFILO (se ci sono più profili)
           ═══════════════════════════════════════════════════════ -->
      ${hasProfils ? `
        <div class="settings-section">
          <div class="settings-section-title">Cambia profilo</div>
          <div class="settings-group">
            <div class="settings-profile-list">
              ${profiles.map(p => `
                <div class="settings-profile-item ${p.id === activeProfile?.id ? 'active' : ''}"
                     onclick="App.selectProfileUI('${p.id}');">
                  <div class="settings-profile-info">
                    <div class="settings-profile-name">${app.escapeHtml(p.name)}</div>
                    <div class="settings-profile-sub">${p.pin ? '🔒 Protetto' : 'Standard'}</div>
                  </div>
                  ${p.id === activeProfile?.id ? '<div class="settings-profile-badge">Attivo</div>' : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- ═══════════════════════════════════════════════════════
           SEZIONE 3: GESTIONE PROFILI
           ═══════════════════════════════════════════════════════ -->
      <div class="settings-section">
        <div class="settings-section-title">Gestione profili</div>
        <div class="settings-group">
          
          <!-- Crea nuovo profilo -->
          <button class="settings-action-item"
                  onclick="App.createProfileUI(); App.UI.settingsModal.close();">
            <div class="settings-action-content">
              <svg class="settings-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span class="settings-action-label" style="font-weight: 600;">Nuovo profilo</span>
            </div>
            <span class="settings-action-chevron">›</span>
          </button>

          <!-- Elimina profilo (solo se ci sono più profili) -->
          ${profiles.length > 1 ? `
            <button class="settings-action-item settings-action-item--danger"
                    onclick="App.deleteProfileUI();">
              <div class="settings-action-content">
                <svg class="settings-action-icon settings-action-icon--danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                <span class="settings-action-label">Elimina profilo attuale</span>
              </div>
              <span class="settings-action-chevron">›</span>
            </button>
          ` : ''}

        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           SEZIONE 4: ASPETTO
           ═══════════════════════════════════════════════════════ -->
      <div class="settings-section">
        <div class="settings-section-title">Aspetto</div>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-label">Tema</div>
            <div class="theme-toggle">
              <button class="toggle-btn" data-theme="light"
                      onclick="App.setTheme('light'); App.UI.settingsModal.syncThemeButtons();">
                Chiaro
              </button>
              <button class="toggle-btn" data-theme="auto"
                      onclick="App.setTheme('auto');  App.UI.settingsModal.syncThemeButtons();">
                Auto
              </button>
              <button class="toggle-btn" data-theme="dark"
                      onclick="App.setTheme('dark');  App.UI.settingsModal.syncThemeButtons();">
                Scuro
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           SEZIONE 5: DATI
           ═══════════════════════════════════════════════════════ -->
      <div class="settings-section">
        <div class="settings-section-title">Dati</div>
        <div class="settings-group">
          
          <!-- Esporta dati -->
          <button class="settings-action-item"
                  onclick="App.exportDataUI()">
            <div class="settings-action-content">
              <svg class="settings-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span class="settings-action-label">Esporta dati</span>
            </div>
            <span class="settings-action-chevron">›</span>
          </button>

          <!-- Importa dati -->
          <button class="settings-action-item"
                  onclick="document.getElementById('import-file').click()">
            <div class="settings-action-content">
              <svg class="settings-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span class="settings-action-label">Importa dati</span>
            </div>
            <span class="settings-action-chevron">›</span>
          </button>

          <input type="file" id="import-file" accept=".json"
                 style="display:none"
                 onchange="App.importDataUI(event)">

        </div>
      </div>
    `;
  },

  setupListeners() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    // chiudi cliccando il fondo
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });

    this.syncThemeButtons();
  },

  syncThemeButtons() {
    const themeFromStorage = storage.getSetting('theme');
    const currentTheme     = themeFromStorage
      || document.documentElement.dataset.theme
      || 'auto';

    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });
  }
};

export default settingsModal;