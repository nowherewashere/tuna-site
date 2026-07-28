// Which way the user last got in, so the login card can point at it ("в прошлый
// раз"). Purely a hint: it never gates anything, and a blocked/cleared storage just
// means no hint. Deliberately localStorage (survives the session) and NOT a cookie —
// it is of no interest to the backend.

const KEY = "last_auth_method";

export type AuthMethod = "email" | "telegram" | "google";

const METHODS: readonly string[] = ["email", "telegram", "google"];

export function readLastAuthMethod(): AuthMethod | null {
  try {
    const value = localStorage.getItem(KEY);
    return value && METHODS.includes(value) ? (value as AuthMethod) : null;
  } catch {
    return null;
  }
}

export function writeLastAuthMethod(method: AuthMethod): void {
  try {
    localStorage.setItem(KEY, method);
  } catch {
    /* storage blocked — the hint is optional */
  }
}
