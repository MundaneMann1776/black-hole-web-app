import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'stats.js';
import GUI from 'lil-gui';
import { Observer } from './Observer.js';
import { Shader } from './Shader.js';
import raytracerFragment from './shaders/raytracer.glsl';
import './style.css';

// Global variables
let container, stats;
let camera, scene, renderer, cameraControls;
let shader = null;
let observer = new Observer();
let textures = {};
let lastCameraMat = new THREE.Matrix4().identity();

// Helper functions
function degToRad(a) { return Math.PI * a / 180.0; }

function init(loadedTextures) {
    textures = loadedTextures;

    container = document.createElement('div');
    document.body.appendChild(container);

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

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild(stats.domElement);

    // Camera setup
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 80000);
    initializeCamera(camera);

    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);
    cameraControls.addEventListener('change', () => updateCamera(updateUniforms));
    updateCamera(updateUniforms);

    onWindowResize(updateUniforms);
    window.addEventListener('resize', () => onWindowResize(updateUniforms), false);

    setupGUI(updateUniforms);

    // Start animation loop
    animate(updateUniforms);
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

function setupGUI(updateUniformsCallback) {
    const gui = new GUI();
    const p = shader.parameters;

    const updateShader = () => {
        scene.updateShader();
    };

    gui.add(p, 'quality', ['fast', 'medium', 'high']).onChange(value => {
        switch (value) {
            case 'fast':
                p.n_steps = 40;
                break;
            case 'medium':
                p.n_steps = 100;
                break;
            case 'high':
                p.n_steps = 200;
                break;
        }
        updateShader();
    });

    gui.add(p, 'accretion_disk').onChange(updateShader);

    const observerFolder = gui.addFolder('Observer');
    observerFolder.add(p.observer, 'motion').onChange(motion => {
        updateCamera(updateUniformsCallback);
        updateShader();
    });
    observerFolder.add(p.observer, 'distance').min(1.5).max(30).onChange(() => updateCamera(updateUniformsCallback));

    const planetFolder = gui.addFolder('Planet');
    planetFolder.add(p.planet, 'enabled').onChange(updateShader);
    planetFolder.add(p.planet, 'distance').min(1.5).onChange(updateUniformsCallback);
    planetFolder.add(p.planet, 'radius').min(0.01).max(2.0).onChange(updateUniformsCallback);

    const relativisticsFolder = gui.addFolder('Relativistic effects');
    relativisticsFolder.add(p, 'aberration').onChange(updateShader);
    relativisticsFolder.add(p, 'beaming').onChange(updateShader);
    relativisticsFolder.add(p, 'doppler_shift').onChange(updateShader);
    relativisticsFolder.add(p, 'gravitational_time_dilation').onChange(updateShader);
    relativisticsFolder.add(p, 'lorentz_contraction').onChange(updateShader);

    const timeFolder = gui.addFolder('Time');
    timeFolder.add(p, 'light_travel_time').onChange(updateShader);
    timeFolder.add(p, 'time_scale').min(0);
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

function animate(updateUniformsCallback) {
    requestAnimationFrame(() => animate(updateUniformsCallback));

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
    stats.update();
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
        loadTexture('galaxy', '/public/img/milkyway.jpg', THREE.NearestFilter),
        loadTexture('spectra', '/public/img/spectra.png', THREE.LinearFilter),
        loadTexture('moon', '/public/img/beach-ball.png', THREE.LinearFilter),
        loadTexture('stars', '/public/img/stars.png', THREE.LinearFilter),
        loadTexture('accretion_disk', '/public/img/accretion-disk.png', THREE.LinearFilter)
    ]).then(results => {
        const loadedTextures = {};
        results.forEach(res => loadedTextures[res.name] = res.tex);

        // Hide loader if it exists (we removed it from HTML but might add it back later)
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';

        init(loadedTextures);
    });
})();
