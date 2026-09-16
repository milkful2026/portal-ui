import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

interface Props {
  open: boolean;
  message: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function RoleChangeConfirmDialog({ open, message, submitting, onCancel, onConfirm }: Props) {
  return (
    <Dialog open={open} onClose={submitting ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Confirm role change</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary" disabled={submitting} autoFocus>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
