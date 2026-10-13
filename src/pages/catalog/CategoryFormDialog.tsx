import { FormEvent, useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { useSnackbar } from 'notistack';
import { ApiError, CatalogCategory } from '../../api/types';
import { validateCategorySortOrderField, validateRequiredTextField } from '../../utils/catalogValidation';
import { logAdminAnalyticsEvent } from '../../utils/analytics';
import { useCreateCategoryMutation, useUpdateCategoryMutation } from './hooks';

interface Props {
  open: boolean;
  onClose: () => void;
  category?: CatalogCategory; // present => edit mode
}

/** FR-5: create/edit category form. Structurally mirrors
 * AdminFormDialog's shape (form + validation + confirm), reused for both
 * create and edit - same as that component's own isEdit pattern. */
export default function CategoryFormDialog({ open, onClose, category }: Props) {
  const isEdit = Boolean(category);
  const { enqueueSnackbar } = useSnackbar();
  const createMutation = useCreateCategoryMutation();
  const updateMutation = useUpdateCategoryMutation();

  const [name, setName] = useState(category?.name ?? '');
  const [iconName, setIconName] = useState(category?.iconName ?? '');
  const [sortOrder, setSortOrder] = useState(category?.sortOrder != null ? String(category.sortOrder) : '0');

  const [nameError, setNameError] = useState<string | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);
  const [sortOrderError, setSortOrderError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const submitting = createMutation.isPending || updateMutation.isPending;

  // Regression fix (code review): this dialog is a single long-lived
  // instance rendered unconditionally by CategoriesPage and shown/hidden
  // via `open` - the initial useState value only ever applies once, on
  // first mount, so without this the form showed stale/blank values for
  // every category after the first one opened. Resets whenever a *new*
  // dialog instance opens for a given category, same reasoning
  // AdjustStockDialog's own effect documents.
  useEffect(() => {
    if (open) {
      setName(category?.name ?? '');
      setIconName(category?.iconName ?? '');
      setSortOrder(category?.sortOrder != null ? String(category.sortOrder) : '0');
      setNameError(null);
      setIconError(null);
      setSortOrderError(null);
      setFormError(null);
    }
  }, [open, category]);

  function resetAndClose() {
    setName('');
    setIconName('');
    setSortOrder('0');
    setNameError(null);
    setIconError(null);
    setSortOrderError(null);
    setFormError(null);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const nameErr = validateRequiredTextField(name, 'Name');
    const iconErr = validateRequiredTextField(iconName, 'Icon name');
    const sortOrderErr = validateCategorySortOrderField(sortOrder);
    setNameError(nameErr);
    setIconError(iconErr);
    setSortOrderError(sortOrderErr);
    if (nameErr || iconErr || sortOrderErr) return;

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          categoryId: category!.id,
          payload: { name, iconName, sortOrder: Number(sortOrder) },
        });
        logAdminAnalyticsEvent('catalog.category_updated', category!.id);
        enqueueSnackbar(`Category ${name} updated.`, { variant: 'success' });
      } else {
        const created = await createMutation.mutateAsync({ name, iconName, sortOrder: Number(sortOrder) });
        logAdminAnalyticsEvent('catalog.category_created', created.id);
        enqueueSnackbar(`Category ${name} created.`, { variant: 'success' });
      }
      resetAndClose();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : resetAndClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Edit Category' : 'New Category'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Name"
              fullWidth
              required
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              error={Boolean(nameError)}
              helperText={nameError ?? ' '}
            />
            <TextField
              label="Icon Name"
              fullWidth
              required
              value={iconName}
              onChange={(e) => {
                setIconName(e.target.value);
                if (iconError) setIconError(null);
              }}
              error={Boolean(iconError)}
              helperText={iconError ?? ' '}
            />
            <TextField
              label="Sort Order"
              type="number"
              fullWidth
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                if (sortOrderError) setSortOrderError(null);
              }}
              error={Boolean(sortOrderError)}
              helperText={sortOrderError ?? ' '}
            />
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
  );
}
