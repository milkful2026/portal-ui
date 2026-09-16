import { createTheme } from '@mui/material/styles';

/**
 * Baseline MUI theme for portal-ui.
 *
 * No STYLE_GUIDE.md existed before this feature (MA-128); these tokens
 * establish the baseline design system per spec §10a. See STYLE_GUIDE.md
 * at the repo root for the documented rationale.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1B5E20', // deep green — dairy/agriculture brand association
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#0277BD',
    },
    error: {
      main: '#C62828',
    },
    warning: {
      main: '#E65100',
    },
    success: {
      main: '#2E7D32',
    },
    background: {
      default: '#F5F7F5',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1D1B',
      secondary: '#4B534E',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'Helvetica',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: { fontSize: '2rem', fontWeight: 600 },
    h2: { fontSize: '1.5rem', fontWeight: 600 },
    h3: { fontSize: '1.25rem', fontWeight: 600 },
    subtitle1: { fontSize: '1rem', fontWeight: 500 },
    body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.875rem' },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'medium',
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
});
