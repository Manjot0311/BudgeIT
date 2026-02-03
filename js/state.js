class AppState {
  constructor() {
    this.appVersion = '2.0.0';
    this.listeners = new Set();
  }

  // 🔔 notifica cambio profilo (la decisione NON è qui)
  notifyProfileChanged(profileId) {
    this.notify('profile-changed', { profileId });
  }

  // 🔔 reset completo stato volatile
  reset() {
    this.notify('state-reset', {});
  }

  onStateChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback({ event, data });
      } catch (e) {
        console.error('State listener error:', e);
      }
    });
  }
}

export default new AppState();
