class Router {
  constructor() {
    this.currentRoute = null;
    this.routes = {};
    this.listeners = new Set();
  }

  register(path, viewModule) {
    this.routes[path] = viewModule;
  }

  async navigate(path, params = {}) {
    if (!this.routes[path]) {
      console.warn(`Route not found: ${path}`);
      return;
    }

    if (this.currentRoute && this.routes[this.currentRoute]?.destroy) {
      try {
        this.routes[this.currentRoute].destroy();
      } catch (e) {
        console.error('Destroy error:', e);
      }
    }

    const view = this.routes[path];
    if (view?.render) {
      try {
        await view.render(params);
      } catch (e) {
        console.error('Render error:', e);
      }
    }

    this.currentRoute = path;
    this.notify({ route: path, params });
  }

  getCurrentRoute() {
    return this.currentRoute;
  }

  onRouteChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(data) {
    this.listeners.forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.error('Route listener error:', e);
      }
    });
  }
}

const router = new Router();
export default router;
