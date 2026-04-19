import { gsap } from 'gsap';
import Store from '../core/Store.js';
import EventBus from '../core/EventBus.js';

/**
 * Tooltip — shows contextual labels near hovered 3D objects.
 */

let _el = null;

/** Maps mesh name prefix → human-readable label */
const _labels = {
  drawer_island:    'Click to open drawer',
  drawer_base:      'Click to open drawer',
  door_upper:       'Click to open cabinet',
  door_base:        'Click to open cabinet',
  countertop:       'Countertop',
  handle:           'Hardware',
  appliance_oven:   'Oven',
  appliance_hood:   'Extractor Hood',
  appliance_fridge: 'Fridge',
  sink_basin:       'Sink',
  faucet:           'Tap',
};

function _labelFor(meshName) {
  if (!meshName) return '';
  for (const [prefix, label] of Object.entries(_labels)) {
    if (meshName.startsWith(prefix)) return label;
  }
  return '';
}

const Tooltip = {
  init() {
    _el = document.getElementById('tooltip');
    if (!_el) return;

    EventBus.on('interact:hover', (e) => {
      const name = e.detail.meshName;
      const label = _labelFor(name);

      if (label) {
        _el.textContent = label;
        gsap.to(_el, { autoAlpha: 1, duration: 0.2 });
      } else {
        gsap.to(_el, {
          autoAlpha: 0,
          duration: 0.15,
          onComplete: () => { _el.textContent = ''; },
        });
      }
    });

    Store.subscribe('tooltipText', (text) => {
      _el.textContent = text;
    });

    // Follow cursor
    document.addEventListener('pointermove', (e) => {
      Store.state.tooltipPosition = { x: e.clientX + 14, y: e.clientY - 10 };
      if (_el) {
        _el.style.left = `${e.clientX + 14}px`;
        _el.style.top  = `${e.clientY - 10}px`;
      }
    });
  },
};

export default Tooltip;
