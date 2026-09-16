import { AdminRole } from '../api/types';

/** Builds an unsigned (mock-only) JWT with the shape the real Cognito-issued
 * token would have, for local dev/test against MSW. Never used against a
 * real backend. */
export function buildMockJwt(params: { sub: string; email: string; role: AdminRole; ttlSeconds?: number }): string {
  const header = { alg: 'none', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: params.sub,
    email: params.email,
    'cognito:groups': [params.role],
    iat: now,
    exp: now + (params.ttlSeconds ?? 60 * 60),
  };
  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode(header)}.${encode(payload)}.`;
}
