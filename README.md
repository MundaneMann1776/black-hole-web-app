# Black Hole Simulation 🕳️

A real-time, ray-traced simulation of a Schwarzschild black hole, running entirely in your browser using WebGL and Three.js.

![Black Hole Simulation](public/img/accretion-disk.png)

## 🚀 Live Demo
**[Launch Simulation](https://MundaneMann1776.github.io/black-hole-web-app/)**

## ✨ Features

### 🌌 Physically Accurate Simulation
*   **Ray Tracing**: Computes light paths by integrating geodesics in the Schwarzschild metric.
*   **Relativistic Effects**: Gravitational lensing, Doppler shift, relativistic beaming, and gravitational time dilation.
*   **Accretion Disk**: Volumetric rendering of a swirling disk of matter.

### 🎮 Interactive Controls
*   **Famous Black Holes**: Instantly switch between presets like **Gargantua** (Interstellar), **Sagittarius A***, **M87***, **TON 618**, and **Cygnus X-1**.
*   **Background Switcher**: Choose from the Milky Way, a colorful Nebula, or the Hubble Deep Field.
*   **Full Control**: Adjust observer distance, orbital inclination, and simulation quality in real-time.
*   **Keyboard Navigation**:
    *   `W` / `S`: Move closer / further
    *   `A` / `D`: Change orbital inclination
    *   `Space`: Pause/Resume orbit

### 🛠️ Modern Tech Stack
*   **Vite**: Fast development and optimized production builds.
*   **Three.js**: Modern WebGL rendering engine.
*   **GLSL**: Custom shaders for high-performance physics calculations.
*   **Vanilla JS**: Lightweight, modular architecture without heavy framework overhead.

## 📦 Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/MundaneMann1776/black-hole-web-app.git
    cd black-hole-web-app
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run locally**
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` in your browser.

4.  **Build for production**
    ```bash
    npm run build
    ```

## 📚 Physics Background
The simulation solves the geodesic equation for light rays passing near a black hole. The core logic runs in a GLSL fragment shader (`src/shaders/raytracer.glsl`), ensuring high performance even for complex calculations.

*   **Schwarzschild Radius ($R_s$)**: The event horizon radius.
*   **Gravitational Lensing**: Light bending due to spacetime curvature.
*   **Doppler Shift**: Color shifting caused by the relative velocity of the accretion disk material.

## 📄 License
MIT License. Based on the original work by [oseiskar](https://github.com/oseiskar/black-hole).
