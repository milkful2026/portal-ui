import { FormEvent, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useSnackbar } from 'notistack';
import { ApiError, CatalogErrorCode } from '../../api/types';
import {
  validateOptionalPriceField,
  validatePriceB2cField,
  validateRequiredTextField,
} from '../../utils/catalogValidation';
import { logAdminAnalyticsEvent } from '../../utils/analytics';
import { useCategoriesQuery, useCreateProductMutation } from './hooks';
import ProductFormFields, { ProductFormErrors, ProductFormValues } from './ProductFormFields';

const EMPTY_VALUES: ProductFormValues = {
  name: '',
  categoryId: '',
  unit: '',
  description: '',
  priceB2c: '',
  priceB2b: '',
  hsnCode: '',
  taxRate: '',
  tag: '',
  isVeg: true,
  isOrganic: false,
  subscriptionEligible: false,
  imageUrl: '',
};

/**
 * Create-product page (FR-3). A dedicated route (`/catalog/new`), not a
 * dialog - spec section 11's own recommendation given the field count
 * (11 fields across pricing/tax/eligibility), the same full-route
 * precedent InventoryDetailPage/CatalogDetailPage already establish.
 */
export default function CatalogCreatePage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: categories } = useCategoriesQuery();
  const createMutation = useCreateProductMutation();

  const [values, setValues] = useState<ProductFormValues>(EMPTY_VALUES);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function handleChange<K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const nextErrors: ProductFormErrors = {
      name: validateRequiredTextField(values.name, 'Name'),
      categoryId: validateRequiredTextField(values.categoryId, 'Category'),
      unit: validateRequiredTextField(values.unit, 'Unit'),
      priceB2c: validatePriceB2cField(values.priceB2c),
      priceB2b: validateOptionalPriceField(values.priceB2b, 'Price (B2B)'),
      taxRate: validateOptionalPriceField(values.taxRate, 'Tax Rate'),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      const created = await createMutation.mutateAsync({
        categoryId: values.categoryId,
        name: values.name.trim(),
        description: values.description.trim(),
        unit: values.unit.trim(),
        priceB2c: Number(values.priceB2c),
        priceB2b: values.priceB2b.trim() ? Number(values.priceB2b) : null,
        hsnCode: values.hsnCode.trim() || null,
        taxRate: values.taxRate.trim() ? Number(values.taxRate) : null,
        tag: values.tag.trim() || null,
        subscriptionEligible: values.subscriptionEligible,
        isVeg: values.isVeg,
        isOrganic: values.isOrganic,
        imageUrl: values.imageUrl.trim() || null,
        reason: reason.trim() || undefined,
      });
      logAdminAnalyticsEvent('catalog.product_created', created.id);
      enqueueSnackbar(`Product ${created.name} created.`, { variant: 'success' });
      navigate(`/catalog/${created.id}`);
    } catch (err) {
      // Workflow (section 6): a 404 CATEGORY_NOT_FOUND is handled
      // defensively here (the category dropdown is populated from a live
      // query, so this shouldn't normally happen) exactly like any other
      // ApiError - inline, form stays populated so the admin doesn't
      // have to retype everything.
      if (err instanceof ApiError && err.code === CatalogErrorCode.CATEGORY_NOT_FOUND) {
        setErrors((prev) => ({ ...prev, categoryId: err.message }));
        return;
      }
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    }
  }

  return (
    <Box>
      <Button component={RouterLink} to="/catalog" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Back to Catalog
      </Button>

      <Typography variant="h1" component="h1" sx={{ mb: 3 }}>
        New Product
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 640 }}>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={3}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <ProductFormFields
              values={values}
              errors={errors}
              categories={categories ?? []}
              disabled={createMutation.isPending}
              onChange={handleChange}
              reason={reason}
              onReasonChange={setReason}
            />
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
              <Button component={RouterLink} to="/catalog" disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={createMutation.isPending}>
                Create
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
