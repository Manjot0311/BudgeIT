class StorageManager {
  constructor() {
    this.STORAGE_KEY = 'budgetit_v2';
    this.LEGACY_KEY = 'budgetit_data';
    this.data = this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }

      const legacy = localStorage.getItem(this.LEGACY_KEY);
      if (legacy) {
        console.log('🔄 Migrazione dati da v1 a v2...');
        return this.migrateFromLegacy(JSON.parse(legacy));
      }

      return this.getInitialState();
    } catch (e) {
      console.error('❌ Storage load error:', e);
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

  migrateFromLegacy(legacyData) {
    const defaultProfileId = 'default_' + Date.now();
    const profileData = {
      id: defaultProfileId,
      name: 'Default',
      createdAt: new Date().toISOString(),
      expenses: legacyData.expenses || [],
      categories: legacyData.categories || ['Alimentari', 'Trasporti', 'Casa', 'Svago', 'Salute', 'Altro'],
      budgets: legacyData.budgets || {},
      settings: legacyData.settings || { theme: 'auto', currency: 'EUR' },
      pin: null
    };

    const newState = {
      appVersion: '2.0.0',
      activeProfileId: defaultProfileId,
      profiles: {
        [defaultProfileId]: profileData
      },
      lastModified: new Date().toISOString()
    };

    console.log('✅ Migrazione completata');
    localStorage.removeItem(this.LEGACY_KEY);
    return newState;
  }

  save() {
    try {
      this.data.lastModified = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('❌ Storage save error:', e);
    }
  }

  // PROFILI
  getAllProfiles() {
    return Object.values(this.data.profiles || {});
  }

  getProfile(profileId) {
    return this.data.profiles?.[profileId] || null;
  }

  createProfile(name, pin = null) {
    const profileId = 'profile_' + Date.now();
    this.data.profiles[profileId] = {
      id: profileId,
      name,
      pin: pin ? this.hashPin(pin) : null,
      createdAt: new Date().toISOString(),
      expenses: [],
      categories: ['Alimentari', 'Trasporti', 'Casa', 'Svago', 'Salute', 'Altro'],
      budgets: {},
      settings: { theme: 'auto', currency: 'EUR' }
    };
    this.save();
    return profileId;
  }

  setActiveProfile(profileId) {
    if (this.data.profiles[profileId]) {
      this.data.activeProfileId = profileId;
      this.save();
    }
  }

  getActiveProfile() {
    if (!this.data.activeProfileId) return null;
    return this.getProfile(this.data.activeProfileId);
  }

  verifyPin(profileId, pin) {
    const profile = this.getProfile(profileId);
    if (!profile || !profile.pin) return true;
    return profile.pin === this.hashPin(pin);
  }

  deleteProfile(profileId) {
    delete this.data.profiles[profileId];
    if (this.data.activeProfileId === profileId) {
      const remaining = Object.keys(this.data.profiles)[0];
      this.data.activeProfileId = remaining || null;
    }
    this.save();
  }

  // EXPENSES
  addExpense(expense) {
    const profile = this.getActiveProfile();
    if (!profile) throw new Error('No active profile');
    if (!profile.expenses) profile.expenses = [];
    
    profile.expenses.push({
      ...expense,
      id: expense.id || 'exp_' + Date.now(),
      createdAt: new Date().toISOString()
    });
    this.save();
  }

  deleteExpense(expenseId) {
    const profile = this.getActiveProfile();
    if (!profile) throw new Error('No active profile');
    profile.expenses = profile.expenses.filter(e => e.id !== expenseId);
    this.save();
  }

  getExpenses() {
    const profile = this.getActiveProfile();
    return profile?.expenses || [];
  }

  // BUDGET
  setBudget(category, amount) {
    const profile = this.getActiveProfile();
    if (!profile) throw new Error('No active profile');
    profile.budgets[category] = parseFloat(amount);
    this.save();
  }

  getBudgets() {
    const profile = this.getActiveProfile();
    return profile?.budgets || {};
  }

  deleteBudget(category) {
    const profile = this.getActiveProfile();
    if (!profile) throw new Error('No active profile');
    delete profile.budgets[category];
    this.save();
  }

  // CATEGORIE
  addCategory(name) {
    const profile = this.getActiveProfile();
    if (!profile) throw new Error('No active profile');
    if (!profile.categories.includes(name)) {
      profile.categories.push(name);
      this.save();
    }
  }

  removeCategory(name) {
    const profile = this.getActiveProfile();
    if (!profile) throw new Error('No active profile');
    profile.categories = profile.categories.filter(c => c !== name);
    delete profile.budgets[name];
    this.save();
  }

  getCategories() {
    const profile = this.getActiveProfile();
    return profile?.categories || [];
  }

  // SETTINGS
  setSetting(key, value) {
    const profile = this.getActiveProfile();
    if (!profile) throw new Error('No active profile');
    profile.settings[key] = value;
    this.save();
  }

  getSetting(key) {
    const profile = this.getActiveProfile();
    return profile?.settings?.[key];
  }

  // UTILITY
  hashPin(pin) {
    return btoa(pin);
  }

  exportProfileJSON() {
    const profile = this.getActiveProfile();
    if (!profile) throw new Error('No active profile');
    return JSON.stringify({
      profile: {
        name: profile.name,
        expenses: profile.expenses,
        budgets: profile.budgets,
        categories: profile.categories
      },
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  importProfileJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      const profile = this.getActiveProfile();
      if (!profile) throw new Error('No active profile');

      if (Array.isArray(data.profile?.expenses)) {
        data.profile.expenses.forEach(exp => {
          if (!profile.expenses.some(e => e.id === exp.id)) {
            profile.expenses.push(exp);
          }
        });
      }

      if (data.profile?.budgets) {
        profile.budgets = { ...profile.budgets, ...data.profile.budgets };
      }

      if (Array.isArray(data.profile?.categories)) {
        data.profile.categories.forEach(cat => {
          if (!profile.categories.includes(cat)) {
            profile.categories.push(cat);
          }
        });
      }

      this.save();
    } catch (e) {
      throw new Error('Import failed: ' + e.message);
    }
  }
}

const storage = new StorageManager();
export default storage;
