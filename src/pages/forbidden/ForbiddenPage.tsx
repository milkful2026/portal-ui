import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 2,
      }}
    >
      <Typography variant="h1" component="h1" sx={{ mb: 1 }}>
        403 — Permission denied
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        You don&apos;t have access to this page.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Go to dashboard
      </Button>
    </Box>
  );
}
