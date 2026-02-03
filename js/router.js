/* ─── layout: il router decide chi scrolla ─── */
function applyLayout(viewName) {
  document.body.classList.remove('no-scroll');
  if (viewName === 'onboarding') {
    document.body.classList.add('no-scroll');
  }
}

const router = {
  routes: {},
  current: null,
  currentView: null,

  register(name, view) {
    this.routes[name] = view;
  },

  go(name, params = {}) {
    return this.navigate(name, params);
  },

  async navigate(name, params = {}) {
    if (this.current === name) return;

    const view = this.routes[name];
    if (!view || typeof view.render !== 'function') {
      console.error('View non trovata:', name);
      return;
    }

    try {
      if (this.currentView?.destroy) {
        try {
          this.currentView.destroy();
        } catch (e) {
          console.warn('Errore destroy view:', e);
        }
      }

      this.current = name;
      this.currentView = view;

      applyLayout(name);

      await view.render(params);

    } catch (e) {
      console.error('Render error:', e);

      const appEl = document.getElementById('app');
      if (appEl) {
        appEl.innerHTML = `
          <div style="padding:40px;text-align:center">
            <h2>Errore vista</h2>
            <p>${e.message}</p>
          </div>
        `;
      }
    }
  }
};

export default router;