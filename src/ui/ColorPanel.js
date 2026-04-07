import colorsData from '../config/colors.json';
import materialsData from '../config/materials.json';
import hardwareData from '../config/hardware.json';

/**
 * ColorPanel
 * Renders the UI side-panel with swatches for Facade, Countertop, and Hardware.
 * Dispatches updates to the ColorConfigurator.
 */

class ColorPanel {
  constructor(configurator) {
    this.configurator = configurator;
    this.container = document.getElementById('config-panel');
    
    // State tracking to update active classes
    this.state = {
      facade: colorsData[0].id,
      countertop: materialsData[0].id,
      handle: hardwareData[0].id
    };

    this._buildUI();
  }

  _buildUI() {
    this.container.innerHTML = `
      <div class="panel-section">
        <h3>Facade Finish</h3>
        <div class="swatch-grid" id="grid-facade">
          ${colorsData.map(c => `
            <button class="swatch-btn ${c.id === this.state.facade ? 'active' : ''}" 
                    data-type="facade" data-id="${c.id}" data-value="${c.hex}"
                    style="--swatch-color: ${c.hex}">
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

    // Attach delegated events
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      const type = btn.dataset.type;
      const id = btn.dataset.id;

      // Update active styling
      const grid = document.getElementById(`grid-${type}`);
      grid.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update state and dispatch
      this.state[type] = id;
      
      if (type === 'facade') {
        const hex = btn.dataset.value;
        this.configurator.changeFacadeColor(hex);
      } else if (type === 'countertop') {
        this.configurator.changeCountertopMaterial(id);
      } else if (type === 'handle') {
        this.configurator.changeHandleFinish(id);
      }
    });
  }
}

export default ColorPanel;
