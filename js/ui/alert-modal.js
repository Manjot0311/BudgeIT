const alertModal = {
  show(title, message) {
    const modal = this._getModal();

    modal.title.textContent = title;
    modal.message.textContent = message;

    modal.inputContainer.style.display = 'none';
    modal.cancelBtn.style.display = 'none';
    modal.confirmBtn.textContent = 'OK';

    modal.confirmBtn.onclick = () => this.close();

    this.open();
  },

  showConfirm({ title, message, confirmText = 'Conferma', cancelText = 'Annulla', onConfirm, onCancel }) {
    const modal = this._getModal();

    modal.title.textContent = title;
    modal.message.textContent = message;

    modal.inputContainer.style.display = 'none';
    modal.cancelBtn.style.display = 'block';
    modal.confirmBtn.textContent = confirmText;
    modal.cancelBtn.textContent = cancelText;

    modal.confirmBtn.onclick = () => {
      this.close();
      if (onConfirm) onConfirm();
    };

    modal.cancelBtn.onclick = () => {
      this.close();
      if (onCancel) onCancel();
    };

    this.open();
  },

  showInput(title, message, type = 'text', onConfirm, defaultValue = '') {
    const modal = this._getModal();

    modal.title.textContent = title;
    modal.message.textContent = message;

    modal.inputContainer.style.display = 'block';
    modal.input.value = defaultValue;
    modal.input.type = type;
    modal.input.placeholder = this._placeholder(type);

    modal.cancelBtn.style.display = 'block';
    modal.confirmBtn.textContent = 'Conferma';

    modal.confirmBtn.onclick = () => {
      const value = modal.input.value;
      this.close();
      if (onConfirm) onConfirm(value);
    };

    modal.cancelBtn.onclick = () => this.close();

    modal.input.onkeydown = (e) => {
      if (e.key === 'Enter') modal.confirmBtn.click();
    };

    this.open(() => modal.input.focus());
  },

  open(afterOpen) {
    const modal = this._getModal();
    // usa l'elemento DOM memorizzato in modal.el
    modal.el.classList.add('show');
    if (afterOpen) setTimeout(afterOpen, 50);
  },

  close() {
    const modal = this._getModal();
    modal.el.classList.remove('show');
    this._reset();
  },

  _reset() {
    const modal = this.modal;
    if (!modal) return;
    if (modal.input) modal.input.value = '';
    modal.confirmBtn.onclick = null;
    modal.cancelBtn.onclick = null;
  },

  _placeholder(type) {
    return {
      text: 'Inserisci testo',
      number: '0.00',
      password: '••••'
    }[type] || '';
  },

  _getModal() {
    if (this.modal) return this.modal;

    const modalEl = document.createElement('div');
    modalEl.id = 'alert-modal';
    modalEl.className = 'alert-modal';
    modalEl.innerHTML = `
      <div class="alert-content">
        <div class="alert-title"></div>
        <div class="alert-message"></div>

        <div class="alert-input-container" style="display:none; margin-top:16px;">
          <input class="input-field" style="width:100%" />
        </div>

        <div class="alert-buttons">
          <button class="alert-button-secondary">Annulla</button>
          <button class="alert-button">OK</button>
        </div>
      </div>
    `;

    const modalsRoot = document.getElementById('modals-root') || document.body;
    modalsRoot.appendChild(modalEl);

    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) this.close();
    });

    this.modal = {
      el: modalEl,
      title: modalEl.querySelector('.alert-title'),
      message: modalEl.querySelector('.alert-message'),
      inputContainer: modalEl.querySelector('.alert-input-container'),
      input: modalEl.querySelector('input'),
      confirmBtn: modalEl.querySelector('.alert-button'),
      cancelBtn: modalEl.querySelector('.alert-button-secondary')
    };

    return this.modal;
  }
};

export default alertModal;