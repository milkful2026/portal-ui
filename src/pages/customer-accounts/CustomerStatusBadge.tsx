import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import BlockIcon from '@mui/icons-material/Block';
import { CustomerStatus } from '../../api/types';

/** §10c/NFR-Accessibility: status must not rely on color alone — always
 * paired with an icon + text label. Mirrors admin-users/StatusBadge's
 * exact pattern, as its own component (not reused directly) since it's
 * typed to CustomerStatus, a distinct three-value status from AdminStatus. */
export default function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  switch (status) {
    case 'Active':
      return <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Active" variant="outlined" />;
    case 'Suspended':
      return <Chip size="small" color="warning" icon={<PauseCircleIcon />} label="Suspended" variant="outlined" />;
    case 'Deactivated':
      return <Chip size="small" color="default" icon={<BlockIcon />} label="Deactivated" variant="outlined" />;
  }
}
