# Black Hole Simulation

A real-time, ray-traced simulation of a Schwarzschild black hole running in the browser.

**Original work by [oseiskar](https://github.com/oseiskar/black-hole).**

**[Live Demo](https://mundanemann1776.github.io/black-hole-web-app/)**

## What is this?
This is a WebGL simulation that computes light ray paths by integrating the geodesic equations of the Schwarzschild metric directly on the GPU (using GLSL). It accurately simulates gravitational lensing, Doppler shifting, and relativistic beaming.

## What I did
I took the original implementation and modernized it:
*   **Modern Stack**: Ported to Vite and ES6 modules, removed legacy dependencies (jQuery, Mustache).
*   **New UI**: Replaced the debug controls with a custom HUD, including a settings panel and "well-known black holes" presets.
*   **Features**: Added keyboard controls (WASD) and improved performance.

## What's next?
What I'm planning on adding:
*  **More Black Holes**: Will be adding well-known black holes such as TON 618, Sagittarius A* and even Gargantua from Interstellar.
*  **More Backgrounds**: Currently, there is only one background I want to add more in order to make the experience even better.
*  **Free-fall observer**: A mode where the user can experience free-falling into the black hole with/without controls.
*  **Planet devouring simulator**: A toggle that adds in a planet, which then gets devoured by the black hole in a scientifically correct way.

## Running it
1.  `npm install`
2.  `npm run dev`
