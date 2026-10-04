/** Shared null-safe date formatters for admin detail-page tables
 * (CustomerDetailPage's status-history table, InventoryDetailPage's batch
 * and audit-trail tables). Previously duplicated per-page with a drifted
 * null placeholder ('-' vs '—'); extracted here so both stay in sync. */

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}
