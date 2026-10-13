import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useSnackbar } from 'notistack';
import { ApiError, CatalogErrorCode, CatalogProduct } from '../../api/types';
import {
  validateOptionalPriceField,
  validatePriceB2cField,
  validateRequiredTextField,
} from '../../utils/catalogValidation';
import { formatDateTime } from '../../utils/formatters';
import { logAdminAnalyticsEvent } from '../../utils/analytics';
import {
  useCategoriesQuery,
  useCatalogProductQuery,
  useProductAuditLogQuery,
  useUpdateProductMutation,
} from './hooks';
import ProductFormFields, { ProductFormErrors, ProductFormValues } from './ProductFormFields';
import CatalogStatusBadge from './CatalogStatusBadge';
import DeactivateProductDialog from './DeactivateProductDialog';

function toFormValues(product: CatalogProduct): ProductFormValues {
  return {
    name: product.name,
    categoryId: product.categoryId,
    unit: product.unit,
    description: product.description,
    priceB2c: String(product.price),
    priceB2b: product.priceB2b != null ? String(product.priceB2b) : '',
    hsnCode: product.hsnCode ?? '',
    taxRate: product.taxRate != null ? String(product.taxRate) : '',
    tag: product.tag ?? '',
    isVeg: product.isVeg,
    isOrganic: product.isOrganic,
    subscriptionEligible: product.subscriptionEligible,
    imageUrl: product.imageUrl ?? '',
  };
}

/** Builds only the fields that actually changed since the product was
 * loaded (section 9: "sending only changed fields") - comparing against
 * the same toFormValues() snapshot taken right after load/save, not a
 * running diff against every keystroke. */
function diffValues(original: ProductFormValues, current: ProductFormValues) {
  const changes: Record<string, unknown> = {};
  if (current.name !== original.name) changes.name = current.name.trim();
  if (current.categoryId !== original.categoryId) changes.categoryId = current.categoryId;
  if (current.unit !== original.unit) changes.unit = current.unit.trim();
  if (current.description !== original.description) changes.description = current.description.trim();
  if (current.priceB2c !== original.priceB2c) changes.priceB2c = Number(current.priceB2c);
  if (current.priceB2b !== original.priceB2b) {
    changes.priceB2b = current.priceB2b.trim() ? Number(current.priceB2b) : null;
  }
  if (current.hsnCode !== original.hsnCode) changes.hsnCode = current.hsnCode.trim() || null;
  if (current.taxRate !== original.taxRate) {
    changes.taxRate = current.taxRate.trim() ? Number(current.taxRate) : null;
  }
  if (current.tag !== original.tag) changes.tag = current.tag.trim() || null;
  if (current.isVeg !== original.isVeg) changes.isVeg = current.isVeg;
  if (current.isOrganic !== original.isOrganic) changes.isOrganic = current.isOrganic;
  if (current.subscriptionEligible !== original.subscriptionEligible) {
    changes.subscriptionEligible = current.subscriptionEligible;
  }
  if (current.imageUrl !== original.imageUrl) changes.imageUrl = current.imageUrl.trim() || null;
  return changes;
}

function renderDiffValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Product detail/edit view (FR-4): every create-form field, editable,
 * plus an Active toggle and an audit-trail table below it (newest-
 * first), reusing InventoryDetailPage's exact table shape including its
 * "Showing the most recent N of {total} entries" truncation notice. A
 * dedicated route (`/catalog/{productId}`), not a drawer, matching that
 * same full-route precedent.
 */
