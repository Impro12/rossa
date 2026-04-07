/**
 * Store — Proxy-based reactive state container.
 *
 * @example
 *   Store.subscribe('facadeColorId', (next, prev) => console.log(next));
 *   Store.state.facadeColorId = 'midnight-navy';
 */

/** @type {import('../config/types.js').AppState} */
const _defaults = {
  loadProgress: 0,
  isLoaded: false,
  facadeColorId: 'arctic-white',
  countertopMaterialId: 'marble',
  handleFinishId: 'chrome',
  activeWaypoint: 'overview',
  openParts: [],
  hoveredPart: null,
  basePrice: 18500,
  totalPrice: 18500,
  activePanelId: null,
  tooltipText: '',
  tooltipPosition: { x: 0, y: 0 },
};

/** @type {Map<string, Set<Function>>} */
const _listeners = new Map();
let _batching = false;
/** @type {Set<string>} — keys mutated during a batch */
const _batchDirty = new Set();

function _notify(key, newVal, oldVal) {
  // Wildcard listeners
  const wild = _listeners.get('*');
  if (wild) wild.forEach(fn => fn(newVal, oldVal, key));

  const specific = _listeners.get(key);
  if (specific) specific.forEach(fn => fn(newVal, oldVal));
}

const _raw = { ..._defaults };

const _proxy = new Proxy(_raw, {
  set(target, key, value) {
    const prev = target[key];
    if (prev === value) return true;
    target[key] = value;
    if (_batching) {
      _batchDirty.add(key);
    } else {
      _notify(key, value, prev);
    }
    return true;
  },
});

const Store = {
  /** @type {typeof _raw} */
  get state() {
    return _proxy;
  },

  /**
   * Subscribe to state changes on a specific key or '*' for all.
   * @param {string} key
   * @param {(newVal: any, oldVal: any, key?: string) => void} cb
   * @returns {() => void} unsubscribe
   */
  subscribe(key, cb) {
    if (!_listeners.has(key)) _listeners.set(key, new Set());
    _listeners.get(key).add(cb);
    return () => _listeners.get(key)?.delete(cb);
  },

  /** @returns {Readonly<typeof _raw>} */
  getSnapshot() {
    return Object.freeze({ ..._raw });
  },

  /**
   * Group multiple mutations and only notify once per key at the end.
   * @param {() => void} fn
   */
  batch(fn) {
    _batching = true;
    _batchDirty.clear();
    fn();
    _batching = false;
    for (const key of _batchDirty) {
      _notify(key, _raw[key], undefined);
    }
    _batchDirty.clear();
  },

  reset() {
    Object.assign(_raw, _defaults);
  },
};

export default Store;
