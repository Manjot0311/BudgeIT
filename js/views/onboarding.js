import storage from '../storage.js';

const onboardingView = {
  render() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    const profiles = storage.getProfiles() || [];
    appEl.innerHTML = this.getHTML(profiles);

    this.bindEvents();
  },

  destroy() {
    const root = document.getElementById('app');
    if (root && this.handleClick) {
      root.removeEventListener('click', this.handleClick);
    }
  },

  /* ===================== TEMPLATE ===================== */

  getHTML(profiles) {
    return profiles.length === 0
      ? this.getFirstRunHTML()
      : this.getProfileSelectionHTML(profiles);
  },

  getFirstRunHTML() {
    return `
      <div class="profile-onboarding">
        <div class="profile-onboarding-content">
          <div class="profile-brand">
            <img class="profile-brand-icon" src="/icons/icon-192.png" alt="BudgeIT">
            <div class="profile-logo">BudgeIT</div>
          </div>

          <div class="profile-message">
            <div class="profile-message-title">Inizia ora</div>
            <div class="profile-message-sub">Crea il tuo primo profilo</div>
          </div>

          <div class="profiles-grid">
            ${this.renderAddProfileCard()}
          </div>
        </div>
      </div>
    `;
  },

  getProfileSelectionHTML(profiles) {
    return `
      <div class="profile-onboarding">
        <div class="profile-onboarding-content">
          <div class="profile-brand">
            <img class="profile-brand-icon" src="/icons/icon-192.png" alt="BudgeIT">
            <div class="profile-logo">BudgeIT</div>
          </div>

          <div class="profile-message">
            <div class="profile-message-title">Benvenuto</div>
            <div class="profile-message-sub">Seleziona il tuo profilo</div>
          </div>

          <div class="profiles-grid">
            ${profiles.map(p => this.renderProfileCard(p)).join('')}
            ${this.renderAddProfileCard()}
          </div>
        </div>
      </div>
    `;
  },

  renderProfileCard(profile) {
    const safeName = window.App.escapeHtml(profile.name);

    return `
      <button
        class="profile-card"
        data-profile-id="${profile.id}"
        aria-label="Seleziona profilo ${safeName}"
      >
        <div class="profile-card-avatar">
          ${profile.emoji || '👤'}
        </div>

        <div class="profile-card-meta">
          <div class="profile-card-name">${safeName}</div>
          <div class="profile-card-sub">
            ${profile.protected ? 'Protetto' : 'Standard'}
          </div>
        </div>

        ${profile.protected ? `<div class="profile-card-lock">🔒</div>` : ''}
      </button>
    `;
  },

  renderAddProfileCard() {
    return `
      <button
        class="profile-card profile-card-add"
        data-action="create-profile"
        aria-label="Crea nuovo profilo"
      >
        <div class="profile-card-add-icon"> + </div>
        <div class="profile-card-add-text">Nuovo profilo</div>
      </button>
    `;
  },

  /* ===================== EVENTI ===================== */

  bindEvents() {
    const root = document.getElementById('app');
    if (!root) return;

    this.handleClick = this.handleClick.bind(this);
    root.addEventListener('click', this.handleClick);
  },

  handleClick(e) {
    const btn = e.target.closest('[data-action],[data-profile-id]');
    if (!btn) return;

    if (btn.dataset.action === 'create-profile') {
      window.App.createProfileUI();
      return;
    }

    if (btn.dataset.profileId) {
      window.App.selectProfileUI(btn.dataset.profileId);
    }
  }
};

export default onboardingView;