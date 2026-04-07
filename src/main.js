import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';

// Core
import SceneManager from './scene/SceneManager.js';
import LightingSetup from './scene/LightingSetup.js';
import CameraRig from './scene/CameraRig.js';
import KitchenLoader from './scene/KitchenLoader.js';

// Interaction
import DrawerController from './interaction/DrawerController.js';
import ColorConfigurator from './interaction/ColorConfigurator.js';
import HoverHighlight from './interaction/HoverHighlight.js';

// UI
import LoadingScreen from './ui/LoadingScreen.js';
import ColorPanel from './ui/ColorPanel.js';
import NavigationDots from './ui/NavigationDots.js';
import PriceDisplay from './ui/PriceDisplay.js';

gsap.registerPlugin(ScrollTrigger);

async function bootstrap() {
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  const html = document.documentElement;
  themeToggle?.addEventListener('click', () => {
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    if (themeToggle) themeToggle.textContent = isDark ? 'Dark' : 'Light';
    // Update 3D scene background
    if (sceneManager) {
      sceneManager.scene.background = new THREE.Color(isDark ? 0x1e1c19 : 0x1e1c19);
    }
  });

  // 2. Lenis Smooth Scroll
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: !isReducedMotion
  });

  function lenisRaf(time) {
    lenis.raf(time);
    requestAnimationFrame(lenisRaf);
  }
  requestAnimationFrame(lenisRaf);

  // 3. Loading Manager
  const loadingManager = new THREE.LoadingManager();
  const loadingScreenUI = new LoadingScreen(loadingManager);

  // Fallback: always hide loading screen after 4s max
  const loadingFallback = setTimeout(() => {
    loadingScreenUI.hide();
  }, 4000);

  // 4. Three.js Init
  const canvas = document.getElementById('canvas');
  if (!canvas) {
    console.error('[Rossa] Canvas element not found!');
    return;
  }

  const sceneManager = new SceneManager(canvas);
  new LightingSetup(sceneManager.scene, sceneManager.renderer);
  const cameraRig = new CameraRig(sceneManager.camera, canvas);

  // 5. Load Kitchen
  const loader = new KitchenLoader(sceneManager.scene, loadingManager);
  const registry = await loader.loadModel('/models/kitchen.glb');

  // Always signal load complete so the loading screen hides
  clearTimeout(loadingFallback);
  if (typeof loadingManager.onLoad === 'function') {
    loadingManager.onLoad();
  }

  // 6. Connect Interactivity
  const drawerCtrl = new DrawerController(sceneManager.camera, canvas, registry);
  const colorConf = new ColorConfigurator(registry);
  const hoverHi = new HoverHighlight(sceneManager.camera, canvas, registry);

  // Apply initial color selection so scene looks correct on load
  colorConf.changeFacadeColor('#dfd7c8');

  // 7. Initialize UI
  new ColorPanel(colorConf);
  new NavigationDots(cameraRig);
  new PriceDisplay();

  // 8. Start Render loop
  let idleTimeout;
  sceneManager.onUpdate(() => {
    cameraRig.update();
  });
  sceneManager.startRenderLoop();

  // 9. Auto-rotate on Idle (8 seconds)
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

  // 10. ScrollTrigger: Shrink canvas to a floating window
  if (!isReducedMotion) {
    ScrollTrigger.create({
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      animation: gsap.to('#canvas-wrapper', {
        scale: 0.9,
        borderRadius: '24px',
        y: '5%',
        ease: 'none'
      })
    });

    ScrollTrigger.create({
      trigger: '#hero',
      start: '10% top',
      end: '50% top',
      scrub: true,
      animation: gsap.to('.ui-layer, .hero-content', { opacity: 0, ease: 'none' })
    });

    document.querySelectorAll('.gsap-reveal-up').forEach(el => {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none reverse'
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        delay: parseFloat(el.dataset.delay) || 0,
        ease: 'power2.out'
      });
    });
  }

  // 11. Pause RAF when tab hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      sceneManager.stopRenderLoop();
    } else {
      sceneManager.startRenderLoop();
    }
  });

  console.info('[Rossa] App bootstrapped successfully.');
}

bootstrap().catch(err => {
  console.error('[Rossa] Bootstrap failed:', err);
  // Even on fatal error, remove loading screen
  const ls = document.getElementById('loading-screen');
  if (ls) ls.style.display = 'none';
});
