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
import { validateExpiryDateField, validateReceiveQuantityField } from '../../utils/inventoryValidation';
import { INVENTORY_QUERY_KEY, useReceiveStockMutation } from './hooks';

interface Props {
  open: boolean;
  productId: string | null;
  onClose: () => void;
}

/**
 * Receive Stock dialog (FR-5): quantity (positive integer) + expiry date
 * (required, must be a future date, inline-validated before submit - the
 * identical pattern as MA-141's Suspend dialog's future-date validation)
 * + an optional reason/note. A distinct dialog from Adjust (FR-4) -
 * reinforces MA-150's own design decision that a receipt is not just a
 * correction, it establishes a real batch (section 11, not re-litigated
 * here). Error-handling workflow follows spec section 6's own explicit
 * Receive-Stock sequence diagram exactly: 404 -> toast + refetch + close;
 * 400 -> inline dialog error, values retained; 5xx -> toast, dialog stays
 * open.
 */
export default function ReceiveStockDialog({ open, productId, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const receiveMutation = useReceiveStockMutation();

  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [reason, setReason] = useState('');
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [expiryDateError, setExpiryDateError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuantity('');
      setExpiryDate('');
      setReason('');
      setQuantityError(null);
      setExpiryDateError(null);
      setFormError(null);
    }
  }, [open, productId]);

  if (!productId) return null;

  const submitting = receiveMutation.isPending;

  async function handleConfirm() {
    if (!productId) return;

    const qErr = validateReceiveQuantityField(quantity);
    const dErr = validateExpiryDateField(expiryDate);
    setQuantityError(qErr);
    setExpiryDateError(dErr);
    if (qErr || dErr) return;

    try {
      await receiveMutation.mutateAsync({
        productId,
        quantity: Number(quantity),
        expiryDate,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      logAdminAnalyticsEvent('inventory.received', productId, { quantity: Number(quantity), expiryDate });
      enqueueSnackbar(`${quantity} units received for ${productId}, expiring ${expiryDate}.`, { variant: 'success' });
      onClose();
    } catch (err) {
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
      // 400 (e.g. a past expiry date that slipped past client validation):
      // inline, dialog stays open, entered values retained.
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Receive stock</DialogTitle>
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
            helperText={quantityError ?? ' '}
          />
          <TextField
            label="Expiry Date"
            type="date"
            required
            fullWidth
            value={expiryDate}
            onChange={(e) => {
              setExpiryDate(e.target.value);
              if (expiryDateError) setExpiryDateError(null);
            }}
            onBlur={(e) => setExpiryDateError(validateExpiryDateField(e.target.value))}
            error={Boolean(expiryDateError)}
            helperText={expiryDateError ?? ' '}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Reason"
            multiline
            minRows={2}
            fullWidth
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            helperText="Optional note."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained" disabled={submitting}>
          Receive
        </Button>
      </DialogActions>
    </Dialog>
  );
}