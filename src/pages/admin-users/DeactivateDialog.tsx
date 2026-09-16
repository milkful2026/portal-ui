import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { useSnackbar } from 'notistack';
import { AdminUser, ApiError } from '../../api/types';
import { logAdminAnalyticsEvent } from '../../utils/analytics';
import { useDeactivateAdminMutation } from './hooks';

interface Props {
  open: boolean;
  admin: AdminUser | null;
  onClose: () => void;
}

export default function DeactivateDialog({ open, admin, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const mutation = useDeactivateAdminMutation();

  if (!admin) return null;

  async function handleConfirm() {
    try {
      await mutation.mutateAsync(admin!.id);
      logAdminAnalyticsEvent('admin_user.deactivated', admin!.id);
      enqueueSnackbar(`${admin!.name} has been deactivated.`, { variant: 'success' });
      onClose();
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : 'Something went wrong. Try again.', {
        variant: 'error',
      });
    }
  }

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Deactivate admin</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Deactivate {admin.name}? They will be logged out and unable to log in until reactivated.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained" color="error" disabled={mutation.isPending} autoFocus>
          Deactivate
        </Button>
      </DialogActions>
    </Dialog>
  );
}
