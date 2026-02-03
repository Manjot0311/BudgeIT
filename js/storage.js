class StorageManager {
  constructor() {
    this.STORAGE_KEY = 'budgetit_v2';
    this.LEGACY_KEY = 'budgetit_data';
    this.data = this.load();
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
      appVersion: '2.0.0',
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

  createProfile(name, pin = null) {
    const id = 'profile_' + Date.now();

    this.data.profiles[id] = {
      id,
      name,
      pin: pin ? btoa(pin) : null,
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

  verifyPin(id, pin) {
    const p = this.getProfile(id);
    if (!p) return false;
    if (!p.pin) return true;
    return p.pin === btoa(pin);
  }

  renameProfile(id, name) {
    const p = this.getProfile(id);
    if (!p) return;
    p.name = name;
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
