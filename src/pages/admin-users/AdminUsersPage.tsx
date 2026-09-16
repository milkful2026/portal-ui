import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FilterListIcon from '@mui/icons-material/FilterList';
import { AdminRole, AdminStatus, AdminUser } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { useAdminUsersQuery, useReactivateAdminMutation } from './hooks';
import StatusBadge from './StatusBadge';
import AdminFormDialog from './AdminFormDialog';
import DeactivateDialog from './DeactivateDialog';
import { logAdminAnalyticsEvent } from '../../utils/analytics';
import { useSnackbar } from 'notistack';
import { ApiError } from '../../api/types';

const ROLE_OPTIONS: Array<AdminRole | 'All'> = ['All', 'Ops', 'Finance', 'Support', 'Marketing', 'SuperAdmin'];
const STATUS_OPTIONS: Array<AdminStatus | 'All'> = ['All', 'Active', 'Pending', 'Deactivated'];

function formatLastLogin(value: string | null): string {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

export default function AdminUsersPage() {
  const { data: admins, isLoading, isError, refetch } = useAdminUsersQuery();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const reactivateMutation = useReactivateAdminMutation();

  const isMobile = useMediaQuery('(max-width:599px)');
  const isTablet = useMediaQuery('(min-width:600px) and (max-width:1023px)');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AdminRole | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<AdminStatus | 'All'>('All');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showLastLogin, setShowLastLogin] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [deactivatingAdmin, setDeactivatingAdmin] = useState<AdminUser | null>(null);

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuAdmin, setMenuAdmin] = useState<AdminUser | null>(null);

  const filtered = useMemo(() => {
    if (!admins) return [];
    const term = search.trim().toLowerCase();
    return admins.filter((a) => {
      const matchesSearch = term === '' || a.name.toLowerCase().includes(term) || a.email.toLowerCase().includes(term);
      const matchesRole = roleFilter === 'All' || a.role === roleFilter;
      const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [admins, search, roleFilter, statusFilter]);

  function openMenu(e: React.MouseEvent<HTMLElement>, admin: AdminUser) {
    setMenuAnchor(e.currentTarget);
    setMenuAdmin(admin);
  }

  function closeMenu() {
    setMenuAnchor(null);
    setMenuAdmin(null);
  }

  async function handleReactivate(admin: AdminUser) {
    closeMenu();
    try {
      await reactivateMutation.mutateAsync(admin.id);
      logAdminAnalyticsEvent('admin_user.reactivated', admin.id);
      enqueueSnackbar(`${admin.name} has been reactivated.`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : 'Something went wrong. Try again.', {
        variant: 'error',
      });
    }
  }

  const filterControls = (
    <>
      <TextField
        select
        label="Role"
        size="small"
        value={roleFilter}
        onChange={(e) => setRoleFilter(e.target.value as AdminRole | 'All')}
        sx={{ minWidth: 160 }}
      >
        {ROLE_OPTIONS.map((r) => (
          <MenuItem key={r} value={r}>
            {r}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Status"
        size="small"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as AdminStatus | 'All')}
        sx={{ minWidth: 160 }}
      >
        {STATUS_OPTIONS.map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </TextField>
    </>
  );

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ mb: 3, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}
      >
        <Typography variant="h1" component="h1">
          Admin Users
        </Typography>
        <Button variant="contained" onClick={() => setAddOpen(true)}>
          Add Admin
        </Button>
      </Stack>

      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{ mb: 3, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <TextField
          label="Search by name or email"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 240, flexGrow: isMobile ? 1 : 0 }}
        />
        {!isMobile && !isTablet && filterControls}
        {(isMobile || isTablet) && (
          <Button
            startIcon={<FilterListIcon />}
            onClick={() => setFiltersOpen(true)}
            aria-label="Open filters"
            variant="outlined"
            size="small"
          >
            Filters
          </Button>
        )}
      </Stack>

      <Drawer anchor="right" open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <Box sx={{ p: 3, width: 280 }} role="presentation">
          <Typography variant="h3" sx={{ mb: 2 }}>
            Filters
          </Typography>
          <Stack spacing={2}>{filterControls}</Stack>
        </Box>
      </Drawer>

      {isLoading && (
        <Box role="status" aria-busy="true" sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress size={24} />
          <Typography>Loading admin accounts…</Typography>
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

      {!isLoading && !isError && admins && filtered.length === 0 && (
        <Alert severity="info">
          {admins.length === 0 ? 'No admin accounts yet.' : 'No admins match your search or filters.'}
        </Alert>
      )}

      {!isLoading && !isError && filtered.length > 0 && isMobile && (
        <Stack spacing={2}>
          {filtered.map((admin) => (
            <Card key={admin.id} variant="outlined">
              <CardContent>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="subtitle1">{admin.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {admin.role}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <StatusBadge status={admin.status} />
                    </Box>
                  </Box>
                  <IconButton aria-label={`Actions for ${admin.name}`} onClick={(e) => openMenu(e, admin)}>
                    <MoreVertIcon />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {!isLoading && !isError && filtered.length > 0 && !isMobile && (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table role="table" aria-label="Admin Users">
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col">Name</TableCell>
                <TableCell component="th" scope="col">Email</TableCell>
                <TableCell component="th" scope="col">Role</TableCell>
                <TableCell component="th" scope="col">Status</TableCell>
                {(!isTablet || showLastLogin) && (
                  <TableCell component="th" scope="col">Last Login</TableCell>
                )}
                {isTablet && (
                  <TableCell component="th" scope="col">
                    <Button size="small" onClick={() => setShowLastLogin((v) => !v)}>
                      {showLastLogin ? 'Hide' : 'Last Login'}
                    </Button>
                  </TableCell>
                )}
                <TableCell component="th" scope="col">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((admin) => (
                <TableRow key={admin.id} hover>
                  <TableCell>{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>{admin.role}</TableCell>
                  <TableCell>
                    <StatusBadge status={admin.status} />
                  </TableCell>
                  {(!isTablet || showLastLogin) && <TableCell>{formatLastLogin(admin.lastLoginAt)}</TableCell>}
                  <TableCell>
                    <IconButton aria-label={`Actions for ${admin.name}`} onClick={(e) => openMenu(e, admin)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            setEditingAdmin(menuAdmin);
            closeMenu();
          }}
        >
          Edit Role
        </MenuItem>
        {menuAdmin?.status === 'Deactivated' ? (
          <MenuItem onClick={() => menuAdmin && handleReactivate(menuAdmin)}>Reactivate</MenuItem>
        ) : (
          <Tooltip
            title={menuAdmin && user && menuAdmin.id === user.id ? 'You cannot deactivate your own account.' : ''}
          >
            <span>
              <MenuItem
                disabled={Boolean(menuAdmin && user && menuAdmin.id === user.id)}
                onClick={() => {
                  setDeactivatingAdmin(menuAdmin);
                  closeMenu();
                }}
              >
                Deactivate
              </MenuItem>
            </span>
          </Tooltip>
        )}
      </Menu>

      <AdminFormDialog open={addOpen} onClose={() => setAddOpen(false)} />
      {editingAdmin && (
        <AdminFormDialog open={Boolean(editingAdmin)} onClose={() => setEditingAdmin(null)} admin={editingAdmin} />
      )}
      <DeactivateDialog
        open={Boolean(deactivatingAdmin)}
        admin={deactivatingAdmin}
        onClose={() => setDeactivatingAdmin(null)}
      />
    </Box>
  );
}
