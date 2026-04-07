import GUI from 'lil-gui';
import Store from '../core/Store.js';
import CameraRig from '../scene/CameraRig.js';
import MaterialLibrary from '../scene/MaterialLibrary.js';
import EventBus from '../core/EventBus.js';

/**
 * debug.js — lil-gui development panel (dev mode only).
 */

const Debug = {
  init() {
    const gui = new GUI({ title: 'Rossa Debug' });
    gui.domElement.style.zIndex = '9999';

    // ── Camera ──────────────────────────────────────────
    const camFolder = gui.addFolder('Camera');
    const wpProxy = { waypoint: 'overview' };
    camFolder.add(wpProxy, 'waypoint', ['overview', 'island', 'storage', 'appliances'])
      .name('Goto Waypoint')
      .onChange(v => EventBus.emit('camera:goto', { waypoint: v }));

    // ── Config ──────────────────────────────────────────
    const cfgFolder = gui.addFolder('Config');
    const snap = Store.getSnapshot();

    const colorProxy = { color: snap.facadeColorId };
    cfgFolder.add(colorProxy, 'color', [
      'arctic-white','warm-taupe','sage-green','forest',
      'midnight-navy','charcoal','terracotta','blush-pink',
      'slate-blue','cream','olive','aubergine',
    ]).name('Facade Colour').onChange(v => EventBus.emit('config:facadeColor', { colorId: v }));

    const ctProxy = { countertop: snap.countertopMaterialId };
    cfgFolder.add(ctProxy, 'countertop', ['marble','wood','concrete','quartz'])
      .name('Countertop').onChange(v => EventBus.emit('config:countertop', { materialId: v }));

    const handleProxy = { finish: snap.handleFinishId };
    cfgFolder.add(handleProxy, 'finish', ['chrome','brass','matte-black'])
      .name('Hardware').onChange(v => EventBus.emit('config:handleFinish', { finishId: v }));

    // ── Store state (read-only) ─────────────────────────
    const stateFolder = gui.addFolder('State').close();
    const stateDisplay = { price: snap.totalPrice, openParts: '—' };
    const priceCtrl = stateFolder.add(stateDisplay, 'price').name('Total Price').disable();
    const partsCtrl = stateFolder.add(stateDisplay, 'openParts').name('Open Parts').disable();

    Store.subscribe('totalPrice', v => { stateDisplay.price = v; priceCtrl.updateDisplay(); });
    Store.subscribe('openParts', v => { stateDisplay.openParts = v.join(', ') || '—'; partsCtrl.updateDisplay(); });

    gui.close();
    console.info('[Debug] lil-gui initialized');
  },
};

export default Debug;
