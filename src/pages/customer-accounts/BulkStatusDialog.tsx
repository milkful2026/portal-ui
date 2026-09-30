import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useSnackbar } from 'notistack';
import { ApiError, BulkCustomerStatusResultItem, CustomerAccount } from '../../api/types';
import { logAdminAnalyticsEvent } from '../../utils/analytics';
import { validateUntilField } from '../../utils/futureDate';
import { customerBulkErrorMessage } from '../../utils/customerErrors';
import { CustomerStatusDialogAction } from './CustomerStatusDialog';
import { useBulkCustomerStatusMutation } from './hooks';

interface Props {
  open: boolean;
  action: CustomerStatusDialogAction | null;
  customers: CustomerAccount[];
  onClose: () => void;
}

const TITLES: Record<CustomerStatusDialogAction, string> = {
  suspend: 'Suspend selected customers',
  deactivate: 'Deactivate selected customers',
  reactivate: 'Reactivate selected customers',
};

const CONFIRM_LABELS: Record<CustomerStatusDialogAction, string> = {
  suspend: 'Suspend',
  deactivate: 'Deactivate',
  reactivate: 'Reactivate',
};

/**
 * Bulk Suspend / Deactivate / Reactivate (FR-5) — new UI, no direct
 * AdminUsersPage precedent (there is no bulk action there today). Shares
 * the same per-action form shape as CustomerStatusDialog (single), but
 * after submit switches this same dialog into a result-summary view
 * instead of closing, so the per-row outcome is never silently collapsed
 * into a bare "some failed" — spec §4/§9's explicit requirement.
 */
export default function BulkStatusDialog({ open, action, customers, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const bulkMutation = useBulkCustomerStatusMutation();

  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [untilError, setUntilError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [results, setResults] = useState<BulkCustomerStatusResultItem[] | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setUntil('');
      setReasonError(null);
      setUntilError(null);
      setFormError(null);
      setResults(null);
    }
  }, [open, action]);

  if (!action) return null;

  const submitting = bulkMutation.isPending;
  const nameById = new Map(customers.map((c) => [c.id, c.name]));

  async function handleConfirm() {
    if (!action) return;

    if (action === 'suspend') {
      const reasonErr = reason.trim() ? null : 'Reason is required.';
      const untilErr = validateUntilField(until);
      setReasonError(reasonErr);
      setUntilError(untilErr);
      if (reasonErr || untilErr) return;
    } else if (action === 'deactivate') {
      const reasonErr = reason.trim() ? null : 'Reason is required.';
      setReasonError(reasonErr);
      if (reasonErr) return;
    }

    try {
      const response = await bulkMutation.mutateAsync({
        customerIds: customers.map((c) => c.id),
        action,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        ...(action === 'suspend' ? { until } : {}),
      });
      const succeeded = response.results.filter((r) => r.success).length;
      const failed = response.results.length - succeeded;
      logAdminAnalyticsEvent('customer_account.bulk_status_changed', `bulk:${customers.length}`, {
        bulkAction: action,
        customerIds: customers.map((c) => c.id),
        succeeded,
        failed,
      });
      setResults(response.results);
      if (failed === 0) {
        enqueueSnackbar(`${succeeded} succeeded, 0 failed.`, { variant: 'success' });
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    }
  }

  function handleClose() {
    onClose();
  }

  if (results) {
    const succeeded = results.filter((r) => r.success).length;
    const failedResults = results.filter((r) => !r.success);

    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Result</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            {succeeded} succeeded, {failedResults.length} failed
          </Typography>
          {failedResults.length > 0 && (
            <>
              <Alert severity="error" sx={{ mb: 1 }}>
                The following accounts could not be updated:
              </Alert>
              <List dense>
                {failedResults.map((r) => (
                  <ListItem key={r.customerId} disableGutters>
                    <ErrorIcon color="error" fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText
                      primary={nameById.get(r.customerId) ?? r.customerId}
                      secondary={r.message ?? customerBulkErrorMessage(r.errorCode)}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
          {succeeded > 0 && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: failedResults.length > 0 ? 2 : 0 }}>
              <CheckCircleIcon color="success" fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                {succeeded} account{succeeded === 1 ? '' : 's'} updated successfully.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained" autoFocus>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{TITLES[action]}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}

          <DialogContentText>
            This will apply to {customers.length} selected customer{customers.length === 1 ? '' : 's'}.
          </DialogContentText>

          {action === 'reactivate' && (
            <DialogContentText>
              They will be able to log in again. Any subscriptions paused by an earlier deactivation will stay paused
              until resumed separately.
            </DialogContentText>
          )}

          {action === 'deactivate' && (
            <>
              <Alert severity="warning">
                Selected accounts will be logged out and unable to log in until reactivated.
              </Alert>
              <TextField
                label="Reason"
                multiline
                minRows={2}
                required
                fullWidth
                autoFocus
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (reasonError) setReasonError(null);
                }}
                error={Boolean(reasonError)}
                helperText={reasonError ?? ' '}
              />
            </>
          )}

          {action === 'suspend' && (
            <>
              <TextField
                label="Reason"
                multiline
                minRows={2}
                required
                fullWidth
                autoFocus
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (reasonError) setReasonError(null);
                }}
                error={Boolean(reasonError)}
                helperText={reasonError ?? ' '}
              />
              <TextField
                label="Until"
                type="date"
                required
                fullWidth
                value={until}
                onChange={(e) => {
                  setUntil(e.target.value);
                  if (untilError) setUntilError(null);
                }}
                onBlur={(e) => setUntilError(validateUntilField(e.target.value))}
                error={Boolean(untilError)}
                helperText={untilError ?? ' '}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={action === 'deactivate' ? 'error' : action === 'suspend' ? 'warning' : 'primary'}
          disabled={submitting}
        >
          {CONFIRM_LABELS[action]}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
