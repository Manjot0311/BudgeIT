class AppState {
  constructor() {
    this.activeProfileId = null;
    this.appVersion = '2.0.0';
    this.listeners = new Set();
  }

  setActiveProfile(profileId) {
    if (this.activeProfileId !== profileId) {
      this.activeProfileId = profileId;
      this.notify('profile-changed', { profileId });
    }
  }

  getActiveProfile() {
    return this.activeProfileId;
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

const AppState_instance = new AppState();
export default AppState_instance;
