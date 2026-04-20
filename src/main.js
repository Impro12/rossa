import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';

// Core
import EventBus from './core/EventBus.js';
import SceneManager from './scene/SceneManager.js';
import LightingSetup from './scene/LightingSetup.js';
import CameraRig from './scene/CameraRig.js';
import Loader from './core/Loader.js';
import KitchenModel from './scene/KitchenModel.js';
import MaterialLibrary from './scene/MaterialLibrary.js';
import AnimationController from './scene/AnimationController.js';
import InteractionManager from './scene/InteractionManager.js';

// UI
import UIManager from './ui/UIManager.js';
import Toolbar from './ui/Toolbar.js';
import ColorPicker from './ui/ColorPicker.js';
import MaterialSwitcher from './ui/MaterialSwitcher.js';
import Tooltip from './ui/Tooltip.js';

// Config
import colorsConfig from './config/colors.json';
import materialsConfig from './config/materials.json';
import texturesConfig from './config/textures.json';

gsap.registerPlugin(ScrollTrigger);

// ── Door Styles Section ───────────────────────────────
const _DOOR_STYLES = [
  { id: 'flat',       name: 'Flat Slab',   desc: 'Pure minimalism — no profile, no distraction.'  },
  { id: 'shaker',     name: 'Shaker',       desc: 'Classic inset frame, timeless in any palette.'  },
  { id: 'grooved',    name: 'Grooved',      desc: 'Horizontal grain lines for tactile depth.'       },
  { id: 'ribbed',     name: 'Ribbed',       desc: 'Vertical fluting — bold and contemporary.'      },
  { id: 'arched',     name: 'Arched',       desc: 'Soft arch on the upper rail, quietly elegant.'  },
  { id: 'handleless', name: 'Handleless',   desc: 'Push-to-open recessed grip, seamless front.'    },
];

function _buildDoorStrip() {
  const strip = document.getElementById('door-strip');
  if (!strip) return;

  _DOOR_STYLES.forEach((style, i) => {
    const defaultColor = colorsConfig[i % colorsConfig.length];
    const card = document.createElement('article');
    card.className = 'door-card gsap-reveal-up';
    card.dataset.delay = String(i * 0.07);

    card.innerHTML = `
      <div class="door-preview">
        <div class="door-preview-inner">
          <div class="door-face" style="background:${defaultColor.hex}"></div>
          <div class="door-overlay door-overlay--${style.id}"></div>
        </div>
      </div>
      <div class="door-card-info">
        <h3>${style.name}</h3>
        <p>${style.desc}</p>
        <div class="door-swatches">
          ${colorsConfig.map(c => `
            <button class="door-swatch ${c.id === defaultColor.id ? 'active' : ''}"
                    data-hex="${c.hex}" data-color-id="${c.id}"
                    title="${c.name}" style="background:${c.hex}"></button>
          `).join('')}
        </div>
        <button class="door-try-btn" data-color-id="${defaultColor.id}">Try in 3D →</button>
      </div>
    `;

    card.querySelectorAll('.door-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        card.querySelector('.door-face').style.background = sw.dataset.hex;
        card.querySelectorAll('.door-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        card.querySelector('.door-try-btn').dataset.colorId = sw.dataset.colorId;
      });
    });

    card.querySelector('.door-try-btn').addEventListener('click', () => {
      const colorId = card.querySelector('.door-try-btn').dataset.colorId;
      EventBus.emit('config:facadeColor', { colorId });
      document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
    });

    strip.appendChild(card);
  });
}

// ── Materials Showcase Section ────────────────────────
const _SHOWCASE_MATS = [
  {
    id: 'marble',
    name: 'Carrara Marble',
    origin: 'Tuscany, Italy',
    desc: 'Sourced from the same quarries that supplied Michelangelo. White with soft grey veining — no two slabs are identical.',
    price: '+$2,200',
    gradient: 'linear-gradient(135deg, #f0ede8 0%, #e8e4de 30%, #dbd7d2 55%, #e4e0da 75%, #f2efea 100%)',
    cls: 'mat-slab--marble',
  },
  {
    id: 'wood',
    name: 'European Oak',
    origin: 'Black Forest, Germany',
    desc: 'FSC-certified solid oak, air-dried for two years before cutting. The open grain catches light differently at every hour.',
    price: '+$800',
    gradient: 'linear-gradient(160deg, #c8a96e 0%, #b8925a 20%, #c9a46a 40%, #a07840 60%, #b89058 80%, #c4a060 100%)',
    cls: 'mat-slab--wood',
  },
  {
    id: 'black-granite',
    name: 'Black Granite',
    origin: 'Karnataka, India',
    desc: 'Absolute black granite polished to a mirror finish. Impervious to heat, acid, and time — it grounds any palette.',
    price: '+$2,800',
    gradient: 'linear-gradient(135deg, #1a1a1c 0%, #252527 25%, #1c1c1e 55%, #2a2a2c 80%, #1a1a1c 100%)',
    cls: 'mat-slab--granite',
  },
];

