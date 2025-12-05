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

        // Accretion disk sizing
        accretion_inner_radius: { value: 1.5 },
        accretion_width: { value: 5.0 },

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

    // Presets definition - disk sizing makes each black hole visually distinct
    const presets = {
        default: {
            planet: { enabled: true, distance: 7.0, radius: 0.4 },
            observer: { distance: 11.0, motion: true, orbital_inclination: -10 },
            accretion_disk: true,
            disk_inner_radius: 1.5,
            disk_width: 5.0,
            time_scale: 1.0
        },
        gargantua: {
            // Interstellar: Huge black hole, wide thin disk
            planet: { enabled: false, distance: 7.0, radius: 1.2 },
            observer: { distance: 15.0, motion: true, orbital_inclination: 5 },
            accretion_disk: true,
            disk_inner_radius: 1.5,
            disk_width: 8.0,  // Wide disk for Interstellar look
            time_scale: 0.2
        },
        sagra: {
            // Sagittarius A*: Moderate size, chaotic
            planet: { enabled: true, distance: 5.0, radius: 0.4 },
            observer: { distance: 10.0, motion: true, orbital_inclination: 45 },
            accretion_disk: true,
            disk_inner_radius: 1.5,
            disk_width: 4.0,
            time_scale: 1.0
        },
        m87: {
            // M87*: Massive supergiant black hole with thick disk
            planet: { enabled: false, distance: 7.0, radius: 1.5 },
            observer: { distance: 12.0, motion: true, orbital_inclination: 17 },
            accretion_disk: true,
            disk_inner_radius: 1.5,
            disk_width: 6.0,
            time_scale: 0.1
        },
        ton618: {
            // TON 618: Ultramassive quasar - most massive known
            planet: { enabled: false, distance: 7.0, radius: 1.95 },
            observer: { distance: 8.0, motion: true, orbital_inclination: 10 },  // Closer to see the massive black hole
            accretion_disk: true,
            disk_inner_radius: 1.5,
            disk_width: 4.0,  // Proportional disk
            time_scale: 0.05
        },
        cygnus: {
            // Cygnus X-1: Stellar mass, smaller compact disk
            planet: { enabled: true, distance: 2.5, radius: 0.1 },
            observer: { distance: 6.0, motion: true, orbital_inclination: -30 },
            accretion_disk: true,
            disk_inner_radius: 1.5,
            disk_width: 3.0,  // Smaller disk for stellar-mass black hole
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

                // Apply accretion disk sizing uniforms
                uniforms.accretion_inner_radius.value = preset.disk_inner_radius;
                uniforms.accretion_width.value = preset.disk_width;

                // Use single consistent texture for now (custom textures had issues)
                uniforms.accretion_disk_texture.value = textures.accretion_disk;

                // Update UI elements (manual sync needed or UI needs to listen to params)
                // For now, we just update the simulation
                ui.updateUI();
                updateCamera(updateUniforms);
                scene.updateShader();
                updateUniforms();
            }
        }
    });

    // ===== FREE CAMERA MOVEMENT SYSTEM =====
    // Track which keys are currently pressed for smooth movement
    const keysPressed = {};
    const moveSpeed = 0.15;  // Movement speed in world units
    let freeMovementMode = true;  // Start in free movement mode

    // Disable orbital motion for free camera
    shader.parameters.observer.motion = false;

    // Keyboard Controls - WASD for FREE movement in 3D space
    window.addEventListener('keydown', (e) => {
        keysPressed[e.key.toLowerCase()] = true;

        // Space bar to toggle between free movement and orbital mode
        if (e.key === ' ') {
            freeMovementMode = !freeMovementMode;
            shader.parameters.observer.motion = !freeMovementMode;
            updateCamera(updateUniforms);
            scene.updateShader();
            ui.updateUI();
            console.log(freeMovementMode ? 'Free camera mode' : 'Orbital mode');
            e.preventDefault();
        }
    });

    window.addEventListener('keyup', (e) => {
        keysPressed[e.key.toLowerCase()] = false;
    });

    // Process held keys each frame for smooth FREE movement
    function processKeys() {
        if (!freeMovementMode) {
            // In orbital mode, use the old distance-based movement
            const p = shader.parameters;
            let changed = false;
            if (keysPressed['w']) { p.observer.distance = Math.max(2.0, p.observer.distance - moveSpeed); changed = true; }
            if (keysPressed['s']) { p.observer.distance = Math.min(50.0, p.observer.distance + moveSpeed); changed = true; }
            if (keysPressed['a']) { p.observer.orbital_inclination -= 2; changed = true; }
            if (keysPressed['d']) { p.observer.orbital_inclination += 2; changed = true; }
            if (changed) { updateCamera(updateUniforms); ui.updateUI(); }
            return;
        }

        // FREE CAMERA MODE - move observer directly in 3D space
        let changed = false;

        // Get camera's forward, right, and up vectors from orientation
        const e = observer.orientation.elements;
        const camX = new THREE.Vector3(e[0], e[1], e[2]);  // Right
        const camY = new THREE.Vector3(e[3], e[4], e[5]);  // Up  
        const camZ = new THREE.Vector3(e[6], e[7], e[8]);  // Forward (look direction)

        // W/S - Move forward/backward in the look direction
        if (keysPressed['w']) {
            observer.position.addScaledVector(camZ, -moveSpeed);
            changed = true;
        }
        if (keysPressed['s']) {
            observer.position.addScaledVector(camZ, moveSpeed);
            changed = true;
        }

        // A/D - Strafe left/right
        if (keysPressed['a']) {
            observer.position.addScaledVector(camX, -moveSpeed);
            changed = true;
        }
        if (keysPressed['d']) {
            observer.position.addScaledVector(camX, moveSpeed);
            changed = true;
        }

        // Q/E - Move up/down
        if (keysPressed['q']) {
            observer.position.addScaledVector(camY, -moveSpeed);
            changed = true;
        }
        if (keysPressed['e']) {
            observer.position.addScaledVector(camY, moveSpeed);
            changed = true;
        }

        // Arrow keys for faster movement
        if (keysPressed['arrowup']) {
            observer.position.addScaledVector(camZ, -moveSpeed * 2);
            changed = true;
        }
        if (keysPressed['arrowdown']) {
            observer.position.addScaledVector(camZ, moveSpeed * 2);
            changed = true;
        }
        if (keysPressed['arrowleft']) {
            observer.position.addScaledVector(camX, -moveSpeed * 2);
            changed = true;
        }
        if (keysPressed['arrowright']) {
            observer.position.addScaledVector(camX, moveSpeed * 2);
            changed = true;
        }

        // Prevent getting too close to the black hole (event horizon is at r=1)
        const minDistance = 1.5;
        if (observer.position.length() < minDistance) {
            observer.position.normalize().multiplyScalar(minDistance);
        }

        if (changed) {
            // Update velocity to point towards black hole (for visual effects)
            observer.velocity.copy(observer.position).normalize().negate().multiplyScalar(0.1);
            updateUniforms();
            shader.needsUpdate = true;
        }
    }

    // Call processKeys every frame for smooth movement
    setInterval(processKeys, 16); // ~60fps key processing

    // Scroll wheel for zoom (move forward/backward)
    window.addEventListener('wheel', (e) => {
        if (!freeMovementMode) {
            const p = shader.parameters;
            const zoomSpeed = 0.5;
            if (e.deltaY > 0) { p.observer.distance = Math.min(50.0, p.observer.distance + zoomSpeed); }
            else { p.observer.distance = Math.max(2.0, p.observer.distance - zoomSpeed); }
            updateCamera(updateUniforms);
            ui.updateUI();
        } else {
            // In free mode, scroll moves forward/backward
            const e2 = observer.orientation.elements;
            const camZ = new THREE.Vector3(e2[6], e2[7], e2[8]);
            const zoomSpeed = 0.5;

            if (e.deltaY > 0) {
                observer.position.addScaledVector(camZ, zoomSpeed);
            } else {
                observer.position.addScaledVector(camZ, -zoomSpeed);
            }

            // Prevent getting too close
            if (observer.position.length() < 1.5) {
                observer.position.normalize().multiplyScalar(1.5);
            }

            updateUniforms();
            shader.needsUpdate = true;
        }
        e.preventDefault();
    }, { passive: false });

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
            }, undefined, (err) => {
                console.warn(`Failed to load texture: ${name}`, err);
                resolve({ name, tex: null });
            });
        });
    };

    shader = new Shader(raytracerFragment);

    Promise.all([
        loadTexture('galaxy', 'img/milkyway.jpg', THREE.NearestFilter),
        loadTexture('spectra', 'img/spectra.png', THREE.LinearFilter),
        loadTexture('moon', 'img/beach-ball.png', THREE.LinearFilter),
        loadTexture('stars', 'img/stars.png', THREE.LinearFilter),
        loadTexture('accretion_disk', 'img/accretion-disk.png', THREE.LinearFilter),
        // Preset-specific accretion disk textures
        loadTexture('disk_gargantua', 'img/disks/gargantua-disk.png', THREE.LinearFilter),
        loadTexture('disk_sagra', 'img/disks/sagra-disk.png', THREE.LinearFilter),
        loadTexture('disk_m87', 'img/disks/m87-disk.png', THREE.LinearFilter),
        loadTexture('disk_ton618', 'img/disks/ton618-disk.png', THREE.LinearFilter),
        loadTexture('disk_cygnus', 'img/disks/cygnus-disk.png', THREE.LinearFilter)
    ]).then(results => {
        const loadedTextures = {};
        results.forEach(res => loadedTextures[res.name] = res.tex);

        // Hide loader if it exists (we removed it from HTML but might add it back later)
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';

        init(loadedTextures);
    });
})();
