import { test, expect } from '@playwright/test';
import { loginAs, SUPER_ADMIN } from './helpers';

// Regression test for a real race condition: on a full page refresh (not
// client-side navigation after login), AuthContext's `initializing` and
// `accessToken` both resolve in the same commit that first unblocks
// RequireAuth's children — React fires a deeply-nested child's mount
// effect (e.g. useAdminUsersQuery's fetch-on-mount) before an ancestor's
// plain useEffect in that same commit, so the request could fire with no
// Authorization header at all. login->navigate (every other e2e test)
// never exercises this path since the token getter is already updated in
// an earlier, separate commit by the time the target page mounts.
//
// Asserts only the POSITIVE outcome (real data visible), not an absence
// of the error text via toHaveCount(0) — that negative assertion resolves
// as soon as its first poll finds zero matches, which is trivially true
// the instant the heading paints and the query is still in flight, before
// either the error or the data has actually rendered. A positive
// toBeVisible() wait is the only way this can meaningfully fail: if the
// request instead comes back unauthenticated, the success content this
// test waits for never appears at all, and the assertion times out.
// mocks/handlers.ts's admin-users routes must actually check for a Bearer
// token (see requireAuth()) for this to have any teeth — without that,
// even a request sent with no Authorization header still gets 200 back.
test('Admin Users list still loads after a full page refresh', async ({ page }) => {
  await loginAs(page, SUPER_ADMIN);
  await page.getByRole('link', { name: 'Admin Users' }).click();
  await expect(page.getByRole('heading', { name: 'Admin Users' })).toBeVisible();
  await expect(page.getByText(SUPER_ADMIN.email)).toBeVisible();

  await page.reload();

  await expect(page.getByRole('heading', { name: 'Admin Users' })).toBeVisible();
  await expect(page.getByText(SUPER_ADMIN.email)).toBeVisible();
});
