import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

/** FR-2/NFR-Accessibility: active/inactive must not rely on color alone -
 * always paired with an icon + text label. Mirrors
 * InventoryStockStateBadge's exact pattern. */
export default function CatalogStatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Active" variant="outlined" />
  ) : (
    <Chip size="small" color="default" icon={<VisibilityOffIcon />} label="Inactive" variant="outlined" />
  );
}
