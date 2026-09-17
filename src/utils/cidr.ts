/**
 * CIDR validation for the IP Allowlist field (FR-5).
 *
 * Accepts a comma-separated list of IPv4 OR IPv6 CIDR ranges (e.g.
 * "10.0.0.0/8, 2001:db8::/32"). An empty/blank input is valid — it
 * means "no IP restriction" per FR-5.
 *
 * The backend validates/enforces with Python's `ipaddress.ip_network`
 * (user_service.py's `validate_cidr_list`, and the authorizer's
 * runtime membership check), which accepts IPv6 natively — this was
 * previously IPv4-only, silently rejecting a value the backend would
 * accept, with no indication to the admin that IPv6 was ever an
 * option. Final validation authority is still the backend; this only
 * needs to not be a narrower grammar than what it actually accepts.
 */

const OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4 = `${OCTET}\\.${OCTET}\\.${OCTET}\\.${OCTET}`;
const IPV4_PREFIX = '(3[0-2]|[12]?\\d)';
const IPV4_CIDR_RE = new RegExp(`^${IPV4}\\/${IPV4_PREFIX}$`);

const H16 = '[0-9a-fA-F]{1,4}';
const IPV4_TAIL = `(${IPV4})`;
// Standard 9-alternative IPv6 address grammar (covers full, `::`-compressed,
// and IPv4-mapped/embedded forms) — the same shape used by most IPv6
// validation libraries, since the format has no simpler equivalent regex.
const IPV6 = [
  `(${H16}:){7}${H16}`,
  `(${H16}:){1,7}:`,
  `(${H16}:){1,6}:${H16}`,
  `(${H16}:){1,5}(:${H16}){1,2}`,
  `(${H16}:){1,4}(:${H16}){1,3}`,
  `(${H16}:){1,3}(:${H16}){1,4}`,
  `(${H16}:){1,2}(:${H16}){1,5}`,
  `${H16}:((:${H16}){1,6})`,
  `:((:${H16}){1,7}|:)`,
  `(${H16}:){1,4}:${IPV4_TAIL}`,
  `::(ffff(:0{1,4})?:)?${IPV4_TAIL}`,
].join('|');
const IPV6_PREFIX = '(12[0-8]|1[01]\\d|[1-9]?\\d)';
const IPV6_CIDR_RE = new RegExp(`^(${IPV6})\\/${IPV6_PREFIX}$`);

export function isValidCidr(entry: string): boolean {
  const trimmed = entry.trim();
  return IPV4_CIDR_RE.test(trimmed) || IPV6_CIDR_RE.test(trimmed);
}

export interface CidrParseResult {
  valid: string[];
  invalid: string[];
}

/** Parses a comma-separated CIDR list, trimming whitespace and dropping empty entries. */
export function parseCidrList(input: string): CidrParseResult {
  const entries = input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const valid: string[] = [];
  const invalid: string[] = [];
  for (const entry of entries) {
    if (isValidCidr(entry)) {
      valid.push(entry);
    } else {
      invalid.push(entry);
    }
  }
  return { valid, invalid };
}

/** Returns an inline validation error message, or null if the field is valid. */
export function validateCidrField(input: string): string | null {
  if (input.trim().length === 0) {
    return null;
  }
  const { invalid } = parseCidrList(input);
  if (invalid.length > 0) {
    return `Invalid CIDR range: ${invalid.join(', ')}`;
  }
  return null;
}
