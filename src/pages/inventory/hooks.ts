import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../../api/client';
import { AdjustInventoryRequest, ReceiveStockRequest, StockState } from '../../api/types';

// Namespaced under its own 'list' segment, distinct from
// inventoryDetailQueryKey/inventoryBatchesQueryKey/inventoryAuditLogQueryKey
// below - all four used to share a bare ['inventory'] prefix, which meant
// invalidating "the list" via a prefix match on ['inventory'] also matched
// every OTHER product's detail/batches/audit-log query (they all started
// with 'inventory' too), causing an adjust/receive on one product to
// invalidate every other product's cached data as a side effect.
export const INVENTORY_LIST_QUERY_KEY = ['inventory', 'list'] as const;
export const inventoryDetailQueryKey = (productId: string) => ['inventory', 'detail', productId] as const;
export const inventoryBatchesQueryKey = (productId: string) => ['inventory', 'batches', productId] as const;
export const inventoryAuditLogQueryKey = (productId: string) => ['inventory', 'audit-log', productId] as const;

/** FR-2/section 5: server-side filtering from day one - the stockState
 * filter is part of the query key (not applied client-side afterward) so
 * switching filters always re-queries the server, matching GET
 * /v1/inventory's own stockState query param (section 7) rather than the
 * client-side-first precedent MA-128's own list originally chose. */
export function useInventoryListQuery(stockState: StockState | 'All') {
  return useQuery({
    queryKey: [...INVENTORY_LIST_QUERY_KEY, stockState],
    queryFn: () => inventoryApi.list(stockState).then((d) => d.items),
  });
}

/** FR-3: aggregate on-hand/reserved/available/stockState for a single
 * product (MA-118's GET /v1/inventory/{productId}). */
export function useInventoryDetailQuery(productId: string | undefined) {
  return useQuery({
    queryKey: inventoryDetailQueryKey(productId ?? ''),
    queryFn: () => inventoryApi.getDetail(productId!),
    enabled: Boolean(productId),
  });
}

/** FR-3: batch/expiry table, oldest-expiry-first (the mock and the real
 * backend both sort server-side - see handlers.ts). */
export function useProductBatchesQuery(productId: string | undefined) {
  return useQuery({
    queryKey: inventoryBatchesQueryKey(productId ?? ''),
    queryFn: () => inventoryApi.getBatches(productId!).then((d) => d.items),
    enabled: Boolean(productId),
  });
}

/** FR-3: audit-trail table, newest-first. */
export function useInventoryAuditLogQuery(productId: string | undefined) {
  return useQuery({
    queryKey: inventoryAuditLogQueryKey(productId ?? ''),
    queryFn: () => inventoryApi.getAuditLog(productId!).then((d) => d.items),
    enabled: Boolean(productId),
  });
}

/** FR-4: PATCH /v1/inventory. Section 9's non-optimistic-on-conflict
 * principle (same as customer-accounts/hooks.ts's reconcileCustomerCache):
 * the detail cache is set directly to the server's returned entity
 * (never a locally-optimistic guess), the audit-log query is invalidated
 * (a new row now exists), and the list is invalidated broadly since we
 * can't cheaply patch every stockState-filtered list query's cache entry
 * in place. */
export function useAdjustStockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdjustInventoryRequest) => inventoryApi.adjust(payload),
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(inventoryDetailQueryKey(variables.productId), updated);
      queryClient.invalidateQueries({ queryKey: inventoryAuditLogQueryKey(variables.productId) });
      queryClient.invalidateQueries({ queryKey: INVENTORY_LIST_QUERY_KEY });
    },
  });
}

/** FR-5: POST /v1/inventory/receive. The response's own `stock` field
 * doesn't carry a `stockState`, so the detail cache is invalidated
 * (refetched) rather than patched in place - unlike Adjust's response,
 * which IS the full updated InventoryItem and can be set directly. The
 * new batch means the batches, audit-log and list queries all need a
 * refetch too (section 9's non-optimistic-on-conflict principle again). */
export function useReceiveStockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReceiveStockRequest) => inventoryApi.receive(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryDetailQueryKey(variables.productId) });
      queryClient.invalidateQueries({ queryKey: inventoryBatchesQueryKey(variables.productId) });
      queryClient.invalidateQueries({ queryKey: inventoryAuditLogQueryKey(variables.productId) });
      queryClient.invalidateQueries({ queryKey: INVENTORY_LIST_QUERY_KEY });
    },
  });
}