function _buildMatShowcase() {
  const list = document.getElementById('mat-showcase-list');
  if (!list) return;

  _SHOWCASE_MATS.forEach(mat => {
    const row = document.createElement('div');
    row.className = 'mat-showcase-row gsap-reveal-up';

    row.innerHTML = `
      <div class="mat-slab ${mat.cls}">
        <div class="mat-slab-inner" style="background:${mat.gradient}"></div>
      </div>
      <div class="mat-text">
        <span class="mat-showcase-origin">${mat.origin}</span>
        <h3 class="mat-showcase-name">${mat.name}</h3>
        <p class="mat-showcase-desc">${mat.desc}</p>
        <p class="mat-showcase-price">Price upgrade from ${mat.price}</p>
        <button class="mat-try-btn" data-mat-id="${mat.id}">Try This Surface →</button>
      </div>
    `;

    row.querySelector('.mat-try-btn').addEventListener('click', () => {
      EventBus.emit('config:countertop', { materialId: mat.id });
      document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
    });

    list.appendChild(row);
  });
}

async function bootstrap() {
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Theme toggle ──────────────────────────────────────
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle?.addEventListener('click', () => {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    if (themeToggle) themeToggle.textContent = isDark ? 'Dark' : 'Light';
  });

  // ── Mobile nav toggle ─────────────────────────────────
  const navToggle  = document.getElementById('nav-toggle');
  const headerNav  = document.getElementById('header-nav');
  navToggle?.addEventListener('click', () => {
    const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!isOpen));
    navToggle.classList.toggle('active', !isOpen);
    headerNav?.classList.toggle('nav-open', !isOpen);
  });
  headerNav?.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navToggle?.setAttribute('aria-expanded', 'false');
      navToggle?.classList.remove('active');
      headerNav?.classList.remove('nav-open');
    });
  });

  // ── Lenis smooth scroll ───────────────────────────────
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: !isReducedMotion,
  });
  // Connect Lenis to GSAP ticker so ScrollTrigger reads the correct scroll position
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.on('scroll', ScrollTrigger.update);

  // ── Loading screen ────────────────────────────────────
  const loadingBar = document.getElementById('loading-bar');
  const loadingScreenEl = document.getElementById('loading-screen');
  const loadingFallback = setTimeout(() => _hideLoadingScreen(), 6000);

  EventBus.on('loading:progress', (e) => {
    const pct = Math.min(100, Math.round(e.detail.progress * 100));
    gsap.to(loadingBar, { width: `${pct}%`, duration: 0.3, ease: 'power1.out' });
  });

  function _hideLoadingScreen() {
    clearTimeout(loadingFallback);
    setTimeout(() => {
      const tl = gsap.timeline();
      tl.to(loadingBar,       { opacity: 0, duration: 0.3 })
        .to(loadingScreenEl,  { opacity: 0, duration: 0.8, ease: 'power2.inOut' }, '+=0.2')
        .set(loadingScreenEl, { display: 'none' });
    }, 500);
  }

  // ── Three.js init ─────────────────────────────────────
  const canvas = document.getElementById('canvas');
  if (!canvas) { console.error('[Rossa] Canvas element not found'); return; }

  const sceneManager = new SceneManager(canvas);
  new LightingSetup(sceneManager.scene, sceneManager.renderer);
  const cameraRig = new CameraRig(sceneManager.camera, canvas, sceneManager);

  // ── Asset loader ──────────────────────────────────────
  Loader.init(sceneManager.renderer);

  // ── Kitchen model ─────────────────────────────────────
  await KitchenModel.init(sceneManager.scene);

  // ── Materials ─────────────────────────────────────────
  MaterialLibrary.init({ colors: colorsConfig }, materialsConfig, texturesConfig);

  // Apply initial defaults so the scene matches the store state
  MaterialLibrary.setFacadeColor('f_arctic');
  MaterialLibrary.setFacadeTexture('t_matte');
  MaterialLibrary.setCountertopMaterial('marble');
  MaterialLibrary.setHandleFinish('chrome');

  EventBus.emit('loading:progress', { progress: 0.9 });

  // ── Interaction ───────────────────────────────────────
  InteractionManager.init(sceneManager.camera, canvas);
  // Provide targets directly — model is already loaded at this point
  InteractionManager.setInteractiveTargets(KitchenModel.getInteractiveMeshes());
  AnimationController.init();

  // ── UI ────────────────────────────────────────────────
  UIManager.init();
  Toolbar.init();
  ColorPicker.init({ colors: colorsConfig }, texturesConfig);
  MaterialSwitcher.init(materialsConfig);
  Tooltip.init();

  // ── Hover emissive highlight ──────────────────────────
  // Applies a subtle emissive glow to the hovered mesh only,
  // without cloning or breaking the shared-material pattern.
  let _hoveredMesh = null;
  let _hoveredClone = null;

  EventBus.on('interact:hover', (e) => {
    // Restore the previous hovered mesh
    if (_hoveredMesh && _hoveredClone) {
      if (_hoveredMesh.material === _hoveredClone) {
        _hoveredMesh.material = _hoveredClone.userData.original;
      }
      _hoveredClone.dispose();
      _hoveredClone = null;
      _hoveredMesh = null;
    }

    const name = e.detail.meshName;
    if (!name) return;

    const mesh = KitchenModel.getMesh(name);
    if (!mesh) return;

    const clone = mesh.material.clone();
    clone.emissive.set(0x444444);
    clone.emissiveIntensity = 0.06;
    clone.userData.original = mesh.material;

    _hoveredMesh = mesh;
    _hoveredClone = clone;
    mesh.material = clone;
  });

  // ── Drawer announce for screen readers ────────────────
  const _announceEl = document.getElementById('announce');
  EventBus.on('part:opened', () => {
    if (_announceEl) _announceEl.textContent = 'Drawer opened';
  });
  EventBus.on('part:closed', () => {
    if (_announceEl) _announceEl.textContent = 'Drawer closed';
  });

  // Request a render whenever materials or animations change
  EventBus.on('interact:hover',  () => sceneManager.requestRender(2));
  EventBus.on('interact:click',  () => sceneManager.requestRender(60));
  EventBus.on('part:opened',     () => sceneManager.requestRender(60));
  EventBus.on('part:closed',     () => sceneManager.requestRender(60));
  EventBus.on('material:change', () => sceneManager.requestRender(4));
  EventBus.on('camera:goto',     () => sceneManager.requestRender(120));
  EventBus.on('camera:arrived',  () => sceneManager.requestRender(4));

  // ── Render loop ───────────────────────────────────────
  sceneManager.onUpdate(() => {
    cameraRig.update();
    InteractionManager.update();
  });
  sceneManager.startRenderLoop();
  sceneManager.requestRender(10); // initial frames to show the scene

  // ── Auto-rotate on idle (8 s) ─────────────────────────
  let idleTimeout;
  const resetIdle = () => {
    cameraRig.controls.autoRotate = false;
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
      cameraRig.controls.autoRotate = true;
      cameraRig.controls.autoRotateSpeed = 0.4;
    }, 8000);
  };
  canvas.addEventListener('pointermove', resetIdle);
  window.addEventListener('keydown', resetIdle);
  resetIdle();

  // ── Play mode toggle (mobile) ─────────────────────────
  // Default: touch-action=pan-y so vertical swipes scroll the page.
  // When the user taps "Rotate", switch to touch-action=none so OrbitControls
  // gets all touch events. Auto-exit when the hero scrolls out of view.
  const playToggle = document.getElementById('play-toggle');
  let _playMode = false;

  function _setPlayMode(on) {
    _playMode = on;
    canvas.style.touchAction = on ? 'none' : 'pan-y';
    playToggle?.classList.toggle('active', on);
    playToggle?.setAttribute('aria-pressed', String(on));
    if (playToggle) {
      playToggle.querySelector('.play-toggle-label').textContent = on ? 'Done' : 'Rotate';
      playToggle.setAttribute('aria-label', on ? 'Exit 3D rotation' : 'Enable 3D rotation');
    }
  }

  playToggle?.addEventListener('click', () => _setPlayMode(!_playMode));

  // Auto-exit play mode when the hero leaves the viewport
  const heroEl = document.getElementById('hero');
  if (heroEl && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting && _playMode) _setPlayMode(false); },
      { threshold: 0.1 },
    ).observe(heroEl);
  }

  // ── Loading complete ──────────────────────────────────
  EventBus.emit('loading:progress', { progress: 1 });
  _hideLoadingScreen();

  // ── Landing page dynamic sections ────────────────────
  _buildDoorStrip();
  _buildMatShowcase();

  // ── ScrollTrigger animations ──────────────────────────
  if (!isReducedMotion) {
    // Hero section pins for ~300 px (≈ 3 wheel ticks).
    // During the pin: hero text + toolbar fade out while the page stays still.
    // After the pin releases the hero scrolls away naturally and the landing
    // sections below scroll into view. The header is position:fixed and never
    // animated — it stays visible at all times.
    const pinTl = gsap.timeline();
    pinTl
      // scroll 1 — hero text fades out
      .to('.hero-content', { opacity: 0, y: -24, ease: 'power2.in', duration: 0.4 }, 0)
      // scroll 2 — 3D canvas gently scales up, drawing focus to the model
      .to('#canvas-wrapper', { scale: 1.04, ease: 'power1.inOut', duration: 0.4 }, 0.5)
      .to('#canvas-wrapper', { scale: 1.00, ease: 'power1.inOut', duration: 0.1 }, 0.9);

    ScrollTrigger.create({
      trigger: '#hero',
      start: 'top top',
      end: '+=600',
      pin: true,
      pinSpacing: true,
      scrub: 0.5,
      animation: pinTl,
    });

    // Landing page reveal animations
    document.querySelectorAll('.gsap-reveal-up').forEach(el => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
        y: 40,
        opacity: 0,
        duration: 0.8,
        delay: parseFloat(el.dataset.delay) || 0,
        ease: 'power2.out',
      });
    });
  }

  // ── Gallery lightbox ──────────────────────────────────
  const lb        = document.getElementById('lightbox');
  const lbImg     = document.getElementById('lb-img');
  const lbCaption = document.getElementById('lb-caption');
  const lbClose   = document.getElementById('lb-close');
  const lbPrev    = document.getElementById('lb-prev');
  const lbNext    = document.getElementById('lb-next');
  const lbBackdrop= document.getElementById('lb-backdrop');

  const galleryItems = () => [...document.querySelectorAll('.gallery-item img')];
  let lbIndex = 0;

  function lbOpen(index) {
    const items = galleryItems();
    lbIndex = (index + items.length) % items.length;
    const img = items[lbIndex];
    lbImg.classList.remove('lb-visible');
    lbImg.src = img.src.replace(/w=\d+/, 'w=1400');
    lbImg.alt = img.alt;
    lbCaption.textContent = img.closest('.gallery-item')?.querySelector('figcaption')?.textContent ?? '';
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    lbImg.onload = () => lbImg.classList.add('lb-visible');
    if (lbImg.complete) lbImg.classList.add('lb-visible');
  }

  function lbClose_() {
    lb.hidden = true;
    document.body.style.overflow = '';
    lbImg.classList.remove('lb-visible');
  }

  document.querySelectorAll('.gallery-item').forEach((item, i) => {
    item.addEventListener('click', () => lbOpen(i));
  });

  lbClose.addEventListener('click', lbClose_);
  lbBackdrop.addEventListener('click', lbClose_);
  lbPrev.addEventListener('click', () => lbOpen(lbIndex - 1));
  lbNext.addEventListener('click', () => lbOpen(lbIndex + 1));

  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape')     lbClose_();
    if (e.key === 'ArrowLeft')  lbOpen(lbIndex - 1);
    if (e.key === 'ArrowRight') lbOpen(lbIndex + 1);
  });

  // ── Pause render when tab hidden ──────────────────────
  document.addEventListener('visibilitychange', () => {
    document.hidden ? sceneManager.stopRenderLoop() : sceneManager.startRenderLoop();
  });

  console.info('[Rossa] App bootstrapped.');
}

bootstrap().catch(err => {
  console.error('[Rossa] Bootstrap failed:', err);
  const ls = document.getElementById('loading-screen');
  if (ls) ls.style.display = 'none';
});
