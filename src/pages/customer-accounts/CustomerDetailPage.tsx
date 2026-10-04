import { Link as RouterLink, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCustomerDetailQuery } from './hooks';
import CustomerStatusBadge from './CustomerStatusBadge';
import { formatDate, formatDateTime } from '../../utils/formatters';

/**
 * Customer detail view (FR-3): profile summary + current status + a
 * reverse-chronological status-change history table. Spec §6 left the
 * layout choice open ("CustomerDetailDrawer or route
 * (`/customer-accounts/{id}`) ... no strong precedent to mirror") — a
 * dedicated route was chosen since every other page in this app
 * (AdminUsersPage, DashboardPage, ForbiddenPage) is a full route, not a
 * drawer-over-a-list, so a route keeps this screen consistent with the
 * app's existing navigation model (back button, shareable/bookmarkable
 * URL, and its own place in RequireRole's route-level gating).
 */
export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading, isError, refetch } = useCustomerDetailQuery(id);

  return (
    <Box>
      <Button component={RouterLink} to="/customer-accounts" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Back to Customer Accounts
      </Button>

      {isLoading && (
        <Box role="status" aria-busy="true" sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress size={24} />
          <Typography>Loading customer account…</Typography>
        </Box>
      )}

      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          Something went wrong. Try again.
        </Alert>
      )}

      {!isLoading && !isError && !customer && <Alert severity="info">Customer account not found.</Alert>}

      {!isLoading && !isError && customer && (
        <>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Typography variant="h1" component="h1">
              {customer.name}
            </Typography>
            <CustomerStatusBadge status={customer.status} />
          </Stack>

          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={4} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Box sx={{ minWidth: 160 }}>
                  <Typography variant="body2" color="text.secondary">
                    Mobile
                  </Typography>
                  <Typography variant="body1">{customer.mobile}</Typography>
                </Box>
                <Box sx={{ minWidth: 160 }}>
                  <Typography variant="body2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">{customer.email ?? '—'}</Typography>
                </Box>
                <Box sx={{ minWidth: 160 }}>
                  <Typography variant="body2" color="text.secondary">
                    Account Type
                  </Typography>
                  <Typography variant="body1">{customer.accountType}</Typography>
                </Box>
                <Box sx={{ minWidth: 160 }}>
                  <Typography variant="body2" color="text.secondary">
                    Current Status Reason
                  </Typography>
                  <Typography variant="body1">{customer.statusReason ?? '—'}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Typography variant="h3" sx={{ mb: 2 }}>
            Status History
          </Typography>

          {customer.statusHistory.length === 0 ? (
            <Alert severity="info">No status changes recorded yet.</Alert>
          ) : (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table role="table" aria-label="Status History">
                <TableHead>
                  <TableRow>
                    <TableCell component="th" scope="col">Previous Status</TableCell>
                    <TableCell component="th" scope="col">New Status</TableCell>
                    <TableCell component="th" scope="col">Reason</TableCell>
                    <TableCell component="th" scope="col">Effective Date</TableCell>
                    <TableCell component="th" scope="col">Actor</TableCell>
                    <TableCell component="th" scope="col">Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...customer.statusHistory]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((entry, idx) => (
                      // No stable id on a history entry per the MA-139 DTO (§7) —
                      // createdAt + index is a safe key since this list is
                      // read-only and never reordered by the user.
                      <TableRow key={`${entry.createdAt}-${idx}`}>
                        <TableCell>{entry.previousStatus ?? '—'}</TableCell>
                        <TableCell>{entry.newStatus}</TableCell>
                        <TableCell>{entry.reason ?? '—'}</TableCell>
                        <TableCell>{formatDate(entry.effectiveFrom)}</TableCell>
                        <TableCell>{entry.actorAdminId}</TableCell>
                        <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  );
}
