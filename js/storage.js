class StorageManager {
  constructor() {
    this.STORAGE_KEY = 'budgetit_v2';
    this.LEGACY_KEY = 'budgetit_data';
    this.data = this.load();
  }

  /* ===================== CRYPTO UTILS ===================== */

  /**
   * Hash SHA-256 per PIN (sicuro)
   * Fallback a btoa se SubtleCrypto non disponibile
   */
  async hashPin(pin) {
    if (typeof pin !== 'string' || !pin) return null;

    try {
      // Usa Web Crypto API se disponibile (HTTPS o localhost)
      const encoder = new TextEncoder();
      const data = encoder.encode(pin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return `sha256:${hashHex}`;
    } catch (e) {
      // Fallback: usa btoa (meno sicuro, ma funziona offline)
      console.warn('SHA-256 non disponibile, fallback a btoa:', e);
      return `btoa:${btoa(pin)}`;
    }
  }

  /**
   * Verifica PIN hashato
   */
  async verifyHashedPin(storedHash, inputPin) {
    if (!storedHash || typeof inputPin !== 'string') return false;

    const inputHash = await this.hashPin(inputPin);
    return storedHash === inputHash;
  }

  /* ===================== CORE ===================== */

  load() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) return JSON.parse(stored);

      const legacy = localStorage.getItem(this.LEGACY_KEY);
      if (legacy) return this.migrateFromLegacy(JSON.parse(legacy));

      return this.getInitialState();
    } catch {
      return this.getInitialState();
    }
  }

  getInitialState() {
    return {
      appVersion: '3.0.0',
      activeProfileId: null,
      profiles: {},
      lastModified: new Date().toISOString()
    };
  }

  save() {
    this.data.lastModified = new Date().toISOString();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
  }

  /* ===================== MIGRATION ===================== */

  migrateFromLegacy(legacy) {
    try {
      const newState = this.getInitialState();

      if (Array.isArray(legacy.expenses)) {
        const id = 'profile_' + Date.now();
        newState.profiles[id] = {
          id,
          name: legacy.name || 'Default',
          pin: null,
          createdAt: new Date().toISOString(),
          expenses: legacy.expenses || [],
          categories: legacy.categories || [
            'Alimentari',
            'Trasporti',
            'Casa',
            'Svago',
            'Salute',
            'Altro'
          ],
          budgets: legacy.budgets || {},
          settings: legacy.settings || { theme: 'auto', currency: 'EUR' }
        };
        newState.activeProfileId = id;
      } else if (legacy.profiles) {
        newState.profiles = legacy.profiles;
        newState.activeProfileId =
          legacy.activeProfileId || Object.keys(newState.profiles)[0] || null;
      }

      this.data = newState;
      this.save();
      return newState;
    } catch (e) {
      console.error('Migration failed', e);
      return this.getInitialState();
    }
  }

  /* ===================== PROFILI ===================== */

  getProfiles() {
    return Object.values(this.data.profiles);
  }

  getProfile(id) {
    return this.data.profiles[id] || null;
  }

  getActiveProfile() {
    return this.getProfile(this.data.activeProfileId);
  }

  getActiveProfileId() {
    return this.data.activeProfileId;
  }

  setActiveProfile(id) {
    this.data.activeProfileId = id;
    this.save();
  }

  clearActiveProfile() {
    this.data.activeProfileId = null;
    this.save();
  }

  /**
   * Cambio profilo ufficiale:
   * - storage decide
   * - state notifica
   */
  changeActiveProfile(id, appState) {
    this.setActiveProfile(id);
    if (appState) {
      appState.reset();
      appState.notifyProfileChanged(id);
    }
  }

  /**
   * Crea profilo con PIN opzionale (hashato)
   */
  async createProfile(name, pin = null) {
    const id = 'profile_' + Date.now();

    // Se PIN fornito, hashalo; altrimenti null
    const hashedPin = pin ? await this.hashPin(pin) : null;

    this.data.profiles[id] = {
      id,
      name,
      pin: hashedPin,
      createdAt: new Date().toISOString(),
      expenses: [],
      categories: [
        'Alimentari',
        'Trasporti',
        'Casa',
        'Svago',
        'Salute',
        'Altro'
      ],
      budgets: {},
      settings: {
        theme: 'auto',
        currency: 'EUR'
      }
    };

    this.setActiveProfile(id);
    return id;
  }

  /**
   * Verifica PIN (con supporto hash)
   */
  async verifyPin(id, pin) {
    const p = this.getProfile(id);
    if (!p) return false;
    if (!p.pin) return true; // Nessun PIN impostato
    return await this.verifyHashedPin(p.pin, pin);
  }

  /**
   * Aggiorna PIN del profilo attivo
   */
  async updatePin(id, newPin) {
    const p = this.getProfile(id);
    if (!p) return false;

    const hashedPin = newPin ? await this.hashPin(newPin) : null;
    p.pin = hashedPin;
    this.save();
    return true;
  }

  /**
   * Rimuovi PIN dal profilo
   */
  removePin(id) {
    const p = this.getProfile(id);
    if (!p) return false;
    p.pin = null;
    this.save();
    return true;
  }

  /* ===================== BIOMETRIA ===================== */

  /**
   * Salva l'ID della credenziale WebAuthn per un profilo.
   * Memorizzato nel localStorage separato (non nei dati del profilo
   * perché è device-specific e non va esportato/importato).
   */
  setBiometricCredentialId(profileId, credId) {
    const key = `budgetit_bio_${profileId}`;
    localStorage.setItem(key, credId);
  }

  getBiometricCredentialId(profileId) {
    const key = `budgetit_bio_${profileId}`;
    return localStorage.getItem(key) || null;
  }

  removeBiometricCredentialId(profileId) {
    const key = `budgetit_bio_${profileId}`;
    localStorage.removeItem(key);
  }

  hasBiometric(profileId) {
    return !!this.getBiometricCredentialId(profileId);
  }

  renameProfile(id, name) {
    const p = this.getProfile(id);
    if (!p) return;
    p.name = name;
    this.save();
  }

  deleteProfile(id) {
    delete this.data.profiles[id];
    if (this.data.activeProfileId === id) {
      this.data.activeProfileId = null;
    }
    this.save();
  }

  /* ===================== EXPENSES ===================== */

  getExpenses() {
    return this.getActiveProfile()?.expenses || [];
  }

  addExpense(exp) {
    const p = this.getActiveProfile();
    if (!p) return;

    p.expenses.push({
      id: 'exp_' + Date.now(),
      ...exp
    });

    this.save();
  }

  deleteExpense(id) {
    const p = this.getActiveProfile();
    if (!p) return;

    p.expenses = p.expenses.filter(e => e.id !== id);
    this.save();
  }

  /* ===================== BUDGET ===================== */

  getBudgets() {
    return this.getActiveProfile()?.budgets || {};
  }

  setBudget(category, amount) {
    const p = this.getActiveProfile();
    if (!p) return;

    p.budgets[category] = Number(amount);
    this.save();
  }

  /* ===================== CATEGORIE ===================== */

  getCategories() {
    return this.getActiveProfile()?.categories || [];
  }

  addCategory(name) {
    const p = this.getActiveProfile();
    if (!p) return;

    if (!p.categories.includes(name)) {
      p.categories.push(name);
      this.save();
    }
  }

  removeCategory(name) {
    const p = this.getActiveProfile();
    if (!p) return;

    if (!p.categories.includes('Altro')) {
      p.categories.push('Altro');
    }

    p.expenses.forEach(e => {
      if (e.category === name) {
        e.category = 'Altro';
      }
    });

    p.categories = p.categories.filter(c => c !== name);
    delete p.budgets[name];

    this.save();
  }

  /* ===================== SETTINGS ===================== */

  setSetting(key, value) {
    const p = this.getActiveProfile();
    if (!p) return;

    p.settings[key] = value;
    this.save();
  }

  getSetting(key) {
    return this.getActiveProfile()?.settings?.[key];
  }
}

export default new StorageManager();