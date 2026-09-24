import { AdminRole } from '../api/types';

/** Builds an unsigned (mock-only) JWT with the shape the real Cognito-issued
 * token would have, for local dev/test against MSW. Never used against a
 * real backend.
 *
 * `email` is optional and deliberately omitted from the caller's admin
 * *access* token — verified against the real backend that Cognito access
 * tokens never carry an `email` claim (only ID tokens do; it's an
 * identity/profile claim, and access tokens are scoped to authorization
 * only). This mock previously always included it on both tokens it
 * built, which is exactly why "Welcome, undefined" (AuthContext deriving
 * `user` from the access token, which real Cognito never puts email on)
 * was never caught by any mocked test. */
export function buildMockJwt(params: { sub: string; email?: string; role: AdminRole; ttlSeconds?: number }): string {
  const header = { alg: 'none', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: params.sub,
    ...(params.email !== undefined ? { email: params.email } : {}),
    'cognito:groups': [params.role],
    iat: now,
    exp: now + (params.ttlSeconds ?? 60 * 60),
  };
  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode(header)}.${encode(payload)}.`;
}
