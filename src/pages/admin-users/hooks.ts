import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminUsersApi } from '../../api/client';
import { AdminUser, CreateAdminUserRequest, UpdateAdminUserRequest } from '../../api/types';

export const ADMIN_USERS_QUERY_KEY = ['admin-users'] as const;

export function useAdminUsersQuery() {
  return useQuery({
    queryKey: ADMIN_USERS_QUERY_KEY,
    queryFn: () => adminUsersApi.list().then((d) => d.items),
  });
}

export function useCreateAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAdminUserRequest) => adminUsersApi.create(payload),
    onSuccess: (created) => {
      // Row added immediately from the server's 201 response (FR-3 workflow),
      // rather than waiting on a full list refetch.
      queryClient.setQueryData<AdminUser[]>(ADMIN_USERS_QUERY_KEY, (prev) => (prev ? [...prev, created] : [created]));
    },
  });
}

export function useUpdateAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAdminUserRequest }) => adminUsersApi.update(id, payload),
    onSuccess: (updated) => {
      // §9: concurrent edits — always reconcile to the server's returned
      // state, never keep a locally-optimistic guess.
      queryClient.setQueryData<AdminUser[]>(ADMIN_USERS_QUERY_KEY, (prev) =>
        prev ? prev.map((a) => (a.id === updated.id ? updated : a)) : prev,
      );
    },
  });
}

export function useDeactivateAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.deactivate(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<AdminUser[]>(ADMIN_USERS_QUERY_KEY, (prev) =>
        prev ? prev.map((a) => (a.id === updated.id ? updated : a)) : prev,
      );
    },
  });
}

export function useReactivateAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.reactivate(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<AdminUser[]>(ADMIN_USERS_QUERY_KEY, (prev) =>
        prev ? prev.map((a) => (a.id === updated.id ? updated : a)) : prev,
      );
    },
  });
}
