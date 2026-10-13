import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import { useSnackbar } from 'notistack';
import { ApiError, CatalogProduct } from '../../api/types';
import { validateRequiredTextField } from '../../utils/catalogValidation';
import { logAdminAnalyticsEvent } from '../../utils/analytics';
import { useUpdateProductMutation } from './hooks';

interface Props {
  open: boolean;
  product: CatalogProduct | null;
  onClose: () => void;
}

/** FR-4: deactivation is a real, customer-visible action, not a casual
 * toggle - a confirm step is required before the PATCH is actually sent,
 * and (code review fix, matching Inventory's own AdjustStockDialog
 * precedent for exactly this kind of consequential action) a Reason is
 * required so the audit trail records *why*, not just that it happened.
 * Structurally mirrors DeactivateDialog's confirm-before-destructive-
 * action shape. */
export default function DeactivateProductDialog({ open, product, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const mutation = useUpdateProductMutation();

  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  // Reset whenever a *new* dialog instance opens for a given product -
  // this page's own CatalogDetailPage instance is reused by React
  // Router across a navigation to a different product (no remount), so
  // this can't rely on mount-time initial state alone, same reasoning
  // AdjustStockDialog's own effect documents.
  useEffect(() => {
    if (open) {
      setReason('');
      setReasonError(null);
    }
  }, [open, product?.id]);

  if (!product) return null;

  const submitting = mutation.isPending;

  async function handleConfirm() {
    const err = validateRequiredTextField(reason, 'Reason');
    setReasonError(err);
    if (err) return;

    try {
      await mutation.mutateAsync({
        productId: product!.id,
        payload: { isActive: false, reason: reason.trim() },
      });
      logAdminAnalyticsEvent('catalog.product_deactivated', product!.id);
      enqueueSnackbar(`${product!.name} has been deactivated.`, { variant: 'success' });
      onClose();
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : 'Something went wrong. Try again.', {
        variant: 'error',
      });
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Deactivate product</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText>
            Deactivate {product.name}? It will no longer appear to customers.
          </DialogContentText>
          <TextField
            label="Reason"
            required
            multiline
            minRows={2}
            fullWidth
            autoFocus
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (reasonError) setReasonError(null);
            }}
            error={Boolean(reasonError)}
            helperText={reasonError ?? ' '}
            disabled={submitting}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained" color="error" disabled={submitting} autoFocus>
          Deactivate
        </Button>
      </DialogActions>
    </Dialog>
  );
}
