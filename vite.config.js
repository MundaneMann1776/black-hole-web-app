import { defineConfig } from 'vite';
import vitePluginString from 'vite-plugin-string';

export default defineConfig({
    plugins: [
        vitePluginString()
    ],
    base: '/black-hole-web-app/',
    server: {
        host: true
    }
});
