"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useOnboarding } from "@/lib/useOnboarding";
import Icon, { type IconName } from "@/components/Icon";

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

function detectPlatform(): PlatformId {
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
  const [copied, setCopied] = useState(false);
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
            navigator.clipboard?.writeText(subUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
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
  // Start from a stable "ios" on both server and first client render, then switch to the
  // auto-detected platform after mount — avoids an SSR/client hydration mismatch.
  const [platform, setPlatform] = useState<PlatformId>("ios");
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const deepLink = useMemo(
    () => (cfg && subUrl ? cfg.happ_import_template.replace("{sub_url}", subUrl) : ""),
    [cfg, subUrl],
  );

  const isApple = platform === "ios";
  const isTv = platform === "apple_tv" || platform === "android_tv";
  const storeUrl = cfg && !isTv ? cfg.store_links[platform as StorePlatform] : "";

  // Roving-tabindex + arrow keys for the platform radiogroup (mirrors CabinetTabs).
  function onPickerKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const n = PLATFORMS.length;
    let next = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else return;
    e.preventDefault();
    setPlatform(PLATFORMS[next].id as PlatformId);
    btnRefs.current[next]?.focus();
  }

  const tvKey: TvPlatform = platform === "apple_tv" ? "apple_tv" : "android_tv";
  const faqUrl = cfg ? cfg.tv.faq[tvKey] : "";

  return (
    <div className="install-block">
      <div className="plat-select">
        <span className="plat-select-label">Устройство — определили автоматически:</span>
        <div className="plat-picker" role="radiogroup" aria-label="Устройство">
          {PLATFORMS.map((p, i) => (
            <button
              key={p.id}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={platform === p.id}
              tabIndex={platform === p.id ? 0 : -1}
              className={`plat${platform === p.id ? " on" : ""}`}
              onClick={() => setPlatform(p.id as PlatformId)}
              onKeyDown={(e) => onPickerKey(e, i)}
            >
              <Icon name={p.icon} size={16} />
              {p.label}
            </button>
          ))}
        </div>
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
            <a
              className="btn btn-ghost"
              style={{ marginTop: 12 }}
              href={faqUrl || undefined}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="file" size={17} /> Инструкция со скриншотами
            </a>
          </div>
        </>
      ) : (
        <>
          <div className="istep">
            <div className="istep-n">1</div>
            <div className="istep-body">
              <h4>Установи Happ</h4>
              <p>Приложение, через которое работает VPN.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <a className="btn btn-ghost" href={storeUrl || undefined} target="_blank" rel="noreferrer">
                  <Icon name="download" size={17} /> Скачать Happ
                </a>
                {isApple && cfg?.store_link_ios_ru && (
                  <a
                    className="btn btn-ghost"
                    href={cfg.store_link_ios_ru}
                    target="_blank"
                    rel="noreferrer"
                  >
                    App Store (РФ)
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
              <a className="btn btn-amber" style={{ marginTop: 10 }} href={deepLink || undefined}>
                <Icon name="bolt" size={17} /> Добавить подписку в Happ
              </a>
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
              <p>Открывай заблокированные сайты и пользуйся интернетом без ограничений.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
