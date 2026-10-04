import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { useSnackbar } from 'notistack';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/types';
import { logAdminAnalyticsEvent } from '../../utils/analytics';
import { validateQuantityDeltaField, validateReasonField } from '../../utils/inventoryValidation';
import { INVENTORY_QUERY_KEY, useAdjustStockMutation } from './hooks';

interface Props {
  open: boolean;
  productId: string | null;
  onClose: () => void;
}

/**
 * Adjust Stock dialog (FR-4): a signed quantity field (clearly labeled
 * "positive to add, negative to remove/report spoilage" so MA-119 FR-1's
 * sign convention is legible to a human) + a required Reason field.
 * Structurally mirrors CustomerStatusDialog's shape (form + validation +
 * confirm, disabled-while-pending, error-toast/inline-error-on-failure).
 *
 * The two floor-at-zero rejections (ON_HAND_NEGATIVE, AVAILABLE_NEGATIVE)
 * are NOT special-cased here - the backend/mock already returns two
 * distinct `message` strings for them (utils/inventoryAdjustment.ts), and
 * this dialog surfaces err.message inline exactly as CustomerStatusDialog
 * does for its own ApiErrors. That is what satisfies section 9/10's "a
 * clear inline error, not a generic failure" requirement: the distinct
 * wording comes from the error itself, not from client-side special-
 * casing of the error code.
 */
export default function AdjustStockDialog({ open, productId, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const adjustMutation = useAdjustStockMutation();

  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset whenever a *new* dialog instance opens, not on every render -
  // same reasoning as CustomerStatusDialog's own effect.
  useEffect(() => {
    if (open) {
      setQuantity('');
      setReason('');
      setQuantityError(null);
      setReasonError(null);
      setFormError(null);
    }
  }, [open, productId]);

  if (!productId) return null;

  const submitting = adjustMutation.isPending;

  async function handleConfirm() {
    if (!productId) return;

    const qErr = validateQuantityDeltaField(quantity);
    const rErr = validateReasonField(reason);
    setQuantityError(qErr);
    setReasonError(rErr);
    if (qErr || rErr) return;

    try {
      await adjustMutation.mutateAsync({
        productId,
        quantityDelta: Number(quantity),
        reason: reason.trim(),
      });
      logAdminAnalyticsEvent('inventory.adjusted', productId, { quantityDelta: Number(quantity) });
      enqueueSnackbar(`Stock adjusted for ${productId}.`, { variant: 'success' });
      onClose();
    } catch (err) {
      // Defensive 404 (product disappeared mid-session) - same workflow
      // shape as the Receive dialog's own 404 handling (section 6).
      if (err instanceof ApiError && err.httpStatus === 404) {
        queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
        enqueueSnackbar('Something changed - refresh and try again.', { variant: 'error' });
        onClose();
        return;
      }
      if (err instanceof ApiError && err.httpStatus >= 500) {
        enqueueSnackbar('Something went wrong. Try again.', { variant: 'error' });
        return;
      }
      // 400s (VALIDATION_ERROR, ON_HAND_NEGATIVE, AVAILABLE_NEGATIVE) and
      // any other ApiError: inline, dialog stays open, entered values
      // retained so the admin doesn't have to retype them.
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Adjust stock</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            label="Quantity"
            type="number"
            required
            fullWidth
            autoFocus
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              if (quantityError) setQuantityError(null);
            }}
            error={Boolean(quantityError)}
            helperText={quantityError ?? 'Positive to add, negative to remove or report spoilage.'}
          />
          <TextField
            label="Reason"
            multiline
            minRows={2}
            required
            fullWidth
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (reasonError) setReasonError(null);
            }}
            error={Boolean(reasonError)}
            helperText={reasonError ?? ' '}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained" disabled={submitting}>
          Adjust
        </Button>
      </DialogActions>
    </Dialog>
  );
}