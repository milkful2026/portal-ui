import { useEffect, useState } from 'react';
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
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Link from '@mui/material/Link';
import useMediaQuery from '@mui/material/useMediaQuery';
import FilterListIcon from '@mui/icons-material/FilterList';
import { StockState } from '../../api/types';
import { useInventoryListQuery } from './hooks';
import InventoryStockStateBadge from './InventoryStockStateBadge';

const STOCK_STATE_OPTIONS: Array<StockState | 'All'> = ['All', 'IN_STOCK', 'OUT_OF_STOCK', 'AVAILABLE_FROM'];

const STOCK_STATE_FILTER_LABELS: Record<StockState | 'All', string> = {
  All: 'All',
  IN_STOCK: 'In Stock',
  OUT_OF_STOCK: 'Out of Stock',
  AVAILABLE_FROM: 'Available From',
};

/**
 * Inventory list (FR-2). Mirrors CustomerAccountsPage's overall structure
 * (filter state, MUI Table, responsive drawer-vs-table-vs-cards
 * breakpoints) - see spec section 6 "mirrors CustomerAccountsPage's
 * structure". No search field and no bulk selection here - FR-2 only
 * calls for the stock-state filter ("the reorder-alerts view, D3"); there
 * is no separate alert UI to build on top of it.
 */
export default function InventoryListPage() {
  const isMobile = useMediaQuery('(max-width:599px)');
  const isTablet = useMediaQuery('(min-width:600px) and (max-width:1023px)');

  const [stockStateFilter, setStockStateFilter] = useState<StockState | 'All'>('All');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The inline filter control (desktop) and the Drawer's own copy
  // (mobile/tablet) are mutually exclusive by breakpoint, but the Drawer's
  // `open` state doesn't know about breakpoint changes on its own - widening
  // the window past the desktop breakpoint while the drawer is open would
  // otherwise show both the inline control and the still-open drawer's
  // control at once, both bound to the same stockStateFilter state.
  useEffect(() => {
    if (!isMobile && !isTablet) {
      setFiltersOpen(false);
    }
  }, [isMobile, isTablet]);

  const { data: items, isLoading, isError, refetch } = useInventoryListQuery(stockStateFilter);

  const filterControls = (
    <TextField
      select
      label="Stock State"
      size="small"
      value={stockStateFilter}
      onChange={(e) => setStockStateFilter(e.target.value as StockState | 'All')}
      sx={{ minWidth: 180 }}
    >
      {STOCK_STATE_OPTIONS.map((s) => (
        <MenuItem key={s} value={s}>
          {STOCK_STATE_FILTER_LABELS[s]}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ mb: 3, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}
      >
        <Typography variant="h1" component="h1">
          Inventory
        </Typography>
      </Stack>

      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{ mb: 3, alignItems: 'center', flexWrap: 'wrap' }}
      >
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
          <Typography>Loading inventory...</Typography>
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

      {!isLoading && !isError && items && items.length === 0 && (
        <Alert severity="info">No products match this filter.</Alert>
      )}

      {!isLoading && !isError && items && items.length > 0 && isMobile && (
        <Stack spacing={2}>
          {items.map((item) => (
            <Card key={item.productId} variant="outlined">
              <CardContent>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Link component={RouterLink} to={`/inventory/${item.productId}`} variant="subtitle1">
                      {item.productId}
                    </Link>
                    <Typography variant="body2" color="text.secondary">
                      On Hand {item.onHand} - Reserved {item.reserved} - Available {item.available}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <InventoryStockStateBadge state={item.stockState} />
                    </Box>
                  </Box>
                  <Button component={RouterLink} to={`/inventory/${item.productId}`} size="small">
                    View
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {!isLoading && !isError && items && items.length > 0 && !isMobile && (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table role="table" aria-label="Inventory">
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col">Product ID</TableCell>
                <TableCell component="th" scope="col">On Hand</TableCell>
                <TableCell component="th" scope="col">Reserved</TableCell>
                <TableCell component="th" scope="col">Available</TableCell>
                <TableCell component="th" scope="col">Stock State</TableCell>
                <TableCell component="th" scope="col">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.productId} hover>
                  <TableCell>
                    <Link component={RouterLink} to={`/inventory/${item.productId}`}>
                      {item.productId}
                    </Link>
                  </TableCell>
                  <TableCell>{item.onHand}</TableCell>
                  <TableCell>{item.reserved}</TableCell>
                  <TableCell>{item.available}</TableCell>
                  <TableCell>
                    <InventoryStockStateBadge state={item.stockState} />
                  </TableCell>
                  <TableCell>
                    <Button component={RouterLink} to={`/inventory/${item.productId}`} size="small">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}