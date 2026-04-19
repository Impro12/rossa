import colorsData from '../config/colors.json';
import materialsData from '../config/materials.json';
import hardwareData from '../config/hardware.json';

/**
 * ColorPanel
 * Renders swatches for Facade, Countertop, and Hardware.
 * Passes both hex AND id to ColorConfigurator so price lookups work.
 */

class ColorPanel {
  constructor(configurator) {
    this.configurator = configurator;
    this.container = document.getElementById('config-panel');
    if (!this.container) return;

    this.state = {
      facade: colorsData[0].id,
      countertop: materialsData[0].id,
      handle: hardwareData[0].id
    };

    this._buildUI();
    // Apply defaults so scene and price are in sync on load
    this.configurator.changeFacadeColor(colorsData[0].hex, colorsData[0].id);
    this.configurator.changeCountertopMaterial(materialsData[0].id);
    this.configurator.changeHandleFinish(hardwareData[0].id);
  }

  _buildUI() {
    this.container.innerHTML = `
      <div class="panel-section">
        <h3>Facade Finish</h3>
        <div class="swatch-grid" id="grid-facade">
          ${colorsData.map(c => `
            <button class="swatch-btn ${c.id === this.state.facade ? 'active' : ''}"
                    data-type="facade" data-id="${c.id}" data-hex="${c.hex}"
                    style="--swatch-color:${c.hex}"
                    title="${c.name}">
              <span class="sr-only">${c.name}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="panel-section">
        <h3>Countertop Surface</h3>
        <div class="text-grid" id="grid-countertop">
          ${materialsData.map(m => `
            <button class="text-btn ${m.id === this.state.countertop ? 'active' : ''}"
                    data-type="countertop" data-id="${m.id}">
              ${m.name}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="panel-section">
        <h3>Hardware Detail</h3>
        <div class="text-grid" id="grid-handle">
          ${hardwareData.map(h => `
            <button class="text-btn ${h.id === this.state.handle ? 'active' : ''}"
                    data-type="handle" data-id="${h.id}">
              ${h.name}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-type]');
      if (!btn) return;

      const type = btn.dataset.type;
      const id   = btn.dataset.id;

      // Update active styling
      const grid = this.container.querySelector(`#grid-${type}`);
      grid?.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.state[type] = id;

      if (type === 'facade') {
        this.configurator.changeFacadeColor(btn.dataset.hex, id);
      } else if (type === 'countertop') {
        this.configurator.changeCountertopMaterial(id);
      } else if (type === 'handle') {
        this.configurator.changeHandleFinish(id);
      }
    });
  }
}

export default ColorPanel;
