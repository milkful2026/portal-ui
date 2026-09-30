import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customerAccountsApi } from '../../api/client';
import {
  BulkCustomerStatusRequest,
  CustomerAccount,
  DeactivateCustomerRequest,
  ReactivateCustomerRequest,
  SuspendCustomerRequest,
} from '../../api/types';

export const CUSTOMER_ACCOUNTS_QUERY_KEY = ['customer-accounts'] as const;
export const customerDetailQueryKey = (id: string) => ['customer-accounts', id] as const;

export function useCustomerAccountsQuery() {
  return useQuery({
    queryKey: CUSTOMER_ACCOUNTS_QUERY_KEY,
    queryFn: () => customerAccountsApi.list().then((d) => d.items),
  });
}

export function useCustomerDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: customerDetailQueryKey(id ?? ''),
    queryFn: () => customerAccountsApi.get(id!),
    enabled: Boolean(id),
  });
}

/** §9: concurrent edits / conflicting actions — always reconcile the list
 * cache to the server's returned state, never keep a locally-optimistic
 * guess (same non-optimistic-on-conflict principle as MA-128 §9). Also
 * invalidates the detail query so a re-visit of /customer-accounts/{id}
 * doesn't show stale status/history. */
function reconcileCustomerCache(
  queryClient: ReturnType<typeof useQueryClient>,
  updated: CustomerAccount,
) {
  queryClient.setQueryData<CustomerAccount[]>(CUSTOMER_ACCOUNTS_QUERY_KEY, (prev) =>
    prev ? prev.map((c) => (c.id === updated.id ? updated : c)) : prev,
  );
  queryClient.invalidateQueries({ queryKey: customerDetailQueryKey(updated.id) });
}

export function useSuspendCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SuspendCustomerRequest }) =>
      customerAccountsApi.suspend(id, payload),
    onSuccess: (updated) => reconcileCustomerCache(queryClient, updated),
  });
}

export function useDeactivateCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DeactivateCustomerRequest }) =>
      customerAccountsApi.deactivate(id, payload),
    onSuccess: (updated) => reconcileCustomerCache(queryClient, updated),
  });
}

export function useReactivateCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReactivateCustomerRequest }) =>
      customerAccountsApi.reactivate(id, payload),
    onSuccess: (updated) => reconcileCustomerCache(queryClient, updated),
  });
}

export function useBulkCustomerStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkCustomerStatusRequest) => customerAccountsApi.bulkStatus(payload),
    onSuccess: () => {
      // The response is a per-row result array, not full updated entities
      // (§7) — refetch rather than guess each row's new state, consistent
      // with §9's non-optimistic principle applied to the bulk case.
      queryClient.invalidateQueries({ queryKey: CUSTOMER_ACCOUNTS_QUERY_KEY });
    },
  });
}
