# My Black Hole Simulation

Just a personal project where I wanted to see if I could build a real-time, ray-traced black hole simulation that runs directly in the browser.

I've always been fascinated by accurate space visualizations (like in *Interstellar*), so I took an existing implementation and modernized it. I ported it to a newer tech stack, cleaned up the code, and added a bunch of features I thought were cool.

## What I Added
I spent some time adding things that make it more fun to play with:
*   **Presets**: I added configurations for famous black holes like **Gargantua**, **Sagittarius A***, and **M87*** so you can see how they compare.
*   **Backgrounds**: You can swap the background between the Milky Way, a Nebula, or the Deep Field.
*   **Controls**: I wasn't a fan of the old controls, so I added WASD support and a cleaner UI.

## How it Works
Under the hood, it's using **Three.js** for the web stuff and **GLSL** for the heavy lifting. The physics are actually solving the geodesic equations for light rays in the Schwarzschild metric on the GPU. It handles gravitational lensing, doppler shifting, and time dilation.

## Running it
If you want to mess around with the code:

1.  Clone the repo.
2.  `npm install`
3.  `npm run dev`

That's pretty much it.

---
*Based on the original work by [oseiskar](https://github.com/oseiskar/black-hole).*
