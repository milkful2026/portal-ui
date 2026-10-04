import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { StockState } from '../../api/types';

const LABELS: Record<StockState, string> = {
  IN_STOCK: 'In Stock',
  OUT_OF_STOCK: 'Out of Stock',
  AVAILABLE_FROM: 'Available From',
};

/** FR-2/NFR-Accessibility: stock-state must not rely on color alone -
 * always paired with an icon + text label. Mirrors CustomerStatusBadge's
 * exact pattern, as its own component (not reused directly) since it's
 * typed to StockState, a distinct three-value status from CustomerStatus. */
export default function InventoryStockStateBadge({ state }: { state: StockState }) {
  switch (state) {
    case 'IN_STOCK':
      return <Chip size="small" color="success" icon={<CheckCircleIcon />} label={LABELS.IN_STOCK} variant="outlined" />;
    case 'OUT_OF_STOCK':
      return <Chip size="small" color="error" icon={<ErrorIcon />} label={LABELS.OUT_OF_STOCK} variant="outlined" />;
    case 'AVAILABLE_FROM':
      return <Chip size="small" color="warning" icon={<ScheduleIcon />} label={LABELS.AVAILABLE_FROM} variant="outlined" />;
  }
}