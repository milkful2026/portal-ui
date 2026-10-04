import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../../api/client';
import { AdjustInventoryRequest, StockState } from '../../api/types';

export const INVENTORY_QUERY_KEY = ['inventory'] as const;
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
    queryKey: [...INVENTORY_QUERY_KEY, stockState],
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
    queryFn: () => inventoryApi.getBatches(productId!).then((d) => d.batches),
    enabled: Boolean(productId),
  });
}

/** FR-3: audit-trail table, newest-first. */
export function useInventoryAuditLogQuery(productId: string | undefined) {
  return useQuery({
    queryKey: inventoryAuditLogQueryKey(productId ?? ''),
    queryFn: () => inventoryApi.getAuditLog(productId!).then((d) => d.entries),
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
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
    },
  });
}