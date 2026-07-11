/**
 * Pragmatic client-side email check for gating the passwordless send button so a
 * typo gets caught before a round-trip / Turnstile solve. Deliberately RFC-lite:
 * the backend validates authoritatively (422), this only spares the obvious "asdf".
 * One non-space run, an @, one non-space run, a dot, one more non-space run.
 */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
