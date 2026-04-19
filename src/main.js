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

gsap.registerPlugin(ScrollTrigger);

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
  MaterialLibrary.init({ colors: colorsConfig }, materialsConfig);

  // Apply initial defaults so the scene matches the store state
  MaterialLibrary.setFacadeColor('f_arctic');
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
  ColorPicker.init({ colors: colorsConfig });
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

  // ── Loading complete ──────────────────────────────────
  EventBus.emit('loading:progress', { progress: 1 });
  _hideLoadingScreen();

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
