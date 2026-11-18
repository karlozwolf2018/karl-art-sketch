/* ============================================================
   core/admin.js — Modo Administrador y control de acceso
   Expone: CYBER.Admin
   ------------------------------------------------------------
   Permite restringir las funciones de crear, respaldar y exportar
   obras a visitantes. Se activa mediante el atajo "Ctrl + Shift + A"
   o al intentar ejecutar una acción protegida, solicitando password.
   ============================================================ */
(function (CYBER) {
  'use strict';

  const dom = CYBER.dom;
  const bus = CYBER.bus;

  const STORAGE_KEY = 'neon-sketch:admin-auth';
  const PWD_STORAGE_KEY = 'neon-sketch:admin-password';
  const DEFAULT_PWD = '';

  /* Función criptográfica SHA-256 autónoma y síncrona sin dependencias */
  function sha256Sync(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    let i, j;
    let result = '';
    const words = [];
    const asciiBitLength = ascii.length * 8;

    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    let H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];

    words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
    words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

    for (i = 0; i < ascii.length; i++) {
      words[i >> 2] |= ascii.charCodeAt(i) << (24 - (i % 4) * 8);
    }

    const W = new Array(64);
    for (j = 0; j < words.length; j += 16) {
      for (i = 0; i < 16; i++) {
        W[i] = words[j + i] | 0;
      }
      for (i = 16; i < 64; i++) {
        const s0 = (rightRotate(W[i - 15], 7) ^ rightRotate(W[i - 15], 18) ^ (W[i - 15] >>> 3));
        const s1 = (rightRotate(W[i - 2], 17) ^ rightRotate(W[i - 2], 19) ^ (W[i - 2] >>> 10));
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
      }

      let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];

      for (i = 0; i < 64; i++) {
        const S1 = (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25));
        const ch = ((e & f) ^ ((~e) & g));
        const temp1 = (h + S1 + ch + K[i] + W[i]) | 0;
        const S0 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22));
        const maj = ((a & b) ^ (a & c) ^ (b & c));
        const temp2 = (S0 + maj) | 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) | 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) | 0;
      }

      H[0] = (H[0] + a) | 0;
      H[1] = (H[1] + b) | 0;
      H[2] = (H[2] + c) | 0;
      H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0;
      H[5] = (H[5] + f) | 0;
      H[6] = (H[6] + g) | 0;
      H[7] = (H[7] + h) | 0;
    }

    for (i = 0; i < 8; i++) {
      for (j = 3; j >= 0; j--) {
        const byte = (H[i] >>> (j * 8)) & 255;
        result += (byte < 16 ? '0' : '') + byte.toString(16);
      }
    }
    return result;
  }

  const Admin = {
    isAdmin: false,
    configPassword: '',
    configPasswordHash: '',
    modalEl: null,

    init(config) {
      const cfg = config || (CYBER.FallbackData && CYBER.FallbackData.config) || {};
      if (cfg.adminPasswordHash) {
        this.configPasswordHash = String(cfg.adminPasswordHash).trim().toLowerCase();
      } else if (cfg.admin && cfg.admin.passwordHash) {
        this.configPasswordHash = String(cfg.admin.passwordHash).trim().toLowerCase();
      }

      if (cfg.adminPassword) {
        this.configPassword = String(cfg.adminPassword).trim();
      } else if (cfg.admin && cfg.admin.password) {
        this.configPassword = String(cfg.admin.password).trim();
      }

      /* Limpiar contraseña residual por defecto si estuviese en localStorage */
      try {
        if (window.localStorage.getItem(PWD_STORAGE_KEY) === 'admin') {
          window.localStorage.removeItem(PWD_STORAGE_KEY);
        }
      } catch (e) {}

      /* Verificar si ya había sesión iniciada en la pestaña actual */
      try {
        if (window.sessionStorage.getItem(STORAGE_KEY) === 'true') {
          this.setAdmin(true, false);
        } else {
          this.setAdmin(false, false);
        }
      } catch (e) {
        this.setAdmin(false, false);
      }

      /* Listener global para el atajo Ctrl + Shift + A */
      window.addEventListener('keydown', function (evt) {
        const key = (evt.key || '').toLowerCase();
        if ((evt.ctrlKey || evt.metaKey) && evt.shiftKey && (key === 'a' || evt.code === 'KeyA')) {
          evt.preventDefault();
          evt.stopPropagation();
          Admin.toggleOrPrompt();
        }
      }, true);

      return this;
    },

    /** Obtiene el hash SHA-256 esperado */
    getPasswordHash() {
      if (this.configPasswordHash) return this.configPasswordHash;
      if (this.configPassword) return sha256Sync(this.configPassword);
      try {
        const stored = window.localStorage.getItem(PWD_STORAGE_KEY);
        if (stored) return stored.length === 64 ? stored : sha256Sync(stored);
      } catch (e) {}
      return '';
    },

    /** Obtiene la contraseña válida configurada (texto plano si existe) */
    getPassword() {
      if (this.configPassword) return this.configPassword;
      try {
        const stored = window.localStorage.getItem(PWD_STORAGE_KEY);
        if (stored && stored.length !== 64) return stored;
      } catch (e) {}
      return DEFAULT_PWD;
    },

    /** Guarda una nueva contraseña aplicando SHA-256 */
    setPassword(newPassword) {
      if (!newPassword) return false;
      try {
        const trimmed = String(newPassword).trim();
        const hash = sha256Sync(trimmed);
        this.configPasswordHash = hash;
        window.localStorage.setItem(PWD_STORAGE_KEY, hash);
        return true;
      } catch (e) {
        return false;
      }
    },

    check() {
      return this.isAdmin;
    },

    setAdmin(status, notify) {
      this.isAdmin = !!status;
      try {
        if (this.isAdmin) {
          window.sessionStorage.setItem(STORAGE_KEY, 'true');
          document.documentElement.classList.add('is-admin');
          document.body && document.body.classList.add('is-admin');
        } else {
          window.sessionStorage.removeItem(STORAGE_KEY);
          document.documentElement.classList.remove('is-admin');
          document.body && document.body.classList.remove('is-admin');
        }
      } catch (e) {}

      if (bus && CYBER.EVENTS && CYBER.EVENTS.ADMIN_CHANGED) {
        bus.emit(CYBER.EVENTS.ADMIN_CHANGED, { isAdmin: this.isAdmin });
      }

      if (notify && bus) {
        bus.emit(CYBER.EVENTS.TOAST, {
          type: this.isAdmin ? 'ok' : 'info',
          text: this.isAdmin
            ? '✓ Modo Administrador activado · Funciones desbloqueadas'
            : 'Modo Administrador desactivado (Modo Visitante)'
        });
      }
    },

    login(password) {
      const entered = String(password || '').trim();
      if (!entered) return false;
      const enteredHash = sha256Sync(entered);
      const expectedHash = this.getPasswordHash();

      /* Comprobación criptográfica SHA-256 */
      if (expectedHash && enteredHash === expectedHash) {
        this.setAdmin(true, true);
        return true;
      }
      /* Fallback para compatibilidad con contraseña en texto plano si estuviese definida */
      const validPlain = this.getPassword();
      if (validPlain && entered === validPlain) {
        this.setAdmin(true, true);
        return true;
      }
      return false;
    },

    logout() {
      this.setAdmin(false, true);
    },

    /**
     * Envuelve una acción para requerir modo administrador.
     * Si no es admin, abre el modal de contraseña.
     */
    require(actionFn) {
      if (this.isAdmin) {
        if (typeof actionFn === 'function') actionFn();
        return;
      }
      this.prompt(actionFn);
    },

    /** Abre el modal de contraseña */
    prompt(callback) {
      this.closeModal();

      const self = this;
      const modal = dom.el('div', { class: 'admin-modal', attrs: { role: 'dialog', 'aria-modal': 'true' } });
      const backdrop = dom.el('div', { class: 'admin-modal__backdrop' });
      const dialog = dom.el('div', { class: 'admin-modal__dialog' });

      const header = dom.el('div', { class: 'admin-modal__header' }, [
        dom.el('div', { class: 'admin-modal__badge', text: 'ACCESO RESTRINGIDO' }),
        dom.el('h2', { class: 'admin-modal__title', text: 'MODO ADMINISTRADOR' }),
        dom.el('p', {
          class: 'admin-modal__sub',
          text: 'Introduce tu contraseña para desbloquear las opciones de subir obras, respaldar y exportar.'
        })
      ]);

      const form = dom.el('form', { class: 'admin-modal__form' });
      const inputWrap = dom.el('div', { class: 'admin-modal__field' });
      const input = dom.el('input', {
        class: 'admin-modal__input',
        attrs: {
          type: 'password',
          placeholder: 'Contraseña de administrador...',
          autocomplete: 'current-password',
          required: 'true'
        }
      });
      const errorMsg = dom.el('div', { class: 'admin-modal__error', text: '' });

      inputWrap.appendChild(input);
      inputWrap.appendChild(errorMsg);

      const actions = dom.el('div', { class: 'admin-modal__actions' });
      const btnCancel = dom.el('button', {
        class: 'btn btn--ghost',
        attrs: { type: 'button' },
        text: 'CANCELAR'
      });
      const btnSubmit = dom.el('button', {
        class: 'btn btn--accent',
        attrs: { type: 'submit' },
        text: 'ACCEDER'
      });

      actions.appendChild(btnCancel);
      actions.appendChild(btnSubmit);

      form.appendChild(inputWrap);
      form.appendChild(actions);

      dialog.appendChild(header);
      dialog.appendChild(form);

      modal.appendChild(backdrop);
      modal.appendChild(dialog);

      function doSubmit(evt) {
        if (evt) evt.preventDefault();
        const pwd = input.value;
        if (self.login(pwd)) {
          self.closeModal();
          if (typeof callback === 'function') callback();
        } else {
          errorMsg.textContent = 'Contraseña incorrecta. Inténtalo de nuevo.';
          input.classList.add('is-invalid');
          input.select();
        }
      }

      function doClose() {
        self.closeModal();
      }

      form.addEventListener('submit', doSubmit);
      btnCancel.addEventListener('click', doClose);
      backdrop.addEventListener('click', doClose);

      function onKey(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          doClose();
        }
      }
      modal.addEventListener('keydown', onKey);

      document.body.appendChild(modal);
      this.modalEl = modal;

      window.setTimeout(function () {
        input.focus();
      }, 60);
    },

    toggleOrPrompt() {
      if (this.isAdmin) {
        this.promptLogout();
      } else {
        this.prompt();
      }
    },

    promptLogout() {
      this.closeModal();

      const self = this;
      const modal = dom.el('div', { class: 'admin-modal', attrs: { role: 'dialog', 'aria-modal': 'true' } });
      const backdrop = dom.el('div', { class: 'admin-modal__backdrop' });
      const dialog = dom.el('div', { class: 'admin-modal__dialog' });

      const header = dom.el('div', { class: 'admin-modal__header' }, [
        dom.el('div', { class: 'admin-modal__badge is-active', text: 'MODO ACTIVO' }),
        dom.el('h2', { class: 'admin-modal__title', text: 'SESIÓN DE ADMINISTRADOR' }),
        dom.el('p', {
          class: 'admin-modal__sub',
          text: 'Actualmente estás en Modo Administrador. ¿Deseas cerrar sesión para volver al Modo Visitante?'
        })
      ]);

      const actions = dom.el('div', { class: 'admin-modal__actions' });
      const btnStay = dom.el('button', {
        class: 'btn btn--ghost',
        attrs: { type: 'button' },
        text: 'CONTINUAR COMO ADMIN'
      });
      const btnExit = dom.el('button', {
        class: 'btn btn--magenta',
        attrs: { type: 'button' },
        text: 'CERRAR SESIÓN'
      });

      actions.appendChild(btnStay);
      actions.appendChild(btnExit);

      dialog.appendChild(header);
      dialog.appendChild(actions);

      modal.appendChild(backdrop);
      modal.appendChild(dialog);

      btnStay.addEventListener('click', function () { self.closeModal(); });
      backdrop.addEventListener('click', function () { self.closeModal(); });
      btnExit.addEventListener('click', function () {
        self.closeModal();
        self.logout();
      });

      document.body.appendChild(modal);
      this.modalEl = modal;
    },

    closeModal() {
      if (this.modalEl && this.modalEl.parentNode) {
        this.modalEl.parentNode.removeChild(this.modalEl);
      }
      this.modalEl = null;
    }
  };

  CYBER.Admin = Admin;
})(window.CYBER = window.CYBER || {});
