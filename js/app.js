import storage from './storage.js';
import appState from './state.js';
import router from './router.js';
import homeView from './views/home.js';
import expensesView from './views/expenses.js';
import budgetView from './views/budget.js';
import statsView from './views/stats.js';
import onboardingView from './views/onboarding.js';
import reportsView from './views/reports.js';
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
    router.register('reports',    reportsView);

    // Applica tema subito (prima della splash, evita flash)
    const theme = storage.getSetting('theme') || 'auto';
    this.applyTheme(theme);

    // Mostra splash e aspetta almeno 1.8s
    await this._showSplash(1800);

    const profiles = storage.getProfiles();
    await router.navigate('onboarding', { mode: profiles.length ? 'login' : 'first' });

    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('service-worker.js');
        console.log('Service worker registrato');
      } catch (e) {
        console.warn('Service worker registration failed', e);
      }
    }
  }

  /* ===================== SPLASH ===================== */

  /**
   * Mostra la splash screen per `duration` ms poi la dissolve e la rimuove.
   * La splash è già nell'HTML — questo metodo la gestisce solo.
   */
  _showSplash(duration = 1800) {
    return new Promise(resolve => {
      const splash = document.getElementById('splash-screen');
      if (!splash) { resolve(); return; }

      setTimeout(() => {
        splash.classList.add('splash-hide');
        // Rimuovi dal DOM dopo la transizione CSS (500ms)
        splash.addEventListener('transitionend', () => {
          splash.remove();
          resolve();
        }, { once: true });
        // Fallback se transitionend non scatta
        setTimeout(() => { splash.remove(); resolve(); }, 600);
      }, duration);
    });
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

  /**
   * Flusso creazione profilo:
   * 1. Chiede il nome
   * 2. Chiede se si vuole impostare un PIN (mostra una schermata PIN)
   * 3. Se sì → chiede conferma PIN
   */
  createProfileUI() {
    this.UI.alertModal.showInput(
      'Nuovo profilo',
      'Inserisci il nome del profilo',
      'text',
      (name) => {
        const clean = name?.trim();
        if (!clean) { return this.showAlert('Errore', 'Nome profilo mancante'); }
        // Dopo il nome, chiede il PIN
        this._askPinForNewProfile(clean);
      }
    );
  }

  /**
   * Schermata PIN durante la creazione profilo.
   * Mostra una modale con tastierino numerico.
   */
  _askPinForNewProfile(name) {
    const overlay = document.createElement('div');
    overlay.className = 'ios-picker-overlay';
    overlay.innerHTML = `
      <div class="ios-picker-modal pin-modal">
        <div class="ios-picker-header">
          <button class="ios-picker-cancel" id="pin-skip">Salta</button>
          <div class="ios-picker-title">Imposta PIN</div>
          <button class="ios-picker-done" id="pin-confirm" disabled>Conferma</button>
        </div>
        <div class="pin-body">
          <p class="pin-subtitle">Proteggi il profilo con un PIN a 4 cifre</p>
          <div class="pin-dots" id="pin-dots">
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
          </div>
          <div class="pin-keypad">
            ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
              <button class="pin-key" data-key="${k}">${k}</button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);

    let pin = '';

    const dots = overlay.querySelectorAll('.pin-dot');
    const confirmBtn = overlay.querySelector('#pin-confirm');

    const updateDots = () => {
      dots.forEach((d, i) => d.classList.toggle('filled', i < pin.length));
      confirmBtn.disabled = pin.length < 4;
    };

    overlay.querySelectorAll('.pin-key').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (key === '⌫') {
          pin = pin.slice(0, -1);
        } else if (key !== '' && pin.length < 4) {
          pin += key;
        }
        updateDots();
      });
    });

    // Salta → crea senza PIN
    overlay.querySelector('#pin-skip').addEventListener('click', () => {
      overlay.remove();
      this.createProfile(name, null);
    });

    // Conferma → chiede conferma PIN
    confirmBtn.addEventListener('click', () => {
      if (pin.length < 4) return;
      const firstPin = pin;
      overlay.remove();
      this._confirmPin(name, firstPin);
    });
  }

  /**
   * Chiede di reinserire il PIN per conferma.
   */
  _confirmPin(name, firstPin) {
    const overlay = document.createElement('div');
    overlay.className = 'ios-picker-overlay';
    overlay.innerHTML = `
      <div class="ios-picker-modal pin-modal">
        <div class="ios-picker-header">
          <button class="ios-picker-cancel" id="pin-back">Indietro</button>
          <div class="ios-picker-title">Conferma PIN</div>
          <div style="width:60px"></div>
        </div>
        <div class="pin-body">
          <p class="pin-subtitle" id="pin-msg">Reinserisci il PIN per confermare</p>
          <div class="pin-dots" id="pin-dots">
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
          </div>
          <div class="pin-keypad">
            ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
              <button class="pin-key" data-key="${k}">${k}</button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);

    let pin = '';
    const dots = overlay.querySelectorAll('.pin-dot');
    const msg  = overlay.querySelector('#pin-msg');

    const updateDots = () => {
      dots.forEach((d, i) => d.classList.toggle('filled', i < pin.length));
    };

    const shakeError = () => {
      const dotsEl = overlay.querySelector('#pin-dots');
      dotsEl.classList.add('pin-shake');
      setTimeout(() => dotsEl.classList.remove('pin-shake'), 500);
      msg.textContent = 'PIN non corrisponde, riprova';
      msg.style.color = 'var(--danger)';
      pin = '';
      updateDots();
    };

    overlay.querySelectorAll('.pin-key').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (key === '⌫') {
          pin = pin.slice(0, -1);
        } else if (key !== '' && pin.length < 4) {
          pin += key;
          if (pin.length === 4) {
            setTimeout(() => {
              if (pin === firstPin) {
                overlay.remove();
                this.createProfile(name, pin);
              } else {
                shakeError();
              }
            }, 150);
          }
        }
        updateDots();
      });
    });

    overlay.querySelector('#pin-back').addEventListener('click', () => {
      overlay.remove();
      this._askPinForNewProfile(name);
    });
  }

  selectProfileUI(profileId) {
    const profile = storage.getProfile(profileId);
    if (!profile) return;

    if (profile.pin) {
      this._showPinLogin(profileId, profile.name);
    } else {
      this.loginProfile(profileId);
    }
  }

  /**
   * Schermata PIN di accesso al profilo (tastierino numerico).
   * Se il profilo ha la biometria registrata, mostra anche il bottone biometrico.
   */
  async _showPinLogin(profileId, profileName) {
    const hasBio = await this._biometricAvailable(profileId);

    const overlay = document.createElement('div');
    overlay.className = 'ios-picker-overlay';
    overlay.innerHTML = `
      <div class="ios-picker-modal pin-modal">
        <div class="ios-picker-header">
          <button class="ios-picker-cancel" id="pin-cancel">Annulla</button>
          <div class="ios-picker-title">${this.escapeHtml(profileName)}</div>
          <div style="width:60px"></div>
        </div>
        <div class="pin-body">
          <p class="pin-subtitle" id="pin-msg">Inserisci il PIN</p>
          <div class="pin-dots" id="pin-dots">
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
          </div>
          <div class="pin-keypad">
            ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
              <button class="pin-key" data-key="${k}">${k}</button>
            `).join('')}
          </div>
          ${hasBio ? `
          <button class="pin-biometric-btn bio-available" id="bio-btn">
            <span class="bio-icon" id="bio-icon">${this._getBioIcon()}</span>
            <span id="bio-label">${this._getBioLabel()}</span>
          </button>` : ''}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);

    let pin = '';
    const dots = overlay.querySelectorAll('.pin-dot');
    const msg  = overlay.querySelector('#pin-msg');

    const updateDots = () => {
      dots.forEach((d, i) => d.classList.toggle('filled', i < pin.length));
    };

    overlay.querySelectorAll('.pin-key').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.key;
        if (key === '⌫') {
          pin = pin.slice(0, -1);
        } else if (key !== '' && pin.length < 4) {
          pin += key;
          if (pin.length === 4) {
            setTimeout(async () => {
              if (await storage.verifyPin(profileId, pin)) {
                overlay.remove();
                this.loginProfile(profileId, pin);
              } else {
                const dotsEl = overlay.querySelector('#pin-dots');
                dotsEl.classList.add('pin-shake');
                setTimeout(() => dotsEl.classList.remove('pin-shake'), 500);
                msg.textContent = 'PIN errato, riprova';
                msg.style.color = 'var(--danger)';
                pin = '';
                updateDots();
              }
            }, 150);
          }
        }
        updateDots();
      });
    });

    overlay.querySelector('#pin-cancel').addEventListener('click', () => {
      overlay.remove();
    });

    // Bottone biometrico
    const bioBtn = overlay.querySelector('#bio-btn');
    if (bioBtn) {
      // Tenta automaticamente all'apertura (solo se disponibile)
      setTimeout(() => this._attemptBiometricLogin(profileId, overlay), 300);

      bioBtn.addEventListener('click', () => {
        this._attemptBiometricLogin(profileId, overlay);
      });
    }
  }

  /* ═══════════════════════════════════════════════
     BIOMETRIA — WebAuthn
  ════════════════════════════════════════════════ */

  /** Ritorna true se WebAuthn è supportato dal browser */
  _webAuthnSupported() {
    return !!(window.PublicKeyCredential && navigator.credentials);
  }

  /** Icona adatta al dispositivo (Face ID su iOS, impronta altrove) */
  _getBioIcon() {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad/.test(ua);
    return isIOS ? '🔓' : '👁️';
  }

  _getBioLabel() {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad/.test(ua);
    // Face ID su iPhone X+, Touch ID su iPad / iPhone older
    if (isIOS) return 'Face ID / Touch ID';
    return 'Sblocca con impronta';
  }

  /**
   * Verifica se il profilo ha una credenziale biometrica registrata
   * E se WebAuthn è disponibile su questo dispositivo.
   */
  async _biometricAvailable(profileId) {
    if (!this._webAuthnSupported()) return false;
    const credId = storage.getBiometricCredentialId(profileId);
    if (!credId) return false;
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch {
      return false;
    }
  }

  /**
   * Registra la biometria per il profilo corrente.
   * Chiamato dalle impostazioni dopo aver verificato il PIN.
   */
  async registerBiometric() {
    if (!this._webAuthnSupported()) {
      this.showAlert('Non supportato', 'Il tuo dispositivo non supporta la biometria.');
      return;
    }
    const profile = storage.getActiveProfile();
    if (!profile) return;

    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        this.showAlert('Non disponibile', 'Nessun autenticatore biometrico trovato su questo dispositivo.');
        return;
      }

      // Challenge casuale (16 byte)
      const challenge = crypto.getRandomValues(new Uint8Array(16));
      const userId    = new TextEncoder().encode(profile.id);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'BudgeIT', id: location.hostname || 'localhost' },
          user: {
            id: userId,
            name: profile.name,
            displayName: profile.name
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7  },   // ES256
            { type: 'public-key', alg: -257 }    // RS256 fallback
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false
          },
          timeout: 60000
        }
      });

      // Salva l'ID della credenziale (base64url)
      const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      storage.setBiometricCredentialId(profile.id, credId);

      this.showToast('🔒 Biometria abilitata');
      // Se le impostazioni sono aperte, aggiornale
      this.UI.settingsModal?.refresh?.();

    } catch (e) {
      if (e.name === 'NotAllowedError') {
        this.showToast('Biometria annullata');
      } else {
        console.error('WebAuthn register error:', e);
        this.showAlert('Errore', 'Impossibile abilitare la biometria: ' + e.message);
      }
    }
  }

  /**
   * Rimuovi biometria dal profilo corrente.
   */
  removeBiometric() {
    const profile = storage.getActiveProfile();
    if (!profile) return;
    storage.removeBiometricCredentialId(profile.id);
    this.showToast('Biometria disabilitata');
    this.UI.settingsModal?.refresh?.();
  }

  /**
   * Tenta il login biometrico per `profileId`.
   * Se va a buon fine, chiude l'overlay e fa il login.
   */
  async _attemptBiometricLogin(profileId, overlay) {
    const credId = storage.getBiometricCredentialId(profileId);
    if (!credId) return;

    const bioBtn   = overlay?.querySelector('#bio-btn');
    const bioLabel = overlay?.querySelector('#bio-label');

    try {
      if (bioBtn)   bioBtn.classList.remove('bio-error');
      if (bioLabel) bioLabel.textContent = 'In attesa…';

      const rawId = Uint8Array.from(atob(credId), c => c.charCodeAt(0));
      const challenge = crypto.getRandomValues(new Uint8Array(16));

      await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ type: 'public-key', id: rawId }],
          userVerification: 'required',
          timeout: 60000
        }
      });

      // Autenticazione OK — bypass PIN perché WebAuthn ha già verificato l'identità
      overlay?.remove();
      this.loginProfile(profileId, null, true);

    } catch (e) {
      if (bioBtn)   bioBtn.classList.add('bio-error');
      if (bioLabel) bioLabel.textContent = 'Riprova o usa il PIN';
      setTimeout(() => {
        if (bioBtn)   bioBtn.classList.remove('bio-error');
        if (bioLabel) bioLabel.textContent = this._getBioLabel();
      }, 2500);
    }
  }

  async loginProfile(profileId, pin = null, biometric = false) {
    // Se login biometrico: la verifica è già avvenuta tramite WebAuthn, bypass PIN
    if (!biometric && !(await storage.verifyPin(profileId, pin))) {
      this.showAlert('Errore', 'PIN non valido');
      return;
    }
    appState.reset();
    storage.setActiveProfile(profileId);
    appState.notify('profile-changed', { profileId });
    this.enterApp();
  }

  async createProfile(name, pin = null) {
    const id = await storage.createProfile(name, pin);
    appState.reset();
    appState.notify('profile-changed', { profileId: id });
    this.enterApp();
    this.showToast(pin ? '🔒 Profilo creato con PIN' : 'Profilo creato');
  }

  /**
   * Modifica PIN del profilo attivo
   */
  editPinUI() {
    const profile = storage.getActiveProfile();
    if (!profile) return;

    if (profile.pin) {
      // PIN già impostato → chiedi vecchio PIN, poi nuovo
      this._verifyOldPinForEdit();
    } else {
      // Nessun PIN → crea nuovo
      this._askNewPin();
    }
  }

  /**
   * Verifica PIN vecchio prima di cambiarlo
   */
  _verifyOldPinForEdit() {
    const overlay = document.createElement('div');
    overlay.className = 'ios-picker-overlay';
    overlay.innerHTML = `
      <div class="ios-picker-modal pin-modal">
        <div class="ios-picker-header">
          <button class="ios-picker-cancel" id="pin-cancel">Annulla</button>
          <div class="ios-picker-title">Verifica PIN attuale</div>
          <div style="width:60px"></div>
        </div>
        <div class="pin-body">
          <p class="pin-subtitle" id="pin-msg">Inserisci il PIN attuale</p>
          <div class="pin-dots" id="pin-dots">
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
          </div>
          <div class="pin-keypad">
            ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
              <button class="pin-key" data-key="${k}">${k}</button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);

    let pin = '';
    const dots = overlay.querySelectorAll('.pin-dot');
    const msg  = overlay.querySelector('#pin-msg');

    const updateDots = () => {
      dots.forEach((d, i) => d.classList.toggle('filled', i < pin.length));
    };

    overlay.querySelectorAll('.pin-key').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.key;
        if (key === '⌫') {
          pin = pin.slice(0, -1);
        } else if (key !== '' && pin.length < 4) {
          pin += key;
          if (pin.length === 4) {
            setTimeout(async () => {
              const profile = storage.getActiveProfile();
              if (await storage.verifyPin(profile.id, pin)) {
                overlay.remove();
                this._askNewPin();
              } else {
                const dotsEl = overlay.querySelector('#pin-dots');
                dotsEl.classList.add('pin-shake');
                setTimeout(() => dotsEl.classList.remove('pin-shake'), 500);
                msg.textContent = 'PIN errato, riprova';
                msg.style.color = 'var(--danger)';
                pin = '';
                updateDots();
              }
            }, 150);
          }
        }
        updateDots();
      });
    });

    overlay.querySelector('#pin-cancel').addEventListener('click', () => {
      overlay.remove();
    });
  }

  /**
   * Chiedi nuovo PIN
   */
  _askNewPin() {
    const overlay = document.createElement('div');
    overlay.className = 'ios-picker-overlay';
    overlay.innerHTML = `
      <div class="ios-picker-modal pin-modal">
        <div class="ios-picker-header">
          <button class="ios-picker-cancel" id="pin-cancel">Annulla</button>
          <div class="ios-picker-title">Nuovo PIN</div>
          <button class="ios-picker-done" id="pin-confirm" disabled>Conferma</button>
        </div>
        <div class="pin-body">
          <p class="pin-subtitle">Imposta un nuovo PIN a 4 cifre</p>
          <div class="pin-dots" id="pin-dots">
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
          </div>
          <div class="pin-keypad">
            ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
              <button class="pin-key" data-key="${k}">${k}</button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);

    let pin = '';
    const dots = overlay.querySelectorAll('.pin-dot');
    const confirmBtn = overlay.querySelector('#pin-confirm');

    const updateDots = () => {
      dots.forEach((d, i) => d.classList.toggle('filled', i < pin.length));
      confirmBtn.disabled = pin.length < 4;
    };

    overlay.querySelectorAll('.pin-key').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (key === '⌫') {
          pin = pin.slice(0, -1);
        } else if (key !== '' && pin.length < 4) {
          pin += key;
        }
        updateDots();
      });
    });

    confirmBtn.addEventListener('click', () => {
      if (pin.length < 4) return;
      const newPin = pin;
      overlay.remove();
      this._confirmNewPin(newPin);
    });

    overlay.querySelector('#pin-cancel').addEventListener('click', () => {
      overlay.remove();
    });
  }

  /**
   * Conferma nuovo PIN
   */
  _confirmNewPin(newPin) {
    const overlay = document.createElement('div');
    overlay.className = 'ios-picker-overlay';
    overlay.innerHTML = `
      <div class="ios-picker-modal pin-modal">
        <div class="ios-picker-header">
          <button class="ios-picker-cancel" id="pin-back">Indietro</button>
          <div class="ios-picker-title">Conferma PIN</div>
          <div style="width:60px"></div>
        </div>
        <div class="pin-body">
          <p class="pin-subtitle" id="pin-msg">Reinserisci il nuovo PIN</p>
          <div class="pin-dots" id="pin-dots">
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
          </div>
          <div class="pin-keypad">
            ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
              <button class="pin-key" data-key="${k}">${k}</button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);

    let pin = '';
    const dots = overlay.querySelectorAll('.pin-dot');
    const msg  = overlay.querySelector('#pin-msg');

    const updateDots = () => {
      dots.forEach((d, i) => d.classList.toggle('filled', i < pin.length));
    };

    overlay.querySelectorAll('.pin-key').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.key;
        if (key === '⌫') {
          pin = pin.slice(0, -1);
        } else if (key !== '' && pin.length < 4) {
          pin += key;
          if (pin.length === 4) {
            setTimeout(async () => {
              if (pin === newPin) {
                const profile = storage.getActiveProfile();
                await storage.updatePin(profile.id, newPin);
                overlay.remove();
                this.UI.settingsModal.refresh();
                this.showToast('🔒 PIN aggiornato');
              } else {
                const dotsEl = overlay.querySelector('#pin-dots');
                dotsEl.classList.add('pin-shake');
                setTimeout(() => dotsEl.classList.remove('pin-shake'), 500);
                msg.textContent = 'PIN non corrisponde, riprova';
                msg.style.color = 'var(--danger)';
                pin = '';
                updateDots();
              }
            }, 150);
          }
        }
        updateDots();
      });
    });

    overlay.querySelector('#pin-back').addEventListener('click', () => {
      overlay.remove();
      this._askNewPin();
    });
  }

  /**
   * Rimuovi PIN dal profilo
   */
  removePinUI() {
    const profile = storage.getActiveProfile();
    if (!profile || !profile.pin) return;

    this.UI.alertModal.showConfirm({
      title: 'Rimuovi PIN',
      message: 'Il profilo non sarà più protetto da PIN',
      confirmText: 'Rimuovi',
      cancelText: 'Annulla',
      onConfirm: () => {
        storage.removePin(profile.id);
        this.UI.settingsModal.refresh();
        this.showToast('PIN rimosso');
      }
    });
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
        this.UI.settingsModal.refresh();
        this.showToast('Profilo rinominato');
      },
      profile.name
    );
  }

  deleteProfileUI() {
    const profile = storage.getActiveProfile();
    if (!profile) return;

    this.UI.alertModal.showConfirm({
      title: 'Elimina profilo',
      message: `Sei sicuro di voler eliminare "${profile.name}"? Questa azione non può essere annullata.`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      onConfirm: () => {
        storage.deleteProfile(profile.id);
        appState.reset();
        storage.clearActiveProfile();
        router.navigate('onboarding', { mode: 'switch' });
        this.showToast('Profilo eliminato');
      }
    });
  }

  /* ===================== BUDGET ===================== */
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
          ${categories.map(cat => {
            const name  = this.escapeHtml(cat.name ?? cat);
            const emoji = cat.emoji ?? this.getCategoryIcon(name);
            return `
              <div class="ios-picker-item" data-value="${name}">
                <span class="ios-picker-item-icon">${emoji}</span>
                <span class="ios-picker-item-name">${name}</span>
                <span class="ios-picker-item-check">&#x2713;</span>
              </div>`;
          }).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const closeOverlay = () => overlay.remove();

    overlay.querySelector('.ios-picker-cancel')
      .addEventListener('click', closeOverlay);

    overlay.querySelector('.ios-picker-done')
      .addEventListener('click', () => {
        const selected = overlay.querySelector('.ios-picker-item.selected');
        if (selected) {
          const value = selected.dataset.value;
          const displayEl = document.getElementById('selected-category-display');
          if (displayEl) {
            displayEl.textContent = value;
            displayEl.dataset.value = value;
          }
        }
        closeOverlay();
      });

    overlay.querySelectorAll('.ios-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        overlay.querySelectorAll('.ios-picker-item')
          .forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');

        const value = item.dataset.value;
        const displayEl = document.getElementById('selected-category-display');
        if (displayEl) {
          displayEl.textContent = value;
          displayEl.dataset.value = value;
        }
        setTimeout(closeOverlay, 180);
      });
    });

    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeOverlay();
    });

    setTimeout(() => overlay.classList.add('active'), 10);
  }

  // Mappa categoria → emoji (stringa JS)
  getCategoryIcon(cat) {
    const map = {
      Alimentari: '🛒',
      Trasporti:  '🚗',
      Casa:       '🏠',
      Svago:      '🎮',
      Salute:     '💊',
      Altro:      '📦'
    };
    return map[cat] || '🏷️';
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
      icon.textContent   = '-';
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

    const rawName  = nameInput?.value?.trim();
    const rawEmoji = emojiInput?.value?.trim();

    if (!rawName) {
      this.UI.toast.show('Inserisci un nome categoria', 'error');
      return;
    }

    const emoji = rawEmoji || '📦';
    const categoryLabel = `${emoji} ${rawName}`;

    const categories = storage.getCategories();
    if (categories.includes(categoryLabel)) {
      this.UI.toast.show('Categoria già esistente', 'error');
      return;
    }

    storage.addCategory(categoryLabel);

    nameInput.value  = '';
    if (emojiInput) emojiInput.value = '';

    router.routes.budget?.populateCategories?.();
    router.routes.expenses?.populateCategories?.();

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

    if (nameEl)     nameEl.value     = '';
    if (amountEl)   amountEl.value   = '';
    if (categoryEl) categoryEl.value = '';
    if (dateEl)     dateEl.value     = today;
    if (notesEl)    notesEl.value    = '';

    router.routes['expenses']?.renderExpenseList?.();
    router.routes['home']?.updateStats?.();
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
        router.routes['expenses']?.renderExpenseList?.();
        router.routes['home']?.updateStats?.();
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

  /* ===================== EXPORT/IMPORT DATA ===================== */

  exportDataUI() {
    const profile = storage.getActiveProfile();
    if (!profile) {
      this.showAlert('Errore', 'Nessun profilo attivo');
      return;
    }

    // Crea un oggetto con i dati del profilo
    const dataToExport = {
      profileName: profile.name,
      exportDate: new Date().toISOString(),
      expenses: profile.expenses,
      categories: profile.categories,
      budgets: profile.budgets,
      settings: profile.settings
    };

    // Converti in JSON
    const jsonString = JSON.stringify(dataToExport, null, 2);

    // Crea un blob
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Crea l'URL per il download
    const url = URL.createObjectURL(blob);

    // Crea un link e simula il click
    const link = document.createElement('a');
    link.href = url;
    link.download = `BudgeIT_${profile.name}_${new Date().toISOString().slice(0, 10)}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Libera la memoria
    URL.revokeObjectURL(url);

    this.showToast('Dati esportati con successo');
  }

  importDataUI(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const profile = storage.getActiveProfile();

        if (!profile) {
          this.showAlert('Errore', 'Nessun profilo attivo');
          return;
        }

        // Merge dei dati
        profile.expenses = [...(profile.expenses || []), ...(data.expenses || [])];
        profile.categories = [...new Set([...(profile.categories || []), ...(data.categories || [])])];
        profile.budgets = { ...profile.budgets, ...data.budgets };
        profile.settings = { ...profile.settings, ...data.settings };

        storage.save();

        router.routes['home']?.updateStats?.();
        router.routes['expenses']?.renderExpenseList?.();

        this.showToast('Dati importati con successo');

        // Reset input
        event.target.value = '';
      } catch (err) {
        this.showAlert('Errore', 'File non valido');
        console.error(err);
      }
    };

    reader.readAsText(file);
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