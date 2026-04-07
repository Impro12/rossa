import { gsap } from 'gsap';
import pricingData from '../config/pricing.json';

/**
 * PriceDisplay
 * Auto-calculates total price on config updates and tweens the number.
 */

class PriceDisplay {
  constructor() {
    this.el = document.getElementById('price-value');
    this.currentPrice = pricingData.basePrice;
    
    // Config state
    this.selections = {
      facade: 'f_arctic',
      countertop: 'marble',
      handle: 'chrome'
    };

    // Format utility
    this.formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });

    this._updateDisplay(this.currentPrice);

    // Listen for configurator events
    window.addEventListener('config:updated', (e) => this._onConfigChange(e));
  }

  _onConfigChange(e) {
    const { type, value } = e.detail;
    this.selections[type] = value;

    this._recalculate();
  }

  _recalculate() {
    let newPrice = pricingData.basePrice;

    // Add modifiers safely
    if (pricingData.modifiers.facade[this.selections.facade]) {
      newPrice += pricingData.modifiers.facade[this.selections.facade];
    }
    if (pricingData.modifiers.countertop[this.selections.countertop]) {
      newPrice += pricingData.modifiers.countertop[this.selections.countertop];
    }
    if (pricingData.modifiers.handle[this.selections.handle]) {
      newPrice += pricingData.modifiers.handle[this.selections.handle];
    }

    if (newPrice !== this.currentPrice) {
      // Tween the number
      const fakeObj = { val: this.currentPrice };
      
      gsap.to(fakeObj, {
        val: newPrice,
        duration: 0.8,
        ease: "power2.out",
        onUpdate: () => {
          this._updateDisplay(Math.round(fakeObj.val));
        }
      });

      this.currentPrice = newPrice;
    }
  }

  _updateDisplay(val) {
    if (this.el) {
      this.el.textContent = this.formatter.format(val);
    }
  }
}

export default PriceDisplay;
