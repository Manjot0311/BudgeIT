const alertModal = {
  isOpen: false,
  onConfirmCallback: null,

  show(title, message, isConfirm = false, onConfirm = null) {
    const modalEl = this.getOrCreateModal();
    
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-message').textContent = message;
    
    const cancelBtn = document.getElementById('alert-cancel');
    const confirmBtn = document.getElementById('alert-confirm');

    if (isConfirm) {
      cancelBtn.style.display = 'block';
      confirmBtn.textContent = 'Conferma';
      this.onConfirmCallback = onConfirm;

      confirmBtn.onclick = () => {
        this.close();
        if (this.onConfirmCallback) {
          this.onConfirmCallback();
        }
      };

      cancelBtn.onclick = () => {
        this.close();
      };
    } else {
      cancelBtn.style.display = 'none';
      confirmBtn.textContent = 'OK';
      confirmBtn.onclick = () => {
        this.close();
      };
    }

    modalEl.classList.add('show');
    this.isOpen = true;
  },

  close() {
    const modalEl = document.getElementById('alert-modal');
    if (modalEl) {
      modalEl.classList.remove('show');
    }
    this.isOpen = false;
    this.onConfirmCallback = null;
  },

  getOrCreateModal() {
    let modal = document.getElementById('alert-modal');
    if (!modal) {
      const root = document.getElementById('modals-root');
      modal = document.createElement('div');
      modal.id = 'alert-modal';
      modal.className = 'alert-modal';
      modal.innerHTML = `
        <div class="alert-content">
          <div class="alert-title" id="alert-title">Attenzione</div>
          <div class="alert-message" id="alert-message">Messaggio</div>
          <div class="alert-buttons">
            <button class="alert-button alert-button-secondary" id="alert-cancel">Annulla</button>
            <button class="alert-button" id="alert-confirm">OK</button>
          </div>
        </div>
      `;
      root.appendChild(modal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.close();
        }
      });
    }
    return modal;
  }
};

export default alertModal;
