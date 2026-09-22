import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Gated on VITE_USE_MOCKS=false, not registered unconditionally —
    // MSW starts with onUnhandledRequest: 'bypass' (main.tsx), so any
    // /v1/... call MSW doesn't have a handler for falls through to the
    // network. An always-on proxy would silently hand that fallthrough
    // to a real backend if one happened to be running (e.g. left up
    // from unrelated local-dev work) instead of failing loudly with a
    // 404 the way default (mocked) mode did before this existed — that
    // would mask gaps in MSW handler coverage rather than surface them.
    proxy:
      process.env.VITE_USE_MOCKS === 'false'
        ? {
            '/v1': {
              // Real identity-auth service running via services/local-dev
              // (docker compose up -d), port 8001 per that service's own
              // run_local.py.
              target: 'http://localhost:8001',
              changeOrigin: true,
            },
          }
        : undefined,
  },
})
