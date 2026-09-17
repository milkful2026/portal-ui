import { FormEvent, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { useSnackbar } from 'notistack';
import { AdminErrorCode, AdminRole, AdminUser, ApiError } from '../../api/types';
import { validateCidrField, parseCidrList } from '../../utils/cidr';
import { validateMaxSessionsField, parseMaxSessions } from '../../utils/maxSessions';
import { requiresRoleChangeConfirmation, roleChangeConfirmationMessage } from '../../utils/roleChange';
import { logAdminAnalyticsEvent } from '../../utils/analytics';
import { useCreateAdminMutation, useUpdateAdminMutation } from './hooks';
import RoleChangeConfirmDialog from './RoleChangeConfirmDialog';

const ROLES: AdminRole[] = ['Ops', 'Finance', 'Support', 'Marketing', 'SuperAdmin'];

interface Props {
  open: boolean;
  onClose: () => void;
  admin?: AdminUser; // present => edit mode
}

export default function AdminFormDialog({ open, onClose, admin }: Props) {
  const isEdit = Boolean(admin);
  const { enqueueSnackbar } = useSnackbar();
  const createMutation = useCreateAdminMutation();
  const updateMutation = useUpdateAdminMutation();

  const [name, setName] = useState(admin?.name ?? '');
  const [email, setEmail] = useState(admin?.email ?? '');
  const [role, setRole] = useState<AdminRole>(admin?.role ?? 'Ops');
  const [ipAllowlist, setIpAllowlist] = useState((admin?.ipAllowlist ?? []).join(', '));
  const [maxSessions, setMaxSessions] = useState(
    admin?.maxConcurrentSessions != null ? String(admin.maxConcurrentSessions) : '',
  );

  const [emailError, setEmailError] = useState<string | null>(null);
  const [cidrError, setCidrError] = useState<string | null>(null);
  const [maxSessionsError, setMaxSessionsError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState(false);

  const submitting = createMutation.isPending || updateMutation.isPending;

  function resetAndClose() {
    setName('');
    setEmail('');
    setRole('Ops');
    setIpAllowlist('');
    setMaxSessions('');
    setEmailError(null);
    setCidrError(null);
    setMaxSessionsError(null);
    setFormError(null);
    onClose();
  }

  async function performUpdate() {
    const { valid } = parseCidrList(ipAllowlist);
    try {
      const updated = await updateMutation.mutateAsync({
        id: admin!.id,
        payload: {
          role,
          ipAllowlist: valid,
          maxConcurrentSessions: parseMaxSessions(maxSessions),
        },
      });
      logAdminAnalyticsEvent(
        requiresRoleChangeConfirmation(admin!.role, role) ? 'admin_user.role_changed' : 'admin_user.session_ip_updated',
        updated.id,
      );
      enqueueSnackbar('Admin account updated.', { variant: 'success' });
      resetAndClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Something went wrong. Try again.');
      }
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setEmailError(null);

    const cidrValidation = validateCidrField(ipAllowlist);
    setCidrError(cidrValidation);
    const maxSessionsValidation = isEdit ? validateMaxSessionsField(maxSessions) : null;
    setMaxSessionsError(maxSessionsValidation);
    if (cidrValidation || maxSessionsValidation) return;

    if (isEdit) {
      if (requiresRoleChangeConfirmation(admin!.role, role)) {
        setPendingRoleChange(true);
        return;
      }
      await performUpdate();
      return;
    }

    try {
      const created = await createMutation.mutateAsync({ name, email, role });
      logAdminAnalyticsEvent('admin_user.created', created.id);
      enqueueSnackbar(`Admin account created. An invitation has been sent to ${created.email}.`, {
        variant: 'success',
      });
      resetAndClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === AdminErrorCode.ADMIN_EMAIL_EXISTS) {
          setEmailError(err.message);
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError('Something went wrong. Try again.');
      }
    }
  }

  return (
    <>
      <Dialog open={open} onClose={submitting ? undefined : resetAndClose} fullWidth maxWidth="sm">
        <DialogTitle>{isEdit ? 'Edit Role' : 'Add Admin'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <DialogContent>
            <Stack spacing={2}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                label="Name"
                fullWidth
                required
                autoFocus={!isEdit}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isEdit}
              />
              <TextField
                label="Email"
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isEdit}
                error={Boolean(emailError)}
                helperText={emailError ?? ' '}
              />
              <TextField
                select
                label="Role"
                fullWidth
                required
                autoFocus={isEdit}
                value={role}
                onChange={(e) => setRole(e.target.value as AdminRole)}
              >
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </TextField>

              {isEdit && (
                <>
                  <TextField
                    label="IP Allowlist"
                    placeholder="e.g. 10.0.0.0/8, 192.168.1.0/24"
                    helperText={cidrError ?? 'Comma-separated CIDR ranges. Leave empty for no IP restriction.'}
                    fullWidth
                    error={Boolean(cidrError)}
                    value={ipAllowlist}
                    onChange={(e) => {
                      setIpAllowlist(e.target.value);
                      setCidrError(null);
                    }}
                    onBlur={(e) => setCidrError(validateCidrField(e.target.value))}
                  />
                  <TextField
                    label="Max Concurrent Sessions"
                    type="number"
                    fullWidth
                    placeholder="Unlimited"
                    helperText={maxSessionsError ?? '0 means no sessions allowed. Leave empty for unlimited.'}
                    error={Boolean(maxSessionsError)}
                    value={maxSessions}
                    onChange={(e) => {
                      setMaxSessions(e.target.value);
                      setMaxSessionsError(null);
                    }}
                    onBlur={(e) => setMaxSessionsError(validateMaxSessionsField(e.target.value))}
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={resetAndClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {isEdit ? 'Save' : 'Create'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {isEdit && (
        <RoleChangeConfirmDialog
          open={pendingRoleChange}
          message={roleChangeConfirmationMessage(admin!.name, admin!.role, role)}
          submitting={submitting}
          onCancel={() => setPendingRoleChange(false)}
          onConfirm={async () => {
            await performUpdate();
            setPendingRoleChange(false);
          }}
        />
      )}
    </>
  );
}

