import EventBus from '../core/EventBus.js';
import Store from '../core/Store.js';

/**
 * ColorPicker — renders facade color swatches and finish texture picker.
 */

const _texturePreviews = {
  t_matte:   'linear-gradient(135deg, #7a7a7a 0%, #7a7a7a 100%)',
  t_satin:   'linear-gradient(150deg, #666 0%, #aaa 45%, #888 100%)',
  t_gloss:   'linear-gradient(135deg, #444 0%, #ddd 38%, #bbb 55%, #777 100%)',
  t_velvet:  'radial-gradient(circle at 35% 35%, #999 0%, #555 65%, #444 100%)',
  t_pearl:   'linear-gradient(135deg, #aaa 0%, #ddd 30%, #bbb 55%, #ccc 75%, #aaa 100%)',
  t_brushed: 'repeating-linear-gradient(90deg, #707070 0px, #999 1.5px, #707070 3px)',
};

const ColorPicker = {
  /** @param {{ colors: Array }} colorsConfig  @param {Array} texturesConfig */
  init(colorsConfig, texturesConfig = []) {
    _renderColors(colorsConfig.colors);
    _renderTextures(texturesConfig);
  },
};

function _renderColors(colors) {
  const container = document.getElementById('color-swatches');
  if (!container) return;

  colors.forEach(color => {
    const btn = document.createElement('button');
    btn.id = `swatch-${color.id}`;
    btn.className = 'swatch';
    btn.setAttribute('aria-label', `${color.name}${color.priceDelta ? ` (+$${color.priceDelta})` : ''}`);
    btn.setAttribute('title', color.name);
    btn.style.setProperty('--swatch-color', color.hex);

    const dot = document.createElement('span');
    dot.className = 'swatch-dot';
    dot.style.background = color.hex;

    const name = document.createElement('span');
    name.className = 'swatch-name';
    name.textContent = color.name;

    const price = document.createElement('span');
    price.className = 'swatch-price';
    price.textContent = color.priceDelta > 0 ? `+$${color.priceDelta.toLocaleString()}` : 'Included';

    btn.append(dot, name, price);
    btn.addEventListener('click', () => {
      EventBus.emit('config:facadeColor', { colorId: color.id });
      _setActiveColor(color.id);
    });
    container.appendChild(btn);
  });

  Store.subscribe('facadeColorId', id => _setActiveColor(id));
  _setActiveColor(Store.state.facadeColorId);
}

function _renderTextures(textures) {
  const container = document.getElementById('texture-swatches');
  if (!container || !textures.length) return;

  textures.forEach(tex => {
    const btn = document.createElement('button');
    btn.id = `tex-${tex.id}`;
    btn.className = 'texture-btn';
    btn.setAttribute('aria-label', tex.name);
    btn.setAttribute('title', tex.name);

    const preview = document.createElement('span');
    preview.className = 'texture-preview';
    preview.style.background = _texturePreviews[tex.id] ?? '#888';

    const label = document.createElement('span');
    label.className = 'texture-label';
    label.textContent = tex.name;

    btn.append(preview, label);
    btn.addEventListener('click', () => {
      EventBus.emit('config:facadeTexture', { textureId: tex.id });
      _setActiveTexture(tex.id);
    });
    container.appendChild(btn);
  });

  Store.subscribe('facadeTextureId', id => _setActiveTexture(id));
  _setActiveTexture(Store.state.facadeTextureId);
}

function _setActiveColor(id) {
  document.querySelectorAll('.swatch').forEach(btn => {
    const isActive = btn.id === `swatch-${id}`;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

function _setActiveTexture(id) {
  document.querySelectorAll('.texture-btn').forEach(btn => {
    const isActive = btn.id === `tex-${id}`;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

export default ColorPicker;
