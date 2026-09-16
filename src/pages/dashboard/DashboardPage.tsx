import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useAuth } from '../../auth/AuthContext';

/** Placeholder default landing page. Each role's actual home dashboard is
 * out of scope for MA-128 (see spec §3); this satisfies FR-1's "redirected
 * to the console's default landing page for their role" without inventing
 * per-role dashboard content that belongs to other specs. */
export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <Box>
      <Typography variant="h1" component="h1" sx={{ mb: 1 }}>
        Welcome{user ? `, ${user.email}` : ''}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Signed in as {user?.role}.
      </Typography>
    </Box>
  );
}
