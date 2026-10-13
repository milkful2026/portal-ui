import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import { CatalogCategory } from '../../api/types';

export interface ProductFormValues {
  name: string;
  categoryId: string;
  unit: string;
  description: string;
  priceB2c: string;
  priceB2b: string;
  hsnCode: string;
  taxRate: string;
  tag: string;
  isVeg: boolean;
  isOrganic: boolean;
  subscriptionEligible: boolean;
  imageUrl: string;
}

export interface ProductFormErrors {
  name?: string | null;
  categoryId?: string | null;
  unit?: string | null;
  priceB2c?: string | null;
  priceB2b?: string | null;
  hsnCode?: string | null;
  taxRate?: string | null;
}

interface Props {
  values: ProductFormValues;
  errors: ProductFormErrors;
  categories: CatalogCategory[];
  disabled?: boolean;
  onChange: <K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) => void;
  /** Per-action justification for the audit trail (MA-156 FR-1/FR-2's
   * optional `reason`) - kept as its own prop, not a ProductFormValues
   * field, since it isn't a product attribute to seed from
   * toFormValues(product): it's scoped to *this* create/save action and
   * must reset to empty after each one, not persist across edits (code
   * review finding: this field was missing entirely, so every audit-log
   * entry created through this UI always showed a blank Reason). */
  reason: string;
  onReasonChange: (value: string) => void;
}

/**
 * The 11-field create/edit form (FR-3/FR-4), extracted into its own
 * component since CatalogCreatePage and CatalogDetailPage both render
 * the identical field set - avoids duplicating this much markup twice,
 * the way AdminFormDialog instead time-shares one component between
 * create/edit modes via a boolean (not applicable here, since this
 * spec's own section 11 recommends two distinct ROUTES, not one dialog,
 * given the field count).
 */
export default function ProductFormFields({
  values,
  errors,
  categories,
  disabled,
  onChange,
  reason,
  onReasonChange,
}: Props) {
  return (
    <Stack spacing={2}>
      <TextField
        label="Name"
        required
        fullWidth
        value={values.name}
        onChange={(e) => onChange('name', e.target.value)}
        error={Boolean(errors.name)}
        helperText={errors.name ?? ' '}
        disabled={disabled}
      />
      <TextField
        select
        label="Category"
        required
        fullWidth
        value={values.categoryId}
        onChange={(e) => onChange('categoryId', e.target.value)}
        error={Boolean(errors.categoryId)}
        helperText={errors.categoryId ?? ' '}
        disabled={disabled}
      >
        {categories.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Unit"
        required
        fullWidth
        placeholder="e.g. 1L Bottle"
        value={values.unit}
        onChange={(e) => onChange('unit', e.target.value)}
        error={Boolean(errors.unit)}
        helperText={errors.unit ?? ' '}
        disabled={disabled}
      />
      <TextField
        label="Description"
        fullWidth
        multiline
        minRows={2}
        value={values.description}
        onChange={(e) => onChange('description', e.target.value)}
        disabled={disabled}
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Price (B2C)"
            type="number"
            required
            fullWidth
            value={values.priceB2c}
            onChange={(e) => onChange('priceB2c', e.target.value)}
            error={Boolean(errors.priceB2c)}
            helperText={errors.priceB2c ?? ' '}
            disabled={disabled}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Price (B2B)"
            type="number"
            fullWidth
            placeholder="Optional"
            value={values.priceB2b}
            onChange={(e) => onChange('priceB2b', e.target.value)}
            error={Boolean(errors.priceB2b)}
            helperText={errors.priceB2b ?? 'Optional'}
            disabled={disabled}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="HSN Code"
            fullWidth
            placeholder="Optional"
            value={values.hsnCode}
            onChange={(e) => onChange('hsnCode', e.target.value)}
            disabled={disabled}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Tax Rate (%)"
            type="number"
            fullWidth
            placeholder="Optional"
            value={values.taxRate}
            onChange={(e) => onChange('taxRate', e.target.value)}
            error={Boolean(errors.taxRate)}
            helperText={errors.taxRate ?? 'Optional'}
            disabled={disabled}
          />
        </Grid>
      </Grid>
      <TextField
        label="Tag"
        fullWidth
        placeholder="e.g. New, Bestseller (optional)"
        value={values.tag}
        onChange={(e) => onChange('tag', e.target.value)}
        disabled={disabled}
      />
      <TextField
        label="Image URL"
        fullWidth
        placeholder="Optional - an already-hosted image URL"
        value={values.imageUrl}
        onChange={(e) => onChange('imageUrl', e.target.value)}
        disabled={disabled}
      />
      <TextField
        label="Reason"
        fullWidth
        multiline
        minRows={2}
        placeholder="Optional - shown in the product's audit trail"
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        disabled={disabled}
      />
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={values.isVeg}
              onChange={(e) => onChange('isVeg', e.target.checked)}
              disabled={disabled}
            />
          }
          label="Veg"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={values.isOrganic}
              onChange={(e) => onChange('isOrganic', e.target.checked)}
              disabled={disabled}
            />
          }
          label="Organic"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={values.subscriptionEligible}
              onChange={(e) => onChange('subscriptionEligible', e.target.checked)}
              disabled={disabled}
            />
          }
          label="Subscription Eligible"
        />
      </Stack>
    </Stack>
  );
}
