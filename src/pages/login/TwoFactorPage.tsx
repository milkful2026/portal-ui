import { FormEvent, useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import { authApi } from '../../api/client';
import { AdminErrorCode, ApiError } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

export default function TwoFactorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession, clearSession } = useAuth();
  const challengeToken = (location.state as { challengeToken?: string; from?: { pathname: string } } | null)
    ?.challengeToken;
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Reached directly without completing step 1 (refresh, bookmark,
    // back button). Navigating from a useEffect rather than during
    // render avoids triggering a router state update mid-render — an
    // anti-pattern that's especially fragile under React 18
    // StrictMode's double-invoked renders.
    if (!challengeToken) {
      navigate('/login', { replace: true });
    }
  }, [challengeToken, navigate]);

  if (!challengeToken) {
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await authApi.verify2fa({ challengeToken: challengeToken!, code });
      setSession(data.accessToken);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === AdminErrorCode.ADMIN_ACCOUNT_LOCKED) {
          setLocked(true);
          setError(err.message);
        } else if (err.code === AdminErrorCode.CHALLENGE_EXPIRED) {
          // Distinct from a wrong code: the challenge itself is no
          // longer valid (TTL elapsed, or the admin's status changed
          // mid-window) — restart from the password step rather than
          // showing "incorrect code" and leaving them retrying against
          // a token that can never succeed again.
          clearSession('Your login attempt expired. Please log in again.');
          navigate('/login', { replace: true });
        } else {
          setError(err.message);
        }
      } else {
        setError('Something went wrong. Try again.');
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
        <Typography variant="h1" component="h1" sx={{ mb: 1 }}>
          Two-factor verification
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter the 6-digit code from your authenticator app.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Verification code"
            fullWidth
            required
            autoFocus
            margin="normal"
            slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6 } }}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            error={Boolean(error)}
            helperText={error ?? ' '}
            disabled={locked}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={submitting || locked || code.length !== 6}
            sx={{ mt: 1 }}
          >
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Verify'}
          </Button>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link component={RouterLink} to="/login" underline="hover">
              Back
            </Link>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
