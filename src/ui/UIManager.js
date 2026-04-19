import EventBus from '../core/EventBus.js';
import Store from '../core/Store.js';

/**
 * UIManager — panel orchestration, keyboard shortcuts, focus management.
 */

/** @type {Map<string, HTMLElement>} */
const _panels = new Map();
/** @type {Map<string, HTMLElement>} */
const _toggleBtns = new Map();
/** @type {HTMLElement|null} */
let _lastFocus = null;

const UIManager = {
  init() {
    document.querySelectorAll('.panel').forEach(el => {
      _panels.set(el.id.replace('panel-', ''), el);
    });

    document.querySelectorAll('.panel-toggle').forEach(btn => {
      const id = btn.dataset.panel;
      _toggleBtns.set(id, btn);
      btn.addEventListener('click', () => this.toggle(id));
    });

    document.querySelectorAll('.panel-close').forEach(btn => {
      btn.addEventListener('click', () => this.close(btn.dataset.panel));
    });

    // Keyboard shortcuts — skip when user is typing in a form field
    document.addEventListener('keydown', (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.key === 'Escape') this.closeAll();
      if (e.key === 'c') this.toggle('colors');
      if (e.key === 'm') this.toggle('materials');
    });

    // Sync all UI state from store
    Store.subscribe('activePanelId', (id) => {
      _panels.forEach((el, key) => {
        const open = key === id;
        el.hidden = !open;
        el.setAttribute('aria-hidden', String(!open));

        const btn = _toggleBtns.get(key);
        if (btn) {
          btn.classList.toggle('active', open);
          btn.setAttribute('aria-expanded', String(open));
        }

        if (open) {
          // Focus the first focusable element inside the panel
          const focusable = el.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          focusable?.focus();
        }
      });

      // Restore focus to the toggle button that opened the panel when it closes
      if (id === null && _lastFocus) {
        _lastFocus.focus();
        _lastFocus = null;
      }
    });
  },

  /** @param {string} id */
  toggle(id) {
    const current = Store.state.activePanelId;
    const opening = current !== id;

    // Save the element that has focus right now so we can restore on close
    if (opening) _lastFocus = document.activeElement;

    Store.state.activePanelId = opening ? id : null;
    EventBus.emit('ui:panelToggle', { panelId: Store.state.activePanelId });
  },

  /** @param {string} id */
  close(id) {
    if (Store.state.activePanelId === id) {
      Store.state.activePanelId = null;
    }
  },

  closeAll() {
    Store.state.activePanelId = null;
  },
};

export default UIManager;
