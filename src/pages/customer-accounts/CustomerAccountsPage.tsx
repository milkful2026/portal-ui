import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Link from '@mui/material/Link';
import useMediaQuery from '@mui/material/useMediaQuery';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FilterListIcon from '@mui/icons-material/FilterList';
import { BulkCustomerStatusResultItem, CustomerAccount, CustomerStatus } from '../../api/types';
import { useCustomerAccountsQuery } from './hooks';
import CustomerStatusBadge from './CustomerStatusBadge';
import CustomerStatusDialog, { CustomerStatusDialogAction } from './CustomerStatusDialog';
import BulkStatusDialog from './BulkStatusDialog';
import { getAvailableCustomerActions } from '../../utils/customerStatusActions';

const STATUS_OPTIONS: Array<CustomerStatus | 'All'> = ['All', 'Active', 'Suspended', 'Deactivated'];

const ACTION_MENU_LABELS: Record<CustomerStatusDialogAction, string> = {
  suspend: 'Suspend',
  deactivate: 'Deactivate',
  reactivate: 'Reactivate',
};

function formatLastStatusChange(value: string | null): string {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

/**
 * Customer Accounts list (FR-2/FR-4/FR-5). Mirrors AdminUsersPage's
 * overall structure (search/filter state, `filtered` useMemo, MUI Table,
 * row actions Menu, responsive drawer-vs-table-vs-cards breakpoints) —
 * see spec §6 "mirrors AdminUsersPage's structure". Bulk selection (FR-5)
 * is new UI with no AdminUsersPage precedent to mirror (§11).
 */
export default function CustomerAccountsPage() {
  const { data: customers, isLoading, isError, refetch } = useCustomerAccountsQuery();

  const isMobile = useMediaQuery('(max-width:599px)');
  const isTablet = useMediaQuery('(min-width:600px) and (max-width:1023px)');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'All'>('All');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuCustomer, setMenuCustomer] = useState<CustomerAccount | null>(null);

  const [singleAction, setSingleAction] = useState<CustomerStatusDialogAction | null>(null);
  const [singleTarget, setSingleTarget] = useState<CustomerAccount | null>(null);

  const [bulkAction, setBulkAction] = useState<CustomerStatusDialogAction | null>(null);

  // FR-2: client-side substring match on name/mobile/email, same default
  // choice as AdminUsersPage's `filtered` — flagged in spec §11/§12 Q2 as
  // a scale risk to revisit (server-side search), not resolved here.
  const filtered = useMemo(() => {
    if (!customers) return [];
    const term = search.trim().toLowerCase();
    return customers.filter((c) => {
      const matchesSearch =
        term === '' ||
        c.name.toLowerCase().includes(term) ||
        c.mobile.toLowerCase().includes(term) ||
        (c.email ?? '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  const selectedCustomers = useMemo(
    () => (customers ?? []).filter((c) => selected.has(c.id)),
    [customers, selected],
  );

  const filteredIds = useMemo(() => filtered.map((c) => c.id), [filtered]);
  const allOnPageSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const someOnPageSelected = !allOnPageSelected && filteredIds.some((id) => selected.has(id));

  function toggleSelectAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleSelectOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function openMenu(e: React.MouseEvent<HTMLElement>, customer: CustomerAccount) {
    setMenuAnchor(e.currentTarget);
    setMenuCustomer(customer);
  }

  function closeMenu() {
    setMenuAnchor(null);
    setMenuCustomer(null);
  }

  function openSingleAction(action: CustomerStatusDialogAction) {
    setSingleAction(action);
    setSingleTarget(menuCustomer);
    closeMenu();
  }

  // Dialog dismissed (Cancel/backdrop/Esc) before any request was sent -
  // the admin's selection is left untouched so they don't have to redo it.
  function dismissBulkDialog() {
    setBulkAction(null);
  }

  // The bulk action actually completed (fully or partially). Clear the
  // selection only for rows that succeeded; rows that failed stay selected
  // so the admin can retry just those without re-picking them from scratch.
  function completeBulkDialog(results: BulkCustomerStatusResultItem[]) {
    setBulkAction(null);
    setSelected((prev) => {
      const next = new Set(prev);
      results.forEach((r) => {
        if (r.success) next.delete(r.customerId);
      });
      return next;
    });
  }

  const filterControls = (
    <TextField
      select
      label="Status"
      size="small"
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | 'All')}
      sx={{ minWidth: 160 }}
    >
      {STATUS_OPTIONS.map((s) => (
        <MenuItem key={s} value={s}>
          {s}
        </MenuItem>
      ))}
    </TextField>
  );

  const availableMenuActions = menuCustomer ? getAvailableCustomerActions(menuCustomer.status) : [];

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ mb: 3, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}
      >
        <Typography variant="h1" component="h1">
          Customer Accounts
        </Typography>
      </Stack>

      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{ mb: 3, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <TextField
          label="Search"
          placeholder="Search by name, mobile, or email"
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

      {selected.size > 0 && (
        <Paper
          variant="outlined"
          sx={{ mb: 2, p: 1.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
        >
          <Typography variant="body2" sx={{ mr: 1 }}>
            {selected.size} selected
          </Typography>
          <Button size="small" variant="outlined" color="warning" onClick={() => setBulkAction('suspend')}>
            Suspend selected
          </Button>
          <Button size="small" variant="outlined" color="error" onClick={() => setBulkAction('deactivate')}>
            Deactivate selected
          </Button>
          <Button size="small" variant="outlined" onClick={() => setBulkAction('reactivate')}>
            Reactivate selected
          </Button>
          <Button size="small" onClick={() => setSelected(new Set())} sx={{ ml: 'auto' }}>
            Clear selection
          </Button>
        </Paper>
      )}

      {isLoading && (
        <Box role="status" aria-busy="true" sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress size={24} />
          <Typography>Loading customer accounts…</Typography>
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

      {!isLoading && !isError && customers && filtered.length === 0 && (
        <Alert severity="info">
          {customers.length === 0 ? 'No customer accounts yet.' : 'No customers match your search or filters.'}
        </Alert>
      )}

      {!isLoading && !isError && filtered.length > 0 && isMobile && (
        <Stack spacing={2}>
          {filtered.map((customer) => (
            <Card key={customer.id} variant="outlined">
              <CardContent>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <Checkbox
                      checked={selected.has(customer.id)}
                      onChange={() => toggleSelectOne(customer.id)}
                      slotProps={{ input: { 'aria-label': `Select ${customer.name}` } }}
                      sx={{ mt: -1, ml: -1 }}
                    />
                    <Box>
                      <Link component={RouterLink} to={`/customer-accounts/${customer.id}`} variant="subtitle1">
                        {customer.name}
                      </Link>
                      <Typography variant="body2" color="text.secondary">
                        {customer.mobile}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <CustomerStatusBadge status={customer.status} />
                      </Box>
                    </Box>
                  </Stack>
                  <IconButton aria-label={`Actions for ${customer.name}`} onClick={(e) => openMenu(e, customer)}>
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
          <Table role="table" aria-label="Customer Accounts">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allOnPageSelected}
                    indeterminate={someOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    slotProps={{ input: { 'aria-label': 'Select all on this page' } }}
                  />
                </TableCell>
                <TableCell component="th" scope="col">Name</TableCell>
                <TableCell component="th" scope="col">Mobile</TableCell>
                <TableCell component="th" scope="col">Email</TableCell>
                <TableCell component="th" scope="col">Account Type</TableCell>
                <TableCell component="th" scope="col">Status</TableCell>
                <TableCell component="th" scope="col">Last Status Change</TableCell>
                <TableCell component="th" scope="col">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((customer) => (
                <TableRow key={customer.id} hover selected={selected.has(customer.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.has(customer.id)}
                      onChange={() => toggleSelectOne(customer.id)}
                      slotProps={{ input: { 'aria-label': `Select ${customer.name}` } }}
                    />
                  </TableCell>
                  <TableCell>
                    <Link component={RouterLink} to={`/customer-accounts/${customer.id}`}>
                      {customer.name}
                    </Link>
                  </TableCell>
                  <TableCell>{customer.mobile}</TableCell>
                  <TableCell>{customer.email ?? '—'}</TableCell>
                  <TableCell>{customer.accountType}</TableCell>
                  <TableCell>
                    <CustomerStatusBadge status={customer.status} />
                  </TableCell>
                  <TableCell>{formatLastStatusChange(customer.lastStatusChangeAt)}</TableCell>
                  <TableCell>
                    <IconButton aria-label={`Actions for ${customer.name}`} onClick={(e) => openMenu(e, customer)}>
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
        {menuCustomer && (
          <MenuItem component={RouterLink} to={`/customer-accounts/${menuCustomer.id}`} onClick={closeMenu}>
            View Details
          </MenuItem>
        )}
        {availableMenuActions.map((action) => (
          <MenuItem key={action} onClick={() => openSingleAction(action)}>
            {ACTION_MENU_LABELS[action]}
          </MenuItem>
        ))}
      </Menu>

      <CustomerStatusDialog
        open={Boolean(singleAction && singleTarget)}
        action={singleAction}
        customer={singleTarget}
        onClose={() => {
          setSingleAction(null);
          setSingleTarget(null);
        }}
      />

      <BulkStatusDialog
        open={Boolean(bulkAction)}
        action={bulkAction}
        customers={selectedCustomers}
        onDismiss={dismissBulkDialog}
        onComplete={completeBulkDialog}
      />
    </Box>
  );
}
