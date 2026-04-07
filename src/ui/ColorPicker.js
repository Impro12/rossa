import EventBus from '../core/EventBus.js';
import Store from '../core/Store.js';

/**
 * ColorPicker — renders facade color swatches and dispatches selection events.
 * @param {import('../config/colors.json')} colorsConfig
 */

const ColorPicker = {
  /**
   * @param {{ colors: Array }} colorsConfig
   */
  init(colorsConfig) {
    const container = document.getElementById('color-swatches');
    if (!container) return;

    colorsConfig.colors.forEach(color => {
      const btn = document.createElement('button');
      btn.id = `swatch-${color.id}`;
      btn.className = 'swatch';
      btn.setAttribute('aria-label', `${color.name}${color.priceDelta ? ` (+€${color.priceDelta})` : ''}`);
      btn.setAttribute('title', color.name);
      btn.style.setProperty('--swatch-color', color.hex);

      const dot  = document.createElement('span');
      dot.className = 'swatch-dot';
      dot.style.background = color.hex;

      const name = document.createElement('span');
      name.className = 'swatch-name';
      name.textContent = color.name;

      const price = document.createElement('span');
      price.className = 'swatch-price';
      price.textContent = color.priceDelta > 0 ? `+€${color.priceDelta.toLocaleString()}` : 'Included';

      btn.append(dot, name, price);
      btn.addEventListener('click', () => {
        EventBus.emit('config:facadeColor', { colorId: color.id });
        _setActive(color.id);
      });

      container.appendChild(btn);
    });

    // Sync active state
    Store.subscribe('facadeColorId', id => _setActive(id));

    // Set default
    _setActive(Store.state.facadeColorId);
  },
};

function _setActive(id) {
  document.querySelectorAll('.swatch').forEach(btn => {
    const isActive = btn.id === `swatch-${id}`;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

export default ColorPicker;
