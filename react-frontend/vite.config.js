import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Explicitly set frontend port
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Your Express backend URL
        changeOrigin: true,
        secure: false,
        // No rewrite needed - keeps /api prefix for backend routes
        ws: true, // Enable WebSocket proxy if needed
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq) => {
            console.log('Proxy request to:', proxyReq.path);
          });
        }
      }
    }
  },
  build: {
    outDir: '../dist', // Adjust if you want a specific build output
    emptyOutDir: true
  }
});