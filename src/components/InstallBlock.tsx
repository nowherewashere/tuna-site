"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useOnboarding } from "@/lib/useOnboarding";
import { useCopyToClipboard } from "@/lib/useCopyToClipboard";
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
  const selectedPlatform = PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[0];

  const deepLink = useMemo(
    () => (cfg && subUrl ? cfg.happ_import_template.replace("{sub_url}", subUrl) : ""),
    [cfg, subUrl],
  );

  const isApple = platform === "ios";
  const isTv = platform === "apple_tv" || platform === "android_tv";
  const storeUrl = cfg && !isTv ? cfg.store_links[platform as StorePlatform] : "";

  const tvKey: TvPlatform = platform === "apple_tv" ? "apple_tv" : "android_tv";
  const faqUrl = cfg ? cfg.tv.faq[tvKey] : "";

  return (
    <div className="install-block">
      <div className="plat-select">
        <label className="plat-field">
          <span className="plat-field-ic" aria-hidden="true">
            <Icon name={selectedPlatform.icon} size={18} />
          </span>
          <select
            className="plat-native"
            aria-label="Устройство"
            value={platform}
            onChange={(e) => setOverride(e.target.value as PlatformId)}
          >
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <span className="plat-field-chevron" aria-hidden="true">
            <Icon name="chevron" size={16} />
          </span>
        </label>
      </div>

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
              <h4>Установи Happ</h4>
              <p>Приложение, через которое работает VPN.</p>
              <div className="install-actions">
                <Button
                  href={storeUrl}
                  variant="ghost"
                  full
                  loading={!cfg}
                  iconLeft={<Icon name="download" size={17} />}
                  target="_blank"
                  rel="noreferrer"
                >
                  {isApple ? "Скачать Happ (AppStore вне РФ)" : "Скачать Happ"}
                </Button>
                {isApple && cfg?.store_link_ios_ru && (
                  <a
                    className="btn btn-ghost btn-full"
                    href={cfg.store_link_ios_ru}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Icon name="download" size={17} /> Скачать Happ (AppStore в РФ)
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="istep">
            <div className="istep-n">2</div>
            <div className="istep-body">
              <h4>Добавь Tuna</h4>
              <p>Нажми кнопку ниже — подписка добавится сама.</p>
              <Button
                href={deepLink}
                variant="amber"
                full
                loading={!cfg}
                iconLeft={<Icon name="bolt" size={17} />}
                style={{ marginTop: 10 }}
              >
                Добавить подписку в Happ
              </Button>
              <SubCopyRow
                subUrl={subUrl}
                label="Не сработало? Скопируй ссылку и добавь её в Happ вручную:"
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
