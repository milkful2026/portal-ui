import { CustomerErrorCode } from '../api/types';

/**
 * Human-readable fallback for a bulk-action per-row failure (FR-5) when
 * the server result doesn't carry its own `message` (MA-139 §7's sketch
 * only guarantees `errorCode`). Never shown as a bare error code — always
 * mapped to a sentence the admin can act on.
 */
export function customerBulkErrorMessage(errorCode: string | null | undefined): string {
  switch (errorCode) {
    case CustomerErrorCode.INVALID_STATUS_TRANSITION:
      return "This account's status already changed — refresh and try again.";
    case CustomerErrorCode.CUSTOMER_NOT_FOUND:
      return 'Customer account no longer exists.';
    case CustomerErrorCode.VALIDATION_ERROR:
      return 'Invalid request.';
    case CustomerErrorCode.FORBIDDEN:
      return 'Permission denied.';
    default:
      return 'Something went wrong.';
  }
}
