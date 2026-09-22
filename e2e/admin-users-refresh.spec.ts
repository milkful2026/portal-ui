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
test('Admin Users list still loads after a full page refresh', async ({ page }) => {
  await loginAs(page, SUPER_ADMIN);
  await page.getByRole('link', { name: 'Admin Users' }).click();
  await expect(page.getByRole('heading', { name: 'Admin Users' })).toBeVisible();
  await expect(page.getByText('Something went wrong')).toHaveCount(0);

  await page.reload();

  await expect(page.getByRole('heading', { name: 'Admin Users' })).toBeVisible();
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
  // Confirms real data loaded, not just an empty/error-free shell.
  await expect(page.getByText(SUPER_ADMIN.email)).toBeVisible();
});
