import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogApi } from '../../api/client';
import {
  CreateCatalogCategoryRequest,
  CreateCatalogProductRequest,
  UpdateCatalogCategoryRequest,
  UpdateCatalogProductRequest,
} from '../../api/types';

// Namespaced the same way pages/inventory/hooks.ts's own query keys are -
// a separate 'list'/'detail'/'audit-log' segment per concern so
// invalidating one product's data never also invalidates every other
// product's cached detail/audit-log query (same bug class that file's
// own module docstring documents fixing).
export const CATALOG_LIST_QUERY_KEY = ['catalog', 'list'] as const;
export const CATALOG_CATEGORIES_QUERY_KEY = ['catalog', 'categories'] as const;
export const catalogDetailQueryKey = (productId: string) => ['catalog', 'detail', productId] as const;
export const catalogAuditLogQueryKey = (productId: string) => ['catalog', 'audit-log', productId] as const;

export interface CatalogListFilters {
  categoryId?: string;
  isActive?: boolean;
}

/** FR-2/section 5: server-side filtering from day one - GET
 * /admin/products already supports categoryId/isActive server-side
 * (same precedent as Inventory's own list), so both filters are part of
 * the query key rather than applied client-side afterward. Exposes
 * `total` alongside `items` (code review fix) - catalogApi.listAdmin
 * requests pageSize=500, not the backend's default 50, but a catalog
 * that somehow still exceeds that needs a truncation notice, the same
 * safeguard CatalogDetailPage's audit-log view already has, rather than
 * silently showing an incomplete list with no indication. */
export function useCatalogListQuery(filters: CatalogListFilters) {
  return useQuery({
    queryKey: [...CATALOG_LIST_QUERY_KEY, filters.categoryId ?? null, filters.isActive ?? null],
    queryFn: () => catalogApi.listAdmin(filters.categoryId, filters.isActive),
    select: (d) => ({ items: d.items, total: d.total }),
  });
}

/** FR-3: category dropdown source. Rarely changes within a session, so a
 * longer staleTime avoids a redundant refetch every time the create-
 * product form mounts. */
export function useCategoriesQuery() {
  return useQuery({
    queryKey: CATALOG_CATEGORIES_QUERY_KEY,
    queryFn: () => catalogApi.listCategories(),
    staleTime: 60_000,
  });
}

/** FR-4: full product detail for the edit form - GET /admin/products'
 * list row doesn't carry every field this page needs (see api/types.ts's
 * own module docstring), so this is a separate call, not a cache lookup
 * into the list query's data. */
export function useCatalogProductQuery(productId: string | undefined) {
  return useQuery({
    queryKey: catalogDetailQueryKey(productId ?? ''),
    queryFn: () => catalogApi.getProduct(productId!),
    enabled: Boolean(productId),
  });
}

/** FR-4: audit-trail table, newest-first. Exposes `total` alongside
 * `items` (not just the array) so the page can tell a fully-loaded
 * product apart from one whose history exceeds getAuditLog's own
 * pageSize=500 cap - same reasoning as useInventoryAuditLogQuery. */
export function useProductAuditLogQuery(productId: string | undefined) {
  return useQuery({
    queryKey: catalogAuditLogQueryKey(productId ?? ''),
    queryFn: () => catalogApi.getAuditLog(productId!),
    select: (d) => ({ items: d.items, total: d.total }),
    enabled: Boolean(productId),
  });
}

/** FR-3: POST /products. Section 9's non-optimistic-on-conflict
 * principle (same as every prior admin spec): the list is invalidated
 * (broadly, since a new row could match any active filter combination)
 * rather than patched in place. */
export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCatalogProductRequest) => catalogApi.createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATALOG_LIST_QUERY_KEY });
    },
  });
}

/** FR-4: PATCH /products/{id}. The detail cache is set directly to the
 * server's returned entity (never a locally-optimistic guess, same
 * principle as useAdjustStockMutation), the audit-log query is
 * invalidated (a new row now exists whenever a field actually changed),
 * and the list is invalidated broadly since an isActive/categoryId
 * change can move this row in or out of any filtered list view. */
export function useUpdateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: UpdateCatalogProductRequest }) =>
      catalogApi.updateProduct(productId, payload),
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(catalogDetailQueryKey(variables.productId), updated);
      queryClient.invalidateQueries({ queryKey: catalogAuditLogQueryKey(variables.productId) });
      queryClient.invalidateQueries({ queryKey: CATALOG_LIST_QUERY_KEY });
    },
  });
}

/** FR-5: POST /categories. */
export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCatalogCategoryRequest) => catalogApi.createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATALOG_CATEGORIES_QUERY_KEY });
    },
  });
}

/** FR-5: PATCH /categories/{id}. */
export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, payload }: { categoryId: string; payload: UpdateCatalogCategoryRequest }) =>
      catalogApi.updateCategory(categoryId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATALOG_CATEGORIES_QUERY_KEY });
    },
  });
}
