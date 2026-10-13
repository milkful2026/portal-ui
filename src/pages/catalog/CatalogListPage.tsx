import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import useMediaQuery from '@mui/material/useMediaQuery';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddIcon from '@mui/icons-material/Add';
import { useCatalogListQuery, useCategoriesQuery } from './hooks';
import CatalogStatusBadge from './CatalogStatusBadge';

type ActiveFilter = 'All' | 'Active' | 'Inactive';

const ACTIVE_FILTER_OPTIONS: ActiveFilter[] = ['All', 'Active', 'Inactive'];

/**
 * Catalog product list (FR-2). Mirrors InventoryListPage's overall
 * structure (filter state, MUI Table, responsive drawer-vs-table-vs-cards
 * breakpoints) - per spec section 6, this is the closer precedent than
 * AdminFormDialog-style screens for this list->detail->dialog shape.
 *
 * Includes inactive products (distinct from the consumer app, which
 * never sees them) - an inactive row is visually de-emphasized (reduced
 * opacity) rather than hidden, per FR-2's explicit requirement.
 */
export default function CatalogListPage() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:599px)');
  const isTablet = useMediaQuery('(min-width:600px) and (max-width:1023px)');

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  // Defaults to 'Active', not 'All' - spec section 10's own E2E scenario
  // is explicit: a just-deactivated product "no longer appears in the
  // Catalog list's default (Active) filter" (not just "doesn't appear
  // under an All filter containing no inactive rows" - it's the default
  // SELECTED filter value that must be Active). FR-2's "de-emphasized,
  // never hidden" rule still applies whenever an admin explicitly
  // switches to All or Inactive - it just isn't the first thing shown.
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('Active');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Same breakpoint-change guard InventoryListPage's own effect
  // establishes - widening the window past the desktop breakpoint while
  // the drawer is open would otherwise show both the inline control and
  // the still-open drawer's control at once, both bound to the same
  // filter state.
  useEffect(() => {
    if (!isMobile && !isTablet) {
      setFiltersOpen(false);
    }
  }, [isMobile, isTablet]);

  const { data: categories } = useCategoriesQuery();
  const {
    data: listResult,
    isLoading,
    isError,
    refetch,
  } = useCatalogListQuery({
    categoryId: categoryFilter === 'All' ? undefined : categoryFilter,
    isActive: activeFilter === 'All' ? undefined : activeFilter === 'Active',
  });
  const items = listResult?.items;

  function categoryName(categoryId: string): string {
    return categories?.find((c) => c.id === categoryId)?.name ?? categoryId;
  }

  const filterControls = (
    <>
      <TextField
        select
        label="Category"
        size="small"
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        sx={{ minWidth: 180 }}
      >
        <MenuItem value="All">All</MenuItem>
        {(categories ?? []).map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Status"
        size="small"
        value={activeFilter}
        onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
        sx={{ minWidth: 160 }}
      >
        {ACTIVE_FILTER_OPTIONS.map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </TextField>
    </>
  );

  return (
    <Box>
      <Tabs value={0} sx={{ mb: 3 }}>
        <Tab label="Products" component={RouterLink} to="/catalog" />
        <Tab label="Categories" component={RouterLink} to="/catalog/categories" />
      </Tabs>

      <Stack
        direction="row"
        sx={{ mb: 3, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}
      >
        <Typography variant="h1" component="h1">
          Catalog
        </Typography>
        {/* A real <button> (role="button"), not a RouterLink-wrapped
            anchor (role="link") - spec section 10's own E2E scenario
            pins this exact selector (getByRole('button', ...)), and a
            RouterLink-rendered <a> doesn't carry that role. Programmatic
            navigate() on click achieves the same route change. */}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/catalog/new')}
        >
          New Product
        </Button>
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
          <Typography>Loading catalog...</Typography>
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
            <Card key={item.id} variant="outlined" sx={{ opacity: item.isActive ? 1 : 0.6 }}>
              <CardContent>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Link component={RouterLink} to={`/catalog/${item.id}`} variant="subtitle1">
                      {item.name}
                    </Link>
                    <Typography variant="body2" color="text.secondary">
                      {categoryName(item.categoryId)} · ₹{item.priceB2c}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <CatalogStatusBadge isActive={item.isActive} />
                    </Box>
                  </Box>
                  <Button component={RouterLink} to={`/catalog/${item.id}`} size="small">
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
          <Table role="table" aria-label="Catalog">
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col">Name</TableCell>
                <TableCell component="th" scope="col">Category</TableCell>
                <TableCell component="th" scope="col">Price (B2C)</TableCell>
                <TableCell component="th" scope="col">Status</TableCell>
                <TableCell component="th" scope="col">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} hover sx={{ opacity: item.isActive ? 1 : 0.6 }}>
                  <TableCell>
                    <Link component={RouterLink} to={`/catalog/${item.id}`}>
                      {item.name}
                    </Link>
                  </TableCell>
                  <TableCell>{categoryName(item.categoryId)}</TableCell>
                  <TableCell>₹{item.priceB2c}</TableCell>
                  <TableCell>
                    <CatalogStatusBadge isActive={item.isActive} />
                  </TableCell>
                  <TableCell>
                    <Button component={RouterLink} to={`/catalog/${item.id}`} size="small">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!isLoading && !isError && items && listResult && listResult.total > items.length && (
        // listAdmin() requests pageSize=500 - not true pagination - this
        // is the rare catalog whose size exceeds even that, surfaced
        // rather than silently shown as if complete. Same pattern
        // CatalogDetailPage's own audit-log truncation notice uses.
        <Alert severity="info" sx={{ mt: 1 }}>
          Showing {items.length} of {listResult.total} products. Narrow the filters to see more.
        </Alert>
      )}
    </Box>
  );
}
