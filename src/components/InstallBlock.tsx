"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useOnboarding } from "@/lib/useOnboarding";
import { useCopyToClipboard } from "@/lib/useCopyToClipboard";
import { openStoreWithFallback } from "@/lib/appStore";
import Icon, { type IconName } from "@/components/Icon";
import { Button } from "@/components/ui";

/**
 * The single install UI used by both onboarding (connect) and the cabinet, so they
 * never drift. Wording mirrors the Telegram bot's onboarding (assets/translations/ru/
 * onboarding.ftl); all Happ links come from the bot's OnboardingConfig via
 * `/api/v1/public/onboarding/config` — nothing but the step copy is hardcoded here.
 */

const PLATFORMS: { id: string; label: string; icon: IconName }[] = [
  { id: "ios", label: "iPhone / Mac", icon: "apple" },
  { id: "android", label: "Android", icon: "android" },
  { id: "windows", label: "Windows", icon: "windows" },
  { id: "linux", label: "Linux", icon: "linux" },
  { id: "apple_tv", label: "Apple TV", icon: "tv" },
  { id: "android_tv", label: "Android TV / Google TV", icon: "tv" },
];

type PlatformId = "ios" | "android" | "windows" | "linux" | "apple_tv" | "android_tv";
type TvPlatform = "apple_tv" | "android_tv";
type StorePlatform = "ios" | "android" | "windows" | "linux";

// TV can't take a subscription link directly — it's carried over from the phone.
// These two guides are the bot's Apple TV / Android TV instructions, verbatim.
const TV_GUIDES: Record<TvPlatform, ReactNode[]> = {
  apple_tv: [
    <p key="1">
      <b>Установи Happ</b> на Apple TV из App Store.
    </p>,
    <p key="2">
      <b>Запусти Happ</b> на ТВ — откроется экран импорта.
    </p>,
    <div key="3">
      <p>
        <b>Перенеси подписку</b> с телефона одним из способов:
      </p>
      <ul>
        <li>
          <b>По Wi-Fi:</b> открой Happ на телефоне в той же сети и отсканируй QR-код с экрана
          ТВ → выбери подписку → подтверди.
        </li>
        <li>
          <b>Веб-импорт:</b> на ТВ выбери «Web Import», зайди на <b>tv.happ.su</b>, введи код с
          экрана, вставь свою ссылку и нажми «Отправить».
        </li>
      </ul>
    </div>,
    <p key="4">
      <b>Готово</b> — список серверов появится на главном экране.
    </p>,
  ],
  android_tv: [
    <p key="1">
      <b>Установи Happ</b> на ТВ из Google Play (или APK).
    </p>,
    <p key="2">
      <b>Запусти Happ</b> на ТВ — он предложит добавить подписку по локальной сети через QR.
    </p>,
    <p key="3">
      <b>Отсканируй QR-код</b> приложением Happ на телефоне — подписка перенесётся на ТВ.
    </p>,
  ],
};

export function detectPlatform(): PlatformId {
  if (typeof navigator === "undefined") return "ios";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android"; // must precede linux/mac — Android UA contains "Linux"
  if (/macintosh|mac os/.test(ua)) return "ios"; // Mac shares the iOS App Store listing
  if (/windows/.test(ua)) return "windows";
  if (/linux/.test(ua)) return "linux";
  return "ios";
}

/**
 * Custom platform picker (button + styled listbox). Replaces the former native
 * <select>: its OS popup can't be themed at all, and only the inner select box
 * was clickable — the padded label around it just selected text. The whole
 * field is now one real <button>, and the open list is ours to style.
 * Keyboard: Arrow/Home/End move between options, Enter/Space picks, Esc and
 * outside click close (focus returns to the trigger).
 */
