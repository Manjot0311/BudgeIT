const toastNotification = {
  timeout: null,

  show(message, actionText = null, actionHandler = null) {
    const toastEl = this.getOrCreateToast();
    
    const msgEl = document.getElementById('toast-message');
    const actionBtn = document.getElementById('toast-action');

    msgEl.textContent = message;

    if (actionText) {
      actionBtn.style.display = 'inline-block';
      actionBtn.textContent = actionText;
      actionBtn.onclick = () => {
        if (actionHandler) actionHandler();
        toastEl.classList.remove('show');
      };
    } else {
      actionBtn.style.display = 'none';
    }

    toastEl.classList.add('show');

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3000);
  },

  getOrCreateToast() {
    let toast = document.getElementById('toast');
    if (!toast) {
      const root = document.getElementById('modals-root');
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      toast.innerHTML = `
        <div class="toast-message" id="toast-message">Operazione completata</div>
        <button class="toast-action" id="toast-action">Annulla</button>
      `;
      root.appendChild(toast);
    }
    return toast;
  }
};

export default toastNotification;
