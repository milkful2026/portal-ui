import { FormEvent, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { authApi } from '../../api/client';
import { ApiError } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionMessage, clearSessionMessage } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Credential errors render under the password field without saying which
  // field was wrong (FR-1 anti-enumeration). Account-status / network /
  // lockout errors are a distinct condition, not a "your password is wrong"
  // signal, so they render as a banner instead.
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setCredentialError(null);
    setBannerError(null);
    setSubmitting(true);
    try {
      const data = await authApi.login({ email, password });
      clearSessionMessage();
      navigate('/login/2fa', { state: { mfaToken: data.mfaToken, from: location.state?.from } });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'NETWORK_ERROR') {
          setBannerError("Couldn't reach the server. Check your connection and try again.");
        } else if (err.code === 'INVALID_CREDENTIALS') {
          setCredentialError(err.message);
        } else {
          // ACCOUNT_PENDING, ACCOUNT_DEACTIVATED, TOO_MANY_ATTEMPTS
          setBannerError(err.message);
        }
      } else {
        setBannerError('Something went wrong. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Paper sx={{ p: 4, width: '100%', maxWidth: 420 }} elevation={1}>
        <Typography variant="h1" component="h1" sx={{ mb: 3 }}>
          Admin Login
        </Typography>

        {sessionMessage && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {sessionMessage}
          </Alert>
        )}
        {bannerError && (
          <Alert severity="error" sx={{ mb: 2 }} role="alert">
            {bannerError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Email"
            type="email"
            fullWidth
            required
            autoFocus
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(credentialError)}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            required
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(credentialError)}
            helperText={credentialError ?? ' '}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={submitting}
            sx={{ mt: 1 }}
          >
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Log In'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
