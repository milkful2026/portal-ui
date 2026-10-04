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
  | 'admin_user.session_ip_updated'
  | 'customer_account.suspended'
  | 'customer_account.deactivated'
  | 'customer_account.reactivated'
  | 'customer_account.bulk_status_changed'
  // MA-151 NFR-Observability: extends this same action-type union for
  // inventory.* events, same extension pattern MA-141 already used for
  // customer_account.* above - not a new logging mechanism.
  | 'inventory.adjusted'
  | 'inventory.received';

export interface AdminAnalyticsEvent {
  action: AdminAnalyticsAction;
  // Not always an admin's own id despite the historical field name below —
  // callers pass whatever this action's target is: an admin id
  // (admin_user.*), a customer id (customer_account.*), or a product id
  // (inventory.*). Named targetId, not targetAdminId, to stop implying a
  // type the field never actually guaranteed.
  targetId: string;
  timestamp: string;
  [key: string]: unknown;
}

/** Never include admin PII (email, IP ranges) — see NFR "Security" (§5). */
export function logAdminAnalyticsEvent(action: AdminAnalyticsAction, targetId: string, extra?: Record<string, unknown>): void {
  const event: AdminAnalyticsEvent = {
    action,
    targetId,
    timestamp: new Date().toISOString(),
    ...extra,
  };
  console.info('[analytics]', event);
}
