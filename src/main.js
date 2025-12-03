import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { UIManager } from './ui/UIManager.js';
import { Observer } from './Observer.js';
import { Shader } from './Shader.js';
import raytracerFragment from './shaders/raytracer.glsl';
import './style.css';

// Global variables
let container;
let camera, scene, renderer, cameraControls;
let shader = null;
let observer = new Observer();
let textures = {};
let lastCameraMat = new THREE.Matrix4().identity();

// Helper functions
function degToRad(a) { return Math.PI * a / 180.0; }

function init(loadedTextures) {
    textures = loadedTextures;

    container = document.getElementById('canvas-container');

    scene = new THREE.Scene();

    // PlaneBufferGeometry is now PlaneGeometry in newer Three.js
    const geometry = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2() },
        cam_pos: { value: new THREE.Vector3() },
        cam_x: { value: new THREE.Vector3() },
        cam_y: { value: new THREE.Vector3() },
        cam_z: { value: new THREE.Vector3() },
        cam_vel: { value: new THREE.Vector3() },

        planet_distance: { value: 7.0 },
        planet_radius: { value: 0.4 },

        star_texture: { value: textures.stars },
        accretion_disk_texture: { value: textures.accretion_disk },
        galaxy_texture: { value: textures.galaxy },
        planet_texture: { value: textures.moon },
        spectrum_texture: { value: textures.spectra }
    };

    const updateUniforms = function () {
        uniforms.planet_distance.value = shader.parameters.planet.distance;
        uniforms.planet_radius.value = shader.parameters.planet.radius;

        uniforms.resolution.value.x = renderer.domElement.width;
        uniforms.resolution.value.y = renderer.domElement.height;

        uniforms.time.value = observer.time;
        uniforms.cam_pos.value = observer.position;

        const e = observer.orientation.elements;

        uniforms.cam_x.value.set(e[0], e[1], e[2]);
        uniforms.cam_y.value.set(e[3], e[4], e[5]);
        uniforms.cam_z.value.set(e[6], e[7], e[8]);

        function setVec(target, value) {
            uniforms[target].value.set(value.x, value.y, value.z);
        }

        setVec('cam_pos', observer.position);
        setVec('cam_vel', observer.velocity);
    };

    // Vertex shader
    const vertexShader = `
        void main() {
            gl_Position = vec4( position, 1.0 );
        }
    `;

    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: shader.compile() // Initial compile
    });

    scene.updateShader = function () {
        material.fragmentShader = shader.compile();
        material.needsUpdate = true;
        shader.needsUpdate = true;
    };

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Camera setup
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 80000);
    initializeCamera(camera);

    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);
    cameraControls.addEventListener('change', () => updateCamera(updateUniforms));
    updateCamera(updateUniforms);

    onWindowResize(updateUniforms);
    window.addEventListener('resize', () => onWindowResize(updateUniforms), false);

    // Presets definition
    const presets = {
        default: {
            planet: { enabled: true, distance: 7.0, radius: 0.4 },
            observer: { distance: 11.0, motion: true, orbital_inclination: -10 },
            accretion_disk: true,
            time_scale: 1.0
        },
        gargantua: {
            // Interstellar: Huge, thin disk, edge-on
            planet: { enabled: false, distance: 7.0, radius: 1.2 },
            observer: { distance: 18.0, motion: true, orbital_inclination: 0 },
            accretion_disk: true,
            time_scale: 0.2
        },
        sagra: {
            // Sagittarius A*: Moderate size, chaotic
            planet: { enabled: true, distance: 5.0, radius: 0.4 },
            observer: { distance: 10.0, motion: true, orbital_inclination: 45 },
            accretion_disk: true,
            time_scale: 1.0
        },
        m87: {
            // M87*: Massive, viewed off-axis (the donut)
            planet: { enabled: false, distance: 7.0, radius: 1.5 },
            observer: { distance: 20.0, motion: true, orbital_inclination: 17 }, // 17 degrees is approx jet angle
            accretion_disk: true,
            time_scale: 0.1
        },
        ton618: {
            // TON 618: Ultramassive, largest known
            planet: { enabled: false, distance: 7.0, radius: 1.95 }, // Max radius
            observer: { distance: 30.0, motion: true, orbital_inclination: 10 },
            accretion_disk: true,
            time_scale: 0.05 // Very slow relative time
        },
        cygnus: {
            // Cygnus X-1: Stellar mass, fast, aggressive
            planet: { enabled: true, distance: 2.5, radius: 0.1 },
            observer: { distance: 5.0, motion: true, orbital_inclination: -30 },
            accretion_disk: true,
            time_scale: 3.0
        }
    };

    // Initialize UI
    const ui = new UIManager(shader.parameters, {
        onShaderUpdate: () => scene.updateShader(),
        onUniformsUpdate: updateUniforms,
        onCameraUpdate: () => updateCamera(updateUniforms),
        onBackgroundChange: (bgName) => {
            if (textures[bgName]) {
                uniforms.galaxy_texture.value = textures[bgName];
            }
        },
        onPresetChange: (presetName) => {
            const preset = presets[presetName];
            if (preset) {
                // Apply preset to shader parameters
                Object.assign(shader.parameters.planet, preset.planet);
                Object.assign(shader.parameters.observer, preset.observer);
                shader.parameters.accretion_disk = preset.accretion_disk;
                shader.parameters.time_scale = preset.time_scale;

                // Update UI elements (manual sync needed or UI needs to listen to params)
                // For now, we just update the simulation
                ui.updateUI();
                updateCamera(updateUniforms);
                scene.updateShader();
                updateUniforms();
            }
        }
    });

    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
        const p = shader.parameters;
        const step = 0.5;

        switch (e.key.toLowerCase()) {
            case 'w':
                p.observer.distance = Math.max(1.5, p.observer.distance - step);
                updateCamera(updateUniforms);
                ui.updateUI();
                break;
            case 's':
                p.observer.distance = Math.min(30.0, p.observer.distance + step);
                updateCamera(updateUniforms);
                ui.updateUI();
                break;
            case 'a':
                p.observer.orbital_inclination -= 2;
                updateCamera(updateUniforms);
                break;
            case 'd':
                p.observer.orbital_inclination += 2;
                updateCamera(updateUniforms);
                break;
            case ' ':
                p.observer.motion = !p.observer.motion;
                updateCamera(updateUniforms);
                scene.updateShader();
                ui.updateUI();
                break;
        }
    });

    // Start animation loop
    animate(updateUniforms, ui);

    // Hide loader when ready
    ui.hideLoader();
}

