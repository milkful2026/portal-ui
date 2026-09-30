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
import { useSnackbar } from 'notistack';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, CustomerAccount, CustomerErrorCode } from '../../api/types';
import { logAdminAnalyticsEvent } from '../../utils/analytics';
import { validateUntilField } from '../../utils/futureDate';
import {
  CUSTOMER_ACCOUNTS_QUERY_KEY,
  useDeactivateCustomerMutation,
  useReactivateCustomerMutation,
  useSuspendCustomerMutation,
} from './hooks';

export type CustomerStatusDialogAction = 'suspend' | 'deactivate' | 'reactivate';

interface Props {
  open: boolean;
  action: CustomerStatusDialogAction | null;
  customer: CustomerAccount | null;
  onClose: () => void;
}

const TITLES: Record<CustomerStatusDialogAction, string> = {
  suspend: 'Suspend customer',
  deactivate: 'Deactivate customer',
  reactivate: 'Reactivate customer',
};

const CONFIRM_LABELS: Record<CustomerStatusDialogAction, string> = {
  suspend: 'Suspend',
  deactivate: 'Deactivate',
  reactivate: 'Reactivate',
};

/**
 * Suspend / Deactivate / Reactivate confirmation dialog for a single
 * customer (FR-4), parameterized by `action`. Structurally mirrors
 * DeactivateDialog's shape (confirm/cancel, disabled-while-pending,
 * error-toast-on-failure) but adds Suspend's Reason+Until form fields and
 * Deactivate's warning copy, per spec §4.
 */
export default function CustomerStatusDialog({ open, action, customer, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const suspendMutation = useSuspendCustomerMutation();
  const deactivateMutation = useDeactivateCustomerMutation();
  const reactivateMutation = useReactivateCustomerMutation();

  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [untilError, setUntilError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset the form whenever a *new* dialog instance opens (different
  // customer/action), not on every render — otherwise a validation error
  // set just before submit would be wiped by this same effect.
  useEffect(() => {
    if (open) {
      setReason('');
      setUntil('');
      setReasonError(null);
      setUntilError(null);
      setFormError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer?.id, action]);

  if (!customer || !action) return null;

  const mutation = action === 'suspend' ? suspendMutation : action === 'deactivate' ? deactivateMutation : reactivateMutation;
  const submitting = mutation.isPending;

  async function handleConfirm() {
    if (!customer || !action) return;

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
      if (action === 'suspend') {
        await suspendMutation.mutateAsync({ id: customer.id, payload: { reason: reason.trim(), until } });
        logAdminAnalyticsEvent('customer_account.suspended', customer.id);
        enqueueSnackbar(`${customer.name} suspended until ${until}.`, { variant: 'success' });
      } else if (action === 'deactivate') {
        await deactivateMutation.mutateAsync({ id: customer.id, payload: { reason: reason.trim() } });
        logAdminAnalyticsEvent('customer_account.deactivated', customer.id);
        enqueueSnackbar(`${customer.name} deactivated.`, { variant: 'success' });
      } else {
        await reactivateMutation.mutateAsync({
          id: customer.id,
          payload: reason.trim() ? { reason: reason.trim() } : {},
        });
        logAdminAnalyticsEvent('customer_account.reactivated', customer.id);
        enqueueSnackbar(`${customer.name} reactivated.`, { variant: 'success' });
      }
      onClose();
    } catch (err) {
      // §6 workflow: a 409 shouldn't normally be reachable given FR-4's
      // state-aware menu, but is handled defensively — refetch the list
      // (it may have changed) and surface a generic "something changed"
      // toast rather than a confusing raw error, then close the dialog.
      if (err instanceof ApiError && err.code === CustomerErrorCode.INVALID_STATUS_TRANSITION) {
        queryClient.invalidateQueries({ queryKey: CUSTOMER_ACCOUNTS_QUERY_KEY });
        enqueueSnackbar('Something changed — refresh and try again.', { variant: 'error' });
        onClose();
        return;
      }
      // 5xx / other errors: dialog stays open with the entered reason
      // retained (§6), so the admin doesn't have to retype it.
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{TITLES[action]}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}

          {action === 'reactivate' && (
            <DialogContentText>
              Reactivate {customer.name}? They will be able to log in again. Any subscriptions paused by the earlier
              deactivation will stay paused until resumed separately.
            </DialogContentText>
          )}

          {action === 'deactivate' && (
            <>
              <Alert severity="warning">This account will be logged out and unable to log in until reactivated.</Alert>
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
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={action === 'deactivate' ? 'error' : action === 'suspend' ? 'warning' : 'primary'}
          disabled={submitting}
          autoFocus={action === 'reactivate'}
        >
          {CONFIRM_LABELS[action]}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
