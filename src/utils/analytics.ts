/**
 * Structured client-side analytics events, per NFR "Observability" (§5):
 * "Every create/edit/deactivate action logs a structured client-side
 * analytics event (action name, target admin id, timestamp) in addition to
 * the server-side audit event from MA-129."
 *
 * No analytics vendor/pipeline is specified by this spec or MA-129, so this
 * is a thin, swappable logging seam (console today) rather than a wired-up
 * third-party SDK — noted as a resolved ambiguity.
 */

export type AdminAnalyticsAction =
  | 'admin_user.created'
  | 'admin_user.role_changed'
  | 'admin_user.deactivated'
  | 'admin_user.reactivated'
  | 'admin_user.session_ip_updated';

export interface AdminAnalyticsEvent {
  action: AdminAnalyticsAction;
  targetAdminId: string;
  timestamp: string;
  [key: string]: unknown;
}

/** Never include admin PII (email, IP ranges) — see NFR "Security" (§5). */
export function logAdminAnalyticsEvent(action: AdminAnalyticsAction, targetAdminId: string, extra?: Record<string, unknown>): void {
  const event: AdminAnalyticsEvent = {
    action,
    targetAdminId,
    timestamp: new Date().toISOString(),
    ...extra,
  };
  console.info('[analytics]', event);
}