function PlatformPicker({
  platform,
  onPick,
}: {
  platform: PlatformId;
  onPick: (id: PlatformId) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selected = PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[0];

  // Close on any press outside the picker.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Opening moves focus into the list, onto the current platform.
  useEffect(() => {
    if (!open) return;
    const el =
      listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]') ??
      (listRef.current?.firstElementChild as HTMLElement | null);
    el?.focus();
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus();
  };
  const pick = (id: PlatformId) => {
    onPick(id);
    close(true);
  };

  const onListKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const opts = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [],
    );
    const cur = opts.indexOf(document.activeElement as HTMLElement);
    const move = (i: number) => {
      e.preventDefault();
      opts[i]?.focus();
    };
    if (e.key === "ArrowDown" || e.key === "ArrowRight") move((cur + 1) % opts.length);
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") move((cur - 1 + opts.length) % opts.length);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(opts.length - 1);
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const id = (document.activeElement as HTMLElement | null)?.dataset.id;
      if (id) pick(id as PlatformId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") close(false);
  };

  return (
    <div className={`plat-select${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        ref={btnRef}
        className="plat-field"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Устройство: ${selected.label}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            setOpen(true);
          } else if (open && e.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        <span className="plat-field-ic" aria-hidden="true">
          <Icon name={selected.icon} size={18} />
        </span>
        <span className="plat-field-label">{selected.label}</span>
        <span className="plat-field-chevron" aria-hidden="true">
          <Icon name="chevron" size={16} />
        </span>
      </button>
      {open && (
        <ul
          className="plat-pop"
          role="listbox"
          aria-label="Устройство"
          ref={listRef}
          onKeyDown={onListKeyDown}
        >
          {PLATFORMS.map((p) => (
            <li
              key={p.id}
              role="option"
              aria-selected={p.id === platform}
              tabIndex={-1}
              data-id={p.id}
              className="plat-opt"
              onClick={() => pick(p.id as PlatformId)}
            >
              <span className="plat-opt-ic" aria-hidden="true">
                <Icon name={p.icon} size={17} />
              </span>
              {p.label}
              {p.id === platform && (
                <span className="plat-opt-check" aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SubCopyRow({ subUrl, label }: { subUrl: string; label?: string }) {
  const { copied, copy } = useCopyToClipboard();
  return (
    <>
      {label && <p className="copy-hint">{label}</p>}
      <div className="copy-link" style={{ marginTop: label ? 6 : 10 }}>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {subUrl || "—"}
        </span>
        <span
          className="amber"
          onClick={() => {
            if (!subUrl) return;
            copy(subUrl);
          }}
        >
          {copied ? (
            <>
              скопировано <Icon name="check" size={13} style={{ verticalAlign: "-2px" }} />
            </>
          ) : (
            "копировать"
          )}
        </span>
      </div>
    </>
  );
}

export default function InstallBlock({ subUrl }: { subUrl: string }) {
  const cfg = useOnboarding();
  // Auto-detected platform, read on the client only: the server and first client
  // render both yield "ios" so the SSG markup matches (no hydration flash), then it
  // resolves to the real platform. A manual pick (below) overrides it.
  const detected = useSyncExternalStore(() => () => {}, detectPlatform, () => "ios" as PlatformId);
  const [override, setOverride] = useState<PlatformId | null>(null);
  const platform = override ?? detected;

  const deepLink = useMemo(
    () => (cfg && subUrl ? cfg.happ_import_template.replace("{sub_url}", subUrl) : ""),
    [cfg, subUrl],
  );
  // INCY import deeplink — only surfaced on Apple, where INCY is offered as the
  // alternative client (see the two-app store buttons + the Apple-only copy below).
  const incyDeepLink = useMemo(
    () => (cfg && subUrl ? cfg.incy_import_template.replace("{sub_url}", subUrl) : ""),
    [cfg, subUrl],
  );

  const isApple = platform === "ios";
  const isTv = platform === "apple_tv" || platform === "android_tv";
  const storeUrl = cfg && !isTv ? cfg.store_links[platform as StorePlatform] : "";

  // On a real iPhone/Mac/Android the platform store app is guaranteed, so the
  // download buttons first try its deep link (itms-apps:/market:), falling back
  // to the https listing. Gated by the *detected* device, not the manual pick —
  // a Windows user browsing the iOS links must keep plain https.
  const nativeStore = detected === "ios" || detected === "android";

  const tvKey: TvPlatform = platform === "apple_tv" ? "apple_tv" : "android_tv";
  const faqUrl = cfg ? cfg.tv.faq[tvKey] : "";

  return (
    <div className="install-block">
      <PlatformPicker platform={platform} onPick={setOverride} />

      {isTv ? (
        <>
          <p className="install-lead">
            На ТВ нельзя добавить подписку ссылкой — её переносят с телефона. Делается так:
          </p>
          {TV_GUIDES[tvKey].map((body, i) => (
            <div className="istep" key={i}>
              <div className="istep-n">{i + 1}</div>
              <div className="istep-body">{body}</div>
            </div>
          ))}
          <div className="install-footer">
            <p className="install-note">
              <b>Важно:</b> если по Wi-Fi не вышло — выбери «Web Import», зайди на tv.happ.su,
              введи код и вставь свою ссылку.
            </p>
            <SubCopyRow subUrl={subUrl} label="Ссылка для веб-импорта (нажми, чтобы скопировать):" />
            <Button
              href={faqUrl}
              variant="ghost"
              loading={!cfg}
              iconLeft={<Icon name="file" size={17} />}
              style={{ marginTop: 12 }}
              target="_blank"
              rel="noreferrer"
            >
              Инструкция со скриншотами
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="istep">
            <div className="istep-n">1</div>
            <div className="istep-body">
              <h4>Установи Happ{isApple ? " / INCY" : ""}</h4>
              <p>
                {isApple
                  ? "Приложения, через которые работает VPN."
                  : "Приложение, через которое работает VPN."}
              </p>
              {isApple && <p>Happ может быть недоступен для российского региона AppStore.</p>}
              {/* iOS offers two apps: Happ from the global App Store, and Incy — an
                  alternative client — for RU, where Happ's listing is geo-blocked.
                  Each button is labelled by its app; the region (вне РФ / в РФ) is a
                  caption underneath. Everyone else: a single content-width "Скачать Happ". */}
              <div className="install-actions">
                {isApple && cfg?.store_link_ios_ru ? (
                  <>
                    <div className="store-btn">
                      <Button
                        href={storeUrl}
                        variant="ghost"
                        loading={!cfg}
                        iconLeft={<Icon name="download" size={17} />}
                        target="_blank"
                        rel="noreferrer"
                        onClick={nativeStore ? (e) => openStoreWithFallback(e, storeUrl) : undefined}
                      >
                        Happ
                      </Button>
                      <span className="store-cap">вне РФ</span>
                    </div>
                    <div className="store-btn">
                      <a
                        className="btn btn-ghost"
                        href={cfg.store_link_ios_ru}
                        target="_blank"
                        rel="noreferrer"
                        onClick={
                          nativeStore
                            ? (e) => openStoreWithFallback(e, cfg.store_link_ios_ru!)
                            : undefined
                        }
                      >
                        <Icon name="download" size={17} /> INCY
                      </a>
                      <span className="store-cap">в РФ</span>
                    </div>
                  </>
                ) : (
                  <Button
                    href={storeUrl}
                    variant="ghost"
                    loading={!cfg}
                    iconLeft={<Icon name="download" size={17} />}
                    target="_blank"
                    rel="noreferrer"
                    onClick={nativeStore ? (e) => openStoreWithFallback(e, storeUrl) : undefined}
                  >
                    Скачать Happ
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="istep">
            <div className="istep-n">2</div>
            <div className="istep-body">
              <h4>Добавь Tuna</h4>
              <p>Нажми кнопку ниже — подписка добавится сама.</p>
              {/* Apple gets a twin button for INCY (its alternative client), same
                  one-tap import via INCY's own scheme. The wrapping row keeps a gap
                  between them when they share a line on desktop. */}
              <div className="install-imports">
                <Button
                  href={deepLink}
                  variant="amber"
                  loading={!cfg}
                  iconLeft={<Icon name="bolt" size={17} />}
                >
                  Добавить в Happ
                </Button>
                {isApple && (
                  <Button
                    href={incyDeepLink}
                    variant="amber"
                    loading={!cfg}
                    iconLeft={<Icon name="bolt" size={17} />}
                  >
                    Добавить в INCY
                  </Button>
                )}
              </div>
              <SubCopyRow
                subUrl={subUrl}
                label={
                  isApple
                    ? "Не сработало? Скопируй ссылку и добавь её в Happ / INCY вручную:"
                    : "Не сработало? Скопируй ссылку и добавь её в Happ вручную:"
                }
              />
            </div>
          </div>
          <div className="istep">
            <div className="istep-n">3</div>
            <div className="istep-body">
              <h4>Включи и проверь</h4>
              <p>Открывай недоступные сайты и свободно пользуйся интернетом.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
