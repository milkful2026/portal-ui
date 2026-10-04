import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../api/client';
import { StockState } from '../../api/types';

export const INVENTORY_QUERY_KEY = ['inventory'] as const;

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