import { gsap } from 'gsap';

/**
 * LoadingScreen
 * Tied to Three.js LoadingManager to reveal the site smoothly.
 */

class LoadingScreen {
  constructor(loadingManager) {
    this.el = document.getElementById('loading-screen');
    this.bar = document.getElementById('loading-bar');
    
    // Three.js loading manager hooks
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const progress = itemsLoaded / itemsTotal;
      if (this.bar) {
        gsap.to(this.bar, { width: `${progress * 100}%`, duration: 0.3, ease: 'power1.out' });
      }
    };

    loadingManager.onLoad = () => {
      // Small artificially forced delay to ensure shaders compile
      setTimeout(() => {
        this.hide();
      }, 500);
    };
  }

  hide() {
    if (!this.el) return;
    
    const tl = gsap.timeline();
    tl.to(this.bar, { opacity: 0, duration: 0.3 })
      .to(this.el, { opacity: 0, duration: 0.8, ease: "power2.inOut" }, "+=0.2")
      .set(this.el, { display: 'none' });
  }
}

export default LoadingScreen;
