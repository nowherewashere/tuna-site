// Social sign-in is a browser redirect, not an API call: the client secret lives on
// the backend, so the whole exchange runs there and the browser only follows 302s.

const BASE = "/api/v1/public";

export type OAuthProvider = "google";

// Display order on the login card. A provider the backend reports but we don't know
// about here is simply not rendered, so a backend ahead of the frontend degrades
// quietly instead of drawing an unlabelled button.
export const OAUTH_PROVIDER_ORDER: readonly OAuthProvider[] = ["google"];

export const OAUTH_PROVIDER_LABEL: Record<OAuthProvider, string> = {
  google: "Google",
};

export function isKnownProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDER_ORDER as readonly string[]).includes(value);
}

/**
 * The providers we can actually draw, in display order.
 *
 * The backend may enable one before the frontend ships its mark and label; those are
 * dropped here, so callers can gate on what will really render instead of on the raw
 * list (otherwise the card can show a lone "или по почте" divider with nothing above).
 */
export function renderableProviders(providers: string[]): OAuthProvider[] {
  return OAUTH_PROVIDER_ORDER.filter((p) => providers.includes(p));
}

/**
 * Leave the SPA for the provider's consent screen.
 *
 * MUST be a real navigation. A `fetch` would follow the 302 to the provider inside
 * XHR and land nowhere — the user has to physically end up on the provider's page.
 */
export function startOAuth(provider: OAuthProvider, opts: { link?: boolean; ref?: string } = {}) {
  const path = opts.link ? `/auth/oauth/${provider}/link/start` : `/auth/oauth/${provider}/start`;
  const query = opts.ref && !opts.link ? `?ref=${encodeURIComponent(opts.ref)}` : "";
  window.location.assign(`${BASE}${path}${query}`);
}

// Failure codes the backend puts in the callback redirect. The set is closed on both
// sides — anything unrecognised falls through to the generic line.
const ERROR_RU: Record<string, string> = {
  access_denied: "Вход отменён.",
  email_unverified:
    "Google не подтвердил, что эта почта твоя. Войди по коду на почту — а потом привяжешь Google в кабинете одним нажатием.",
  blocked: "Аккаунт заблокирован — напиши в поддержку.",
  already_linked_other:
    "К аккаунту уже привязан другой профиль этого сервиса. Сначала отвяжи его.",
  two_active_subscriptions:
    "У обоих аккаунтов активная подписка — напиши в поддержку, объединим вручную.",
  two_telegram_accounts:
    "К этому аккаунту привязан другой Telegram — напиши в поддержку, объединим вручную.",
  last_sign_in_method: "Это твой единственный способ входа — сначала добавь почту или Telegram.",
  state_invalid: "Ссылка входа устарела. Попробуй ещё раз.",
  rate_limited: "Слишком много попыток. Подожди немного.",
  disabled: "Этот способ входа сейчас недоступен.",
};

export function oauthErrorMessage(code: string | null): string {
  return (
    (code && ERROR_RU[code]) || "Не удалось войти. Попробуй ещё раз или войди по почте."
  );
}

/**
 * True when we are probably inside an app's embedded browser.
 *
 * Google refuses OAuth from in-app WebViews (`disallowed_useragent`) — including
 * Telegram's, which for a VPN sold through a Telegram bot is a real slice of traffic.
 * That error is shown on Google's own page and never redirects back, so there is no
 * server-side fix; the only useful move is to warn before the user leaves.
 *
 * Detection is inherently approximate. A false positive costs one line of hint text
 * with the email form right below it, so it errs toward warning.
 */
export function isEmbeddedBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  if ("TelegramWebviewProxy" in w || "TelegramWebviewProxyProto" in w) return true;
  return /(FBAN|FBAV|Instagram|Line\/|MicroMessenger|VKAndroidApp)/i.test(navigator.userAgent);
}
