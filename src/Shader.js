export class Shader {
    constructor(fragmentShaderTemplate) {
        // Compile-time shader parameters
        this.parameters = {
            n_steps: 100,
            quality: 'medium',
            accretion_disk: true,
            planet: {
                enabled: true,
                distance: 7.0,
                radius: 0.4
            },
            lorentz_contraction: true,
            gravitational_time_dilation: true,
            aberration: true,
            beaming: true,
            doppler_shift: true,
            light_travel_time: true,
            time_scale: 1.0,
            observer: {
                motion: true,
                distance: 11.0,
                orbital_inclination: -10
            }
        };
        this.fragmentShaderTemplate = fragmentShaderTemplate;
        this.needsUpdate = false;
    }

    hasMovingParts() {
        return this.parameters.planet.enabled || this.parameters.observer.motion;
    }

    compile() {
        // Simple manual templating to replace Mustache
        let shader = this.fragmentShaderTemplate;

        // Helper to replace boolean blocks: {{#key}}content{{/key}} or {{^key}}content{{/key}}
        // This is a naive implementation but sufficient for this specific shader.

        const replaceBlock = (key, value) => {
            // Handle {{#key}}...{{/key}}
            const regexTrue = new RegExp(`\\{\\{#${key}\\}\\}([\\s\\S]*?)\\{\\{/${key}\\}\\}`, 'g');
            shader = shader.replace(regexTrue, value ? '$1' : '');

            // Handle {{^key}}...{{/key}} (inverted)
            const regexFalse = new RegExp(`\\{\\{\\^${key}\\}\\}([\\s\\S]*?)\\{\\{/${key}\\}\\}`, 'g');
            shader = shader.replace(regexFalse, !value ? '$1' : '');
        };

        replaceBlock('planetEnabled', this.parameters.planet.enabled && this.parameters.quality !== 'fast');
        replaceBlock('observerMotion', this.parameters.observer.motion);
        replaceBlock('light_travel_time', this.parameters.light_travel_time);
        replaceBlock('lorentz_contraction', this.parameters.lorentz_contraction);
        replaceBlock('gravitational_time_dilation', this.parameters.gravitational_time_dilation);
        replaceBlock('doppler_shift', this.parameters.doppler_shift);
        replaceBlock('aberration', this.parameters.aberration);
        replaceBlock('beaming', this.parameters.beaming);
        replaceBlock('accretion_disk', this.parameters.accretion_disk);

        // Replace variables {{key}}
        shader = shader.replace(/\{\{n_steps\}\}/g, this.parameters.n_steps);

        return shader;
    }
}