export default function CatalogDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { enqueueSnackbar } = useSnackbar();
  const { data: categories } = useCategoriesQuery();
  const { data: product, isLoading, isError, refetch } = useCatalogProductQuery(productId);
  const {
    data: auditLogResult,
    isLoading: auditLoading,
    isError: auditError,
    refetch: refetchAuditLog,
  } = useProductAuditLogQuery(productId);
  const auditLog = auditLogResult?.items;
  const updateMutation = useUpdateProductMutation();

  const [originalValues, setOriginalValues] = useState<ProductFormValues | null>(null);
  const [values, setValues] = useState<ProductFormValues | null>(null);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  // Re-seed local form state the first time a given product id's data
  // arrives - keyed on productId via this ref, NOT on `product` itself
  // (code review finding/regression fix): `product` gets a new object
  // identity every time useUpdateProductMutation's onSuccess calls
  // setQueryData, including the Active/Inactive toggle's own PATCH,
  // which has nothing to do with this form's fields. An effect keyed
  // directly on `product` re-fired on every such update and silently
  // wiped any unsaved Name/Price/etc. edit the admin had in progress
  // the moment they flipped the toggle. React Router also reuses this
  // same page instance across a `/catalog/:productId` -> another
  // product's detail navigation (no remount), so the ref must reset
  // per productId, not just run once ever.
  const initializedForProductId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (product && initializedForProductId.current !== productId) {
      const next = toFormValues(product);
      setOriginalValues(next);
      setValues(next);
      setReason('');
      setErrors({});
      setFormError(null);
      initializedForProductId.current = productId;
    }
  }, [product, productId]);

  function handleChange<K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) {
    setValues((prev) => (prev ? { ...prev, [field]: value } : prev));
    setErrors((prev) => ({ ...prev, [field]: null }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values || !originalValues || !product) return;
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

    const changes = diffValues(originalValues, values);
    if (Object.keys(changes).length === 0) {
      enqueueSnackbar('Nothing to save.', { variant: 'info' });
      return;
    }
    if (reason.trim()) {
      changes.reason = reason.trim();
    }

    try {
      const updated = await updateMutation.mutateAsync({ productId: product.id, payload: changes });
      logAdminAnalyticsEvent('catalog.product_updated', product.id);
      enqueueSnackbar(`Product ${updated.name} updated.`, { variant: 'success' });
      // Re-baseline against what was actually saved, so a *second* save
      // right after this one only diffs its own new edits - without
      // this, originalValues stays frozen at the page's initial load
      // and every subsequent save would redundantly resend (and
      // re-audit-log) every field this save already committed.
      const next = toFormValues(updated);
      setOriginalValues(next);
      setValues(next);
      setReason('');
    } catch (err) {
      if (err instanceof ApiError && err.code === CatalogErrorCode.CATEGORY_NOT_FOUND) {
        setErrors((prev) => ({ ...prev, categoryId: err.message }));
        return;
      }
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    }
  }

  async function handleReactivate() {
    if (!product) return;
    try {
      const updated = await updateMutation.mutateAsync({ productId: product.id, payload: { isActive: true } });
      logAdminAnalyticsEvent('catalog.product_updated', product.id, { isActive: true });
      enqueueSnackbar(`${updated.name} has been reactivated.`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : 'Something went wrong. Try again.', {
        variant: 'error',
      });
    }
  }

  return (
    <Box>
      <Button component={RouterLink} to="/catalog" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Back to Catalog
      </Button>

      {isLoading && (
        <Box role="status" aria-busy="true" sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress size={24} />
          <Typography>Loading product...</Typography>
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

      {!isLoading && !isError && !product && <Alert severity="info">Product not found.</Alert>}

      {!isLoading && !isError && product && values && (
        <>
          <Stack
            direction="row"
            sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}
          >
            <Typography variant="h1" component="h1">
              {product.name}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <CatalogStatusBadge isActive={product.isActive} />
              <FormControlLabel
                control={
                  <Switch
                    checked={product.isActive}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleReactivate();
                      } else {
                        setDeactivateOpen(true);
                      }
                    }}
                    disabled={updateMutation.isPending}
                  />
                }
                label="Active"
              />
            </Stack>
          </Stack>

          <Paper variant="outlined" sx={{ p: 3, maxWidth: 640, mb: 4 }}>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={3}>
                {formError && <Alert severity="error">{formError}</Alert>}
                <ProductFormFields
                  values={values}
                  errors={errors}
                  categories={categories ?? []}
                  disabled={updateMutation.isPending}
                  onChange={handleChange}
                  reason={reason}
                  onReasonChange={setReason}
                />
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
                  <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
                    Save
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Paper>

          <Typography variant="h3" sx={{ mb: 2 }}>
            Audit Trail
          </Typography>

          {auditLoading && (
            <Box role="status" aria-busy="true" sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Loading audit trail...</Typography>
            </Box>
          )}

          {auditError && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => refetchAuditLog()}>
                  Retry
                </Button>
              }
            >
              Couldn't load the audit trail. Try again.
            </Alert>
          )}

          {!auditLoading && !auditError && auditLog && auditLog.length === 0 && (
            <Alert severity="info">No changes recorded yet.</Alert>
          )}

          {!auditLoading && !auditError && auditLog && auditLog.length > 0 && (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table role="table" aria-label="Audit Trail">
                <TableHead>
                  <TableRow>
                    <TableCell component="th" scope="col">Action</TableCell>
                    <TableCell component="th" scope="col">Previous Value</TableCell>
                    <TableCell component="th" scope="col">New Value</TableCell>
                    <TableCell component="th" scope="col">Reason</TableCell>
                    <TableCell component="th" scope="col">Actor</TableCell>
                    <TableCell component="th" scope="col">Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLog.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.action === 'CREATE' ? 'Create' : 'Update'}</TableCell>
                      <TableCell>{renderDiffValue(entry.previousValue)}</TableCell>
                      <TableCell>{renderDiffValue(entry.newValue)}</TableCell>
                      <TableCell>{entry.reason ?? '—'}</TableCell>
                      <TableCell>{entry.adminId}</TableCell>
                      <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {!auditLoading &&
            !auditError &&
            auditLog &&
            auditLogResult &&
            auditLogResult.total > auditLog.length && (
              // getAuditLog() requests pageSize=500 - not true pagination -
              // this is the rare product whose history exceeds even that,
              // surfaced rather than silently shown as if complete. Same
              // pattern InventoryDetailPage's own truncation notice uses.
              <Alert severity="info" sx={{ mt: 1 }}>
                Showing the most recent {auditLog.length} of {auditLogResult.total} entries.
              </Alert>
            )}
        </>
      )}

      <DeactivateProductDialog
        open={deactivateOpen}
        product={product ?? null}
        onClose={() => setDeactivateOpen(false)}
      />
    </Box>
  );
}
