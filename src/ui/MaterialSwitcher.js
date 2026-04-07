import EventBus from '../core/EventBus.js';
import Store from '../core/Store.js';

/**
 * MaterialSwitcher — countertop and handle finish selectors.
 */

const MaterialSwitcher = {
  /** @param {{ countertops: Array, handles: Array }} materialsConfig */
  init(materialsConfig) {
    _renderCountertops(materialsConfig.countertops);
    _renderHandles(materialsConfig.handles);

    Store.subscribe('countertopMaterialId', id => _setActiveCountertop(id));
    Store.subscribe('handleFinishId',       id => _setActiveHandle(id));

    _setActiveCountertop(Store.state.countertopMaterialId);
    _setActiveHandle(Store.state.handleFinishId);
  },
};

/** @param {Array} countertops */
function _renderCountertops(countertops) {
  const container = document.getElementById('countertop-options');
  if (!container) return;

  countertops.forEach(ct => {
    const btn = document.createElement('button');
    btn.id = `ct-${ct.id}`;
    btn.className = 'mat-card';
    btn.setAttribute('aria-label', ct.name);
    btn.setAttribute('title', ct.description || ct.name);

    // Colour preview (gradient placeholder until thumbnail loads)
    const colors = { marble: '#dbd7d2', wood: '#8b6914', concrete: '#9a9a99', quartz: '#e5e0da' };
    const thumb = document.createElement('div');
    thumb.className = 'mat-thumb';
    thumb.style.background = colors[ct.id] ?? '#ccc';
    if (ct.thumbnail) {
      const img = new Image();
      img.src = ct.thumbnail;
      img.onload = () => { thumb.style.backgroundImage = `url(${ct.thumbnail})`; thumb.style.backgroundSize = 'cover'; };
    }

    const info = document.createElement('div');
    info.className = 'mat-info';

    const name = document.createElement('span');
    name.className = 'mat-name';
    name.textContent = ct.name;

    const price = document.createElement('span');
    price.className = 'mat-price';
    price.textContent = ct.priceDelta > 0 ? `+€${ct.priceDelta.toLocaleString()}` : 'Included';

    info.append(name, price);
    btn.append(thumb, info);
    btn.addEventListener('click', () => {
      EventBus.emit('config:countertop', { materialId: ct.id });
    });
    container.appendChild(btn);
  });
}

/** @param {Array} handles */
function _renderHandles(handles) {
  const container = document.getElementById('handle-options');
  if (!container) return;

  handles.forEach(h => {
    const btn = document.createElement('button');
    btn.id = `handle-${h.id}`;
    btn.className = 'handle-chip';
    btn.setAttribute('aria-label', h.name);

    const dot = document.createElement('span');
    dot.className = 'handle-dot';
    dot.style.background = h.color;

    const name = document.createElement('span');
    name.textContent = h.name;

    const price = document.createElement('span');
    price.className = 'handle-price';
    price.textContent = h.priceDelta > 0 ? `+€${h.priceDelta}` : 'Included';

    btn.append(dot, name, price);
    btn.addEventListener('click', () => {
      EventBus.emit('config:handleFinish', { finishId: h.id });
    });
    container.appendChild(btn);
  });
}

function _setActiveCountertop(id) {
  document.querySelectorAll('.mat-card').forEach(btn => {
    btn.classList.toggle('active', btn.id === `ct-${id}`);
  });
}

function _setActiveHandle(id) {
  document.querySelectorAll('.handle-chip').forEach(btn => {
    btn.classList.toggle('active', btn.id === `handle-${id}`);
  });
}

export default MaterialSwitcher;
