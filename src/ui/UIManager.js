import EventBus from '../core/EventBus.js';
import Store from '../core/Store.js';

/**
 * UIManager — panel orchestration (show/hide), keyboard shortcuts, z-order.
 */

/** @type {Map<string, HTMLElement>} */
const _panels = new Map();
const _toggleBtns = new Map();

const UIManager = {
  init() {
    // Index all panels and their toggle buttons
    document.querySelectorAll('.panel').forEach(el => {
      const id = el.id.replace('panel-', '');
      _panels.set(id, el);
    });

    document.querySelectorAll('.panel-toggle').forEach(btn => {
      const id = btn.dataset.panel;
      _toggleBtns.set(id, btn);
      btn.addEventListener('click', () => this.toggle(id));
    });

    document.querySelectorAll('.panel-close').forEach(btn => {
      const id = btn.dataset.panel;
      btn.addEventListener('click', () => this.close(id));
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAll();
      if (e.key === 'c') this.toggle('colors');
      if (e.key === 'm') this.toggle('materials');
    });

    // Sync from store
    Store.subscribe('activePanelId', (id) => {
      _panels.forEach((el, key) => {
        const open = key === id;
        el.hidden = !open;
        el.setAttribute('aria-hidden', String(!open));
        _toggleBtns.get(key)?.classList.toggle('active', open);
      });
    });
  },

  /** @param {string} id */
  toggle(id) {
    const current = Store.state.activePanelId;
    Store.state.activePanelId = current === id ? null : id;
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
