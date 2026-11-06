import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: { target: 'safari16', sourcemap: true },
  server: { host: '0.0.0.0',proxy:{'/multiplayer':{target:'http://127.0.0.1:3001',ws:true},'/api/health':{target:'http://127.0.0.1:3001'}} },
});
