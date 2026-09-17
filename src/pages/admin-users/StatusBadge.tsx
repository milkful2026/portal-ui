import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BlockIcon from '@mui/icons-material/Block';
import { AdminStatus } from '../../api/types';

/** §10c: status must not rely on color alone — always paired with an icon + text label. */
export default function StatusBadge({ status }: { status: AdminStatus }) {
  switch (status) {
    case 'Active':
      return <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Active" variant="outlined" />;
    case 'Pending':
      return <Chip size="small" color="warning" icon={<ScheduleIcon />} label="Pending" variant="outlined" />;
    case 'Deactivated':
      return <Chip size="small" color="default" icon={<BlockIcon />} label="Deactivated" variant="outlined" />;
  }
}
