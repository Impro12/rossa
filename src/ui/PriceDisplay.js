import { gsap } from 'gsap';
import Store from '../core/Store.js';

/**
 * PriceDisplay — animates the price counter whenever Store.totalPrice changes.
 */

class PriceDisplay {
  constructor() {
    this.el = document.getElementById('price-value');
    this.currentPrice = Store.state.totalPrice;

    this.formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });

    this._render(this.currentPrice);

    Store.subscribe('totalPrice', (next) => this._animateTo(next));
  }

  _animateTo(target) {
    if (target === this.currentPrice) return;
    const proxy = { val: this.currentPrice };
    gsap.to(proxy, {
      val: target,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => this._render(Math.round(proxy.val)),
    });
    this.currentPrice = target;
  }

  _render(val) {
    if (this.el) this.el.textContent = this.formatter.format(val);
  }
}

export default PriceDisplay;
