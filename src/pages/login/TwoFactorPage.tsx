import { FormEvent, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import { authApi } from '../../api/client';
import { ApiError } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

export default function TwoFactorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();
  const mfaToken = (location.state as { mfaToken?: string; from?: { pathname: string } } | null)?.mfaToken;
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!mfaToken) {
    // Reached directly without completing step 1.
    navigate('/login', { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await authApi.verify2fa({ mfaToken: mfaToken!, code });
      setSession(data.accessToken);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'TOO_MANY_ATTEMPTS') {
          setLocked(true);
        }
        setError(err.message);
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
