import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { theme } from './theme';
import { AuthProvider } from './auth/AuthContext';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Defaults to true (unchanged behavior for anyone not opting in to the
// real backend) — MSW mocks the MA-129 API contract for dev/test. Set
// VITE_USE_MOCKS=false (e.g. in a .env.local, or `VITE_USE_MOCKS=false
// npm run dev`) to instead hit a real local backend via vite.config.ts's
// dev-server proxy — see services/local-dev/README.md for bringing that
// up (docker compose up -d, then bootstrap_super_admin.py once).
const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false';

async function enableMocking() {
  if (!useMocks) return;
  const { worker } = await import('./mocks/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
            <BrowserRouter>
              <AuthProvider>
                <App />
              </AuthProvider>
            </BrowserRouter>
          </SnackbarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
});
