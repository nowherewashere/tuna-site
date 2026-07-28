"use client";

import BrandIcon from "@/components/BrandIcon";
import { Button } from "@/components/ui";
import {
  OAUTH_PROVIDER_LABEL,
  renderableProviders,
  type OAuthProvider,
} from "@/lib/oauth";

/**
 * One button per enabled social provider.
 *
 * `providers` comes from /config, so the server decides what exists; this component
 * only decides the order and drops anything it has no mark or label for. With the
 * feature off the list is empty and nothing renders — that is how it ships dark.
 */
export default function OAuthButtons({
  providers,
  busy = null,
  lastUsed = null,
  onStart,
}: {
  providers: string[];
  /** Provider whose redirect is in flight. */
  busy?: string | null;
  /** Provider the user signed in with last time — hinted, never auto-submitted. */
  lastUsed?: string | null;
  onStart: (provider: OAuthProvider) => void;
}) {
  const known = renderableProviders(providers);
  if (known.length === 0) return null;

  return (
    <div className="auth-oauth">
      {known.map((provider) => (
        <div className="auth-oauth-item" key={provider}>
          <Button
            variant="ghost"
            size="lg"
            full
            className={`btn-oauth btn-oauth-${provider}`}
            iconLeft={<BrandIcon name={provider} />}
            loading={busy === provider}
            loadingLabel="Открываем…"
            disabled={busy !== null && busy !== provider}
            onClick={() => onStart(provider)}
          >
            Войти через {OAUTH_PROVIDER_LABEL[provider]}
          </Button>
          {/* Below the button, not inside it: as a pill next to the label it pushed the
              row past the 440px card and wrapped "Войти через Google" onto three lines,
              and it ran into the accessible name ("Googleв прошлый раз"). This also
              matches how the Telegram row states the same thing. */}
          {lastUsed === provider && (
            <p className="auth-last-note">
              В прошлый раз ты входил через {OAUTH_PROVIDER_LABEL[provider]}.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