function initializeCamera(camera) {
    const pitchAngle = 3.0, yawAngle = 0.0;
    camera.matrixWorldInverse.makeRotationX(degToRad(-pitchAngle));
    camera.matrixWorldInverse.multiply(new THREE.Matrix4().makeRotationY(degToRad(-yawAngle)));

    const m = camera.matrixWorldInverse.elements;
    camera.position.set(m[2], m[6], m[10]);
}

function updateCamera(updateUniformsCallback) {
    const m = camera.matrixWorldInverse.elements;
    let camera_matrix;

    if (shader.parameters.observer.motion) {
        camera_matrix = new THREE.Matrix3();
    } else {
        camera_matrix = observer.orientation;
    }

    camera_matrix.set(
        m[0], m[1], m[2],
        m[8], m[9], m[10],
        m[4], m[5], m[6]
    );

    if (shader.parameters.observer.motion) {
        observer.orientation = observer.orbitalFrame().multiply(camera_matrix);
    } else {
        const p = new THREE.Vector3(
            camera_matrix.elements[6],
            camera_matrix.elements[7],
            camera_matrix.elements[8]);

        const dist = shader.parameters.observer.distance;
        observer.position.set(-p.x * dist, -p.y * dist, -p.z * dist);
        observer.velocity.set(0, 0, 0);
    }

    if (updateUniformsCallback) updateUniformsCallback();
}

function onWindowResize(updateUniformsCallback) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (updateUniformsCallback) updateUniformsCallback();
}

function frobeniusDistance(matrix1, matrix2) {
    let sum = 0.0;
    for (let i = 0; i < 16; i++) { // Matrix4 has 16 elements
        const diff = matrix1.elements[i] - matrix2.elements[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

const getFrameDuration = (function () {
    let lastTimestamp = new Date().getTime();
    return function () {
        const timestamp = new Date().getTime();
        const diff = (timestamp - lastTimestamp) / 1000.0;
        lastTimestamp = timestamp;
        return diff;
    };
})();

// FPS calculation helper
let frameCount = 0;
let lastTime = performance.now();
let fps = 60;

function animate(updateUniformsCallback, ui) {
    requestAnimationFrame(() => animate(updateUniformsCallback, ui));

    // FPS Counter
    frameCount++;
    const time = performance.now();
    if (time >= lastTime + 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = time;
        if (ui) ui.updateFPS(fps);
    }

    camera.updateMatrixWorld();
    // getInverse is deprecated in favor of copy(m).invert()
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

    if (shader.needsUpdate || shader.hasMovingParts() ||
        frobeniusDistance(camera.matrixWorldInverse, lastCameraMat) > 1e-10) {

        shader.needsUpdate = false;

        // Render logic
        observer.move(getFrameDuration(), shader.parameters);
        if (shader.parameters.observer.motion) updateCamera(updateUniformsCallback);
        updateUniformsCallback();
        renderer.render(scene, camera);

        lastCameraMat.copy(camera.matrixWorldInverse);
    }
}

// Bootstrapping
(function () {
    const texLoader = new THREE.TextureLoader();
    const loadTexture = (name, path, interpolation) => {
        return new Promise(resolve => {
            texLoader.load(path, tex => {
                tex.magFilter = interpolation;
                tex.minFilter = interpolation;
                resolve({ name, tex });
            });
        });
    };

    shader = new Shader(raytracerFragment);

    Promise.all([
        loadTexture('galaxy', 'img/milkyway.jpg', THREE.NearestFilter),
        loadTexture('nebula', 'img/nebula.png', THREE.LinearFilter),
        loadTexture('deep_field', 'img/deep_field.png', THREE.LinearFilter),
        loadTexture('spectra', 'img/spectra.png', THREE.LinearFilter),
        loadTexture('moon', 'img/beach-ball.png', THREE.LinearFilter),
        loadTexture('stars', 'img/stars.png', THREE.LinearFilter),
        loadTexture('accretion_disk', 'img/accretion-disk.png', THREE.LinearFilter)
    ]).then(results => {
        const loadedTextures = {};
        results.forEach(res => loadedTextures[res.name] = res.tex);

        // Hide loader if it exists (we removed it from HTML but might add it back later)
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';

        init(loadedTextures);
    });
})();
