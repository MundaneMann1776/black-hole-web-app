import * as THREE from 'three';

export class Observer {
    constructor() {
        this.position = new THREE.Vector3(10, 0, 0);
        this.velocity = new THREE.Vector3(0, 1, 0);
        this.orientation = new THREE.Matrix3();
        this.time = 0.0;
    }

    orbitalFrame() {
        // var orbital_y = observer.velocity.clone().normalize();
        var orbital_y = (new THREE.Vector3())
            .subVectors(this.velocity.clone().normalize().multiplyScalar(4.0),
                this.position).normalize();

        var orbital_z = (new THREE.Vector3())
            .crossVectors(this.position, orbital_y).normalize();
        var orbital_x = (new THREE.Vector3()).crossVectors(orbital_y, orbital_z);

        // Create a Matrix3 directly from the basis vectors
        const m = new THREE.Matrix3();
        m.set(
            orbital_x.x, orbital_y.x, orbital_z.x,
            orbital_x.y, orbital_y.y, orbital_z.y,
            orbital_x.z, orbital_y.z, orbital_z.z
        );
        return m;
    }

    move(dt, shaderParameters) {
        dt *= shaderParameters.time_scale;

        var r;
        var v = 0;

        // motion on a pre-defined cirular orbit
        if (shaderParameters.observer.motion) {

            r = shaderParameters.observer.distance;
            v = 1.0 / Math.sqrt(2.0 * (r - 1.0));
            var ang_vel = v / r;
            var angle = this.time * ang_vel;

            var s = Math.sin(angle), c = Math.cos(angle);

            this.position.set(c * r, s * r, 0);
            this.velocity.set(-s * v, c * v, 0);

            var alpha = (Math.PI * shaderParameters.observer.orbital_inclination / 180.0);
            var orbit_coords = (new THREE.Matrix4()).makeRotationY(alpha);

            this.position.applyMatrix4(orbit_coords);
            this.velocity.applyMatrix4(orbit_coords);
        }
        else {
            r = this.position.length();
        }

        if (shaderParameters.gravitational_time_dilation) {
            dt = Math.sqrt((dt * dt * (1.0 - v * v)) / (1 - 1.0 / r));
        }

        this.time += dt;
    }
}
