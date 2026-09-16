/**
 * CIDR validation for the IP Allowlist field (FR-5).
 *
 * Accepts a comma-separated list of IPv4 CIDR ranges (e.g. "10.0.0.0/8, 192.168.1.0/24").
 * An empty/blank input is valid — it means "no IP restriction" per FR-5.
 */

const OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4 = `${OCTET}\\.${OCTET}\\.${OCTET}\\.${OCTET}`;
const CIDR_RE = new RegExp(`^${IPV4}\\/(3[0-2]|[12]?\\d)$`);

export function isValidCidr(entry: string): boolean {
  return CIDR_RE.test(entry.trim());
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
