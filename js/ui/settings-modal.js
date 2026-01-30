import storage from '../storage.js';
import app from '../app.js';

const settingsModal = {
  isOpen: false,

  open() {
    const modalEl = this.getOrCreateModal();
    modalEl.classList.add('show');
    this.isOpen = true;
    this.setupListeners();
  },

  close() {
    const modalEl = document.getElementById('settings-modal');
    if (modalEl) {
      modalEl.classList.remove('show');
    }
    this.isOpen = false;
  },

  getOrCreateModal() {
    let modal = document.getElementById('settings-modal');
    if (!modal) {
      const root = document.getElementById('modals-root');
      modal = document.createElement('div');
      modal.id = 'settings-modal';
      modal.className = 'modal';
      modal.innerHTML = this.getHTML();
      root.appendChild(modal);
    }
    return modal;
  },

  getHTML() {
    const profiles = storage.getAllProfiles();
    const activeProfile = storage.getActiveProfile();

    return `
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title">Impostazioni</div>
          <button class="modal-close" onclick="window.App.UI.settingsModal.close()">✕</button>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Profilo</div>
          <div class="settings-group">
            <div class="settings-item">
              <div class="settings-item-label">Profilo attivo</div>
              <div style="font-size: 14px; font-weight: 500; color: var(--text-primary);">${app.escapeHtml(activeProfile?.name || 'Sconosciuto')}</div>
            </div>
            ${profiles.length > 1 ? `
            <div class="settings-item" style="flex-direction: column; align-items: flex-start; gap: 12px;">
              <div class="settings-item-label">Cambia profilo</div>
              <select class="select-field" id="profile-selector">
                ${profiles.map(p => `
                  <option value="${p.id}" ${p.id === activeProfile?.id ? 'selected' : ''}>
                    ${app.escapeHtml(p.name)}
                  </option>
                `).join('')}
              </select>
              <button class="btn btn-secondary btn-full" onclick="window.App.switchProfileUI()">Accedi</button>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Aspetto</div>
          <div class="settings-group">
            <div class="settings-item">
              <div class="settings-item-label">Tema</div>
              <div class="theme-toggle">
                <button class="toggle-btn" data-theme="light" onclick="window.App.setTheme('light')">Chiaro</button>
                <button class="toggle-btn active" data-theme="auto" onclick="window.App.setTheme('auto')">Auto</button>
                <button class="toggle-btn" data-theme="dark" onclick="window.App.setTheme('dark')">Scuro</button>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Dati</div>
          <div class="settings-group">
            <div class="settings-item">
              <button class="btn btn-secondary btn-full" onclick="window.App.exportDataUI()">
                Esporta dati
              </button>
            </div>
            <div class="settings-item">
              <input type="file" id="import-file" accept=".json" style="display: none;" onchange="window.App.importDataUI(event)">
              <button class="btn btn-secondary btn-full" onclick="document.getElementById('import-file').click()">
                Importa dati
              </button>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Informazioni</div>
          <div class="settings-group">
            <div class="settings-item" style="flex-direction: column; align-items: flex-start; gap: 8px;">
              <div class="settings-item-label">BudgeIT v2.0</div>
              <div style="font-size: 12px; color: var(--text-tertiary);">
                Gestione finanziaria consumer premium • Local-First • Zero cloud
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  setupListeners() {
    // Click outside to close
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.close();
        }
      });
    }

    // Apply theme buttons
    const theme = storage.getSetting('theme') || 'auto';
    document.querySelectorAll('.toggle-btn').forEach(b => {
      b.classList.remove('active');
      if (b.getAttribute('data-theme') === theme) {
        b.classList.add('active');
      }
    });
  }
};

export default settingsModal;
