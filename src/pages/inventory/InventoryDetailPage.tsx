import { useState } from 'react';
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
import AdjustStockDialog from './AdjustStockDialog';
import ReceiveStockDialog from './ReceiveStockDialog';
import { useInventoryAuditLogQuery, useInventoryDetailQuery, useProductBatchesQuery } from './hooks';
import InventoryStockStateBadge from './InventoryStockStateBadge';
import { formatDate, formatDateTime } from '../../utils/formatters';

/**
 * Product detail view (FR-3): aggregate on-hand/reserved/available/
 * stockState + a batch/expiry table (oldest-expiry-first, matching MA-150
 * FR-2's own FIFO draw order) + an audit-trail table below it (newest-
 * first), reusing the exact table shape CustomerDetailPage's status-
 * history table already established. A dedicated route
 * (`/inventory/{productId}`), not a drawer, per spec section 6 citing
 * CustomerDetailPage's own precedent explicitly - not re-litigated here.
 */
export default function InventoryDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { data: item, isLoading, isError, refetch } = useInventoryDetailQuery(productId);
  const {
    data: batches,
    isLoading: batchesLoading,
    isError: batchesError,
    refetch: refetchBatches,
  } = useProductBatchesQuery(productId);
  const {
    data: auditLog,
    isLoading: auditLoading,
    isError: auditError,
    refetch: refetchAuditLog,
  } = useInventoryAuditLogQuery(productId);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  return (
    <Box>
      <Button component={RouterLink} to="/inventory" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Back to Inventory
      </Button>

      {isLoading && (
        <Box role="status" aria-busy="true" sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress size={24} />
          <Typography>Loading product...</Typography>
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

      {!isLoading && !isError && !item && <Alert severity="info">Product not found.</Alert>}

      {!isLoading && !isError && item && (
        <>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Typography variant="h1" component="h1">
              {item.productId}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <InventoryStockStateBadge state={item.stockState} />
              <Button variant="outlined" size="small" onClick={() => setAdjustOpen(true)}>
                Adjust
              </Button>
              <Button variant="contained" size="small" onClick={() => setReceiveOpen(true)}>
                Receive Stock
              </Button>
            </Stack>
          </Stack>

          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={4} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Box sx={{ minWidth: 120 }}>
                  <Typography variant="body2" color="text.secondary">
                    On Hand
                  </Typography>
                  <Typography variant="h5">{item.onHand}</Typography>
                </Box>
                <Box sx={{ minWidth: 120 }}>
                  <Typography variant="body2" color="text.secondary">
                    Reserved
                  </Typography>
                  <Typography variant="h5">{item.reserved}</Typography>
                </Box>
                <Box sx={{ minWidth: 120 }}>
                  <Typography variant="body2" color="text.secondary">
                    Available
                  </Typography>
                  <Typography variant="h5">{item.available}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Typography variant="h3" sx={{ mb: 2 }}>
            Batches
          </Typography>

          {batchesLoading && (
            <Box role="status" aria-busy="true" sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Loading batches...</Typography>
            </Box>
          )}

          {batchesError && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
              action={
                <Button color="inherit" size="small" onClick={() => refetchBatches()}>
                  Retry
                </Button>
              }
            >
              Couldn't load batches. Try again.
            </Alert>
          )}

          {!batchesLoading && !batchesError && batches && batches.length === 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              No batches recorded yet.
            </Alert>
          )}

          {!batchesLoading && !batchesError && batches && batches.length > 0 && (
            <TableContainer component={Paper} sx={{ overflowX: 'auto', mb: 4 }}>
              <Table role="table" aria-label="Batches">
                <TableHead>
                  <TableRow>
                    <TableCell component="th" scope="col">Quantity</TableCell>
                    <TableCell component="th" scope="col">Expiry Date</TableCell>
                    <TableCell component="th" scope="col">Received Date</TableCell>
                    <TableCell component="th" scope="col">Available From</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.batchId}>
                      <TableCell>{batch.quantity}</TableCell>
                      <TableCell>{formatDate(batch.expiryDate)}</TableCell>
                      <TableCell>{formatDateTime(batch.receivedAt)}</TableCell>
                      <TableCell>{batch.availableFrom ? formatDate(batch.availableFrom) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Typography variant="h3" sx={{ mb: 2 }}>
            Audit Trail
          </Typography>

          {auditLoading && (
            <Box role="status" aria-busy="true" sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Loading audit trail...</Typography>
            </Box>
          )}

          {auditError && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => refetchAuditLog()}>
                  Retry
                </Button>
              }
            >
              Couldn't load the audit trail. Try again.
            </Alert>
          )}

          {!auditLoading && !auditError && auditLog && auditLog.length === 0 && (
            <Alert severity="info">No adjustments or receipts recorded yet.</Alert>
          )}

          {!auditLoading && !auditError && auditLog && auditLog.length > 0 && (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table role="table" aria-label="Audit Trail">
                <TableHead>
                  <TableRow>
                    <TableCell component="th" scope="col">Action</TableCell>
                    <TableCell component="th" scope="col">Previous On Hand</TableCell>
                    <TableCell component="th" scope="col">New On Hand</TableCell>
                    <TableCell component="th" scope="col">Change</TableCell>
                    <TableCell component="th" scope="col">Reason</TableCell>
                    <TableCell component="th" scope="col">Actor</TableCell>
                    <TableCell component="th" scope="col">Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLog.map((entry, idx) => (
                    // No stable id on an audit entry (same constraint
                    // CustomerDetailPage's status-history table notes) -
                    // createdAt + index is safe since this list is
                    // read-only and never reordered by the user.
                    <TableRow key={`${entry.createdAt}-${idx}`}>
                      <TableCell>{entry.actionType === 'ADJUST' ? 'Adjust' : 'Receive'}</TableCell>
                      <TableCell>{entry.previousOnHand}</TableCell>
                      <TableCell>{entry.newOnHand}</TableCell>
                      <TableCell>{entry.quantityDelta > 0 ? `+${entry.quantityDelta}` : entry.quantityDelta}</TableCell>
                      <TableCell>{entry.reason ?? '—'}</TableCell>
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

      <AdjustStockDialog open={adjustOpen} productId={productId ?? null} onClose={() => setAdjustOpen(false)} />
      <ReceiveStockDialog open={receiveOpen} productId={productId ?? null} onClose={() => setReceiveOpen(false)} />
    </Box>
  );
}