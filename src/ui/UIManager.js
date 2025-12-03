import './ui.css';

export class UIManager {
    constructor(parameters, callbacks) {
        this.parameters = parameters;
        this.callbacks = callbacks;
        this.dom = {};

        this.init();
    }

    init() {
        this.createDOM();
        this.bindEvents();
    }

    createDOM() {
        const container = document.createElement('div');
        container.id = 'ui-container';

        container.innerHTML = `
            <div id="loader-overlay">
                <div class="loader-spinner"></div>
                <div style="font-size: 1.2rem; letter-spacing: 2px;">INITIALIZING SINGULARITY</div>
            </div>

            <div class="top-bar">
                <div class="title">Black Hole Sim</div>
                <div class="fps-counter" id="fps-counter">FPS: 60</div>
            </div>

            <div class="side-panel" id="side-panel">
                <div class="panel-header">
                    <h3>Simulation Settings</h3>
                    <button class="close-btn" id="close-settings">&times;</button>
                </div>
                
                <div class="control-group">
                    <h3>Presets</h3>
                    <div class="control-item" style="justify-content: flex-start; gap: 10px; flex-wrap: wrap;">
                        <button class="btn" data-preset="default" style="font-size: 0.7rem; padding: 5px 10px;">Default</button>
                        <button class="btn" data-preset="gargantua" style="font-size: 0.7rem; padding: 5px 10px;">Gargantua</button>
                        <button class="btn" data-preset="micro" style="font-size: 0.7rem; padding: 5px 10px;">Micro</button>
                    </div>
                </div>

                <div class="control-group">
                    <h3>Background</h3>
                    <div class="control-item">
                        <select id="bg-select" style="background: rgba(0,0,0,0.5); color: white; border: 1px solid white; padding: 5px; width: 100%;">
                            <option value="galaxy">Milky Way</option>
                            <option value="nebula">Nebula</option>
                            <option value="deep_field">Deep Field</option>
                        </select>
                    </div>
                </div>

                <div class="control-group">
                    <h3>Quality</h3>
                    <div class="control-item">
                        <label>Steps</label>
                        <select id="quality-select" style="background: rgba(0,0,0,0.5); color: white; border: 1px solid white; padding: 5px;">
                            <option value="fast">Fast (40)</option>
                            <option value="medium" selected>Medium (100)</option>
                            <option value="high">High (200)</option>
                        </select>
                    </div>
                </div>

                <div class="control-group">
                    <h3>Observer</h3>
                    <div class="control-item">
                        <label>Distance</label>
                        <input type="range" id="obs-distance" min="1.5" max="30" step="0.1" value="${this.parameters.observer.distance}">
                    </div>
                    <div class="control-item">
                        <label>Motion</label>
                        <input type="checkbox" id="obs-motion" ${this.parameters.observer.motion ? 'checked' : ''}>
                    </div>
                </div>

                <div class="control-group">
                    <h3>Physics</h3>
                    <div class="control-item">
                        <label>Doppler</label>
                        <input type="checkbox" id="phys-doppler" ${this.parameters.doppler_shift ? 'checked' : ''}>
                    </div>
                    <div class="control-item">
                        <label>Beaming</label>
                        <input type="checkbox" id="phys-beaming" ${this.parameters.beaming ? 'checked' : ''}>
                    </div>
                    <div class="control-item">
                        <label>Grav. Dilation</label>
                        <input type="checkbox" id="phys-dilation" ${this.parameters.gravitational_time_dilation ? 'checked' : ''}>
                    </div>
                </div>
            </div>

            <div class="bottom-bar">
                <button class="btn" id="toggle-settings">Settings</button>
                <button class="btn primary" id="toggle-pause">Pause</button>
            </div>
        `;

        document.body.appendChild(container);

        // Cache DOM elements
        this.dom.loader = document.getElementById('loader-overlay');
        this.dom.fps = document.getElementById('fps-counter');
        this.dom.sidePanel = document.getElementById('side-panel');
        this.dom.qualitySelect = document.getElementById('quality-select');
        this.dom.obsDistance = document.getElementById('obs-distance');
        this.dom.obsMotion = document.getElementById('obs-motion');
        this.dom.physDoppler = document.getElementById('phys-doppler');
        this.dom.physBeaming = document.getElementById('phys-beaming');
        this.dom.physDilation = document.getElementById('phys-dilation');
    }

    bindEvents() {
        // Toggle Settings Panel
        document.getElementById('toggle-settings').addEventListener('click', () => {
            this.dom.sidePanel.classList.add('active');
        });
        document.getElementById('close-settings').addEventListener('click', () => {
            this.dom.sidePanel.classList.remove('active');
        });

        // Presets
        const presetBtns = this.dom.sidePanel.querySelectorAll('button[data-preset]');
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.callbacks.onPresetChange(btn.dataset.preset);
            });
        });

        // Background
        this.dom.bgSelect = document.getElementById('bg-select');
        this.dom.bgSelect.addEventListener('change', (e) => {
            this.callbacks.onBackgroundChange(e.target.value);
        });

        // Quality
        this.dom.qualitySelect.addEventListener('change', (e) => {
            const val = e.target.value;
            let steps = 100;
            if (val === 'fast') steps = 40;
            if (val === 'high') steps = 200;

            this.parameters.quality = val;
            this.parameters.n_steps = steps;
            this.callbacks.onShaderUpdate();
        });

        // Observer Distance
        this.dom.obsDistance.addEventListener('input', (e) => {
            this.parameters.observer.distance = parseFloat(e.target.value);
            this.callbacks.onUniformsUpdate();
        });

        // Observer Motion
        this.dom.obsMotion.addEventListener('change', (e) => {
            this.parameters.observer.motion = e.target.checked;
            this.callbacks.onCameraUpdate();
            this.callbacks.onShaderUpdate();
        });

        // Physics Toggles
        const bindToggle = (el, param) => {
            el.addEventListener('change', (e) => {
                this.parameters[param] = e.target.checked;
                this.callbacks.onShaderUpdate();
            });
        };

        bindToggle(this.dom.physDoppler, 'doppler_shift');
        bindToggle(this.dom.physBeaming, 'beaming');
        bindToggle(this.dom.physDilation, 'gravitational_time_dilation');

        // Pause (Time Scale)
        const pauseBtn = document.getElementById('toggle-pause');
        let isPaused = false;
        let lastTimeScale = 1.0;

        pauseBtn.addEventListener('click', () => {
            isPaused = !isPaused;
            if (isPaused) {
                lastTimeScale = this.parameters.time_scale;
                this.parameters.time_scale = 0;
                pauseBtn.textContent = "Resume";
            } else {
                this.parameters.time_scale = lastTimeScale || 1.0;
                pauseBtn.textContent = "Pause";
            }
        });
    }

    hideLoader() {
        this.dom.loader.style.opacity = '0';
        setTimeout(() => {
            this.dom.loader.style.display = 'none';
        }, 500);
    }

    updateFPS(fps) {
        this.dom.fps.textContent = `FPS: ${Math.round(fps)}`;
    }

    updateUI() {
        // Sync UI elements with current parameters
        this.dom.qualitySelect.value = this.parameters.quality;
        this.dom.obsDistance.value = this.parameters.observer.distance;
        this.dom.obsMotion.checked = this.parameters.observer.motion;
        this.dom.physDoppler.checked = this.parameters.doppler_shift;
        this.dom.physBeaming.checked = this.parameters.beaming;
        this.dom.physDilation.checked = this.parameters.gravitational_time_dilation;
    }
}
