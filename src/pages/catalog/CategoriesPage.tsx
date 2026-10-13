import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AddIcon from '@mui/icons-material/Add';
import { CatalogCategory } from '../../api/types';
import { useCategoriesQuery } from './hooks';
import CategoryFormDialog from './CategoryFormDialog';

/**
 * Category management (FR-5): list + create/edit dialog. No audit-trail
 * view here - MA-156 FR-3's own scope line (categories aren't audited on
 * the backend), so there's nothing for this screen to display.
 */
export default function CategoriesPage() {
  const { data: categories, isLoading, isError, refetch } = useCategoriesQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CatalogCategory | undefined>(undefined);

  function openCreate() {
    setEditingCategory(undefined);
    setDialogOpen(true);
  }

  function openEdit(category: CatalogCategory) {
    setEditingCategory(category);
    setDialogOpen(true);
  }

  return (
    <Box>
      <Tabs value={1} sx={{ mb: 3 }}>
        <Tab label="Products" component={RouterLink} to="/catalog" />
        <Tab label="Categories" component={RouterLink} to="/catalog/categories" />
      </Tabs>

      <Stack
        direction="row"
        sx={{ mb: 3, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}
      >
        <Typography variant="h1" component="h1">
          Categories
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Category
        </Button>
      </Stack>

      {isLoading && (
        <Box role="status" aria-busy="true" sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress size={24} />
          <Typography>Loading categories...</Typography>
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

      {!isLoading && !isError && categories && categories.length === 0 && (
        <Alert severity="info">No categories yet.</Alert>
      )}

      {!isLoading && !isError && categories && categories.length > 0 && (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table role="table" aria-label="Categories">
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col">Name</TableCell>
                <TableCell component="th" scope="col">Icon</TableCell>
                <TableCell component="th" scope="col">Sort Order</TableCell>
                <TableCell component="th" scope="col">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id} hover>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{category.iconName}</TableCell>
                  <TableCell>{category.sortOrder}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openEdit(category)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        category={editingCategory}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
  );
}
