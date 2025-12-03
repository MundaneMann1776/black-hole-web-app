# Black Hole Simulation

A real-time, ray-traced simulation of a Schwarzschild black hole running in the browser.

**Original work by [oseiskar](https://github.com/oseiskar/black-hole).**

## What is this?
This is a WebGL simulation that computes light ray paths by integrating the geodesic equations of the Schwarzschild metric directly on the GPU (using GLSL). It accurately simulates gravitational lensing, Doppler shifting, and relativistic beaming.

## What I did
I took the original implementation and modernized it:
*   **Modern Stack**: Ported to Vite and ES6 modules, removed legacy dependencies (jQuery, Mustache).
*   **New UI**: Replaced the debug controls with a custom HUD, including a settings panel and "well-known black holes" presets.
*   **Features**: Added a background switcher (Nebula, Deep Field), keyboard controls (WASD), and improved performance.

## Running it
1.  `npm install`
2.  `npm run dev`
