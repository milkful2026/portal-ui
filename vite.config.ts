import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Config files do NOT get .env/.env.local automatically loaded into
  // process.env the way client code gets import.meta.env populated —
  // that's a separate, later stage of Vite's pipeline. loadEnv() reads
  // the same .env files (VITE_USE_MOCKS=false in .env.local, or the var
  // set inline before the command) explicitly, here, so this config can
  // see it too. Getting this wrong previously meant .env.local disabled
  // MSW (that part *is* wired into client code) but never enabled the
  // proxy below — every /v1/... request hit neither MSW nor a real
  // backend, and Vite's own dev server answered with its SPA index.html
  // fallback instead, breaking every API call silently.
  const env = loadEnv(mode, process.cwd(), '')

  return {
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
        env.VITE_USE_MOCKS === 'false'
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
  }
})
