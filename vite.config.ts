import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Only reached when VITE_USE_MOCKS=false (see main.tsx) — proxies
    // this app's relative /v1/... fetches to the real identity-auth
    // service running via services/local-dev (docker compose up -d),
    // port 8001 per that service's own run_local.py. Inert otherwise:
    // MSW intercepts fetch before it ever reaches the network.
    proxy: {
      '/v1': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
})
