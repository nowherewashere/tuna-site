"use client";

import { useMemo, useState } from "react";
import { useOnboarding } from "@/lib/useOnboarding";
import Icon from "@/components/Icon";

/**
 * The single install UI used by both onboarding (connect) and the cabinet, so they
 * never drift. All Happ links come from the bot's OnboardingConfig via
 * `/api/v1/public/onboarding/config` — nothing is hardcoded here.
 */

const PLATFORMS = [
  { id: "ios", label: "iPhone" },
  { id: "android", label: "Android" },
  { id: "windows", label: "Windows" },
  { id: "mac", label: "Mac" },
  { id: "tv", label: "TV" },
] as const;

type PlatformId = (typeof PLATFORMS)[number]["id"];

function detectPlatform(): PlatformId {
  if (typeof navigator === "undefined") return "ios";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/macintosh|mac os/.test(ua)) return "mac";
  if (/windows/.test(ua)) return "windows";
  return "ios";
}

function SubCopyRow({ subUrl }: { subUrl: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copy-link" style={{ marginTop: 10 }}>
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
  );
}

export default function InstallBlock({ subUrl }: { subUrl: string }) {
  const cfg = useOnboarding();
  const [platform, setPlatform] = useState<PlatformId>(detectPlatform);

  const deepLink = useMemo(
    () => (cfg && subUrl ? cfg.happ_import_template.replace("{sub_url}", subUrl) : ""),
    [cfg, subUrl],
  );

  const isApple = platform === "ios" || platform === "mac";
  const isTv = platform === "tv";
  const storeUrl = cfg && !isTv ? cfg.store_links[platform] : "";

  return (
    <div className="install-block">
      <div className="plat-select">
        <span className="plat-select-label">Устройство — определили автоматически:</span>
        <select
          className="field plat-dropdown"
          value={platform}
          onChange={(e) => setPlatform(e.target.value as PlatformId)}
        >
          {PLATFORMS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {isTv ? (
        <>
          <div className="istep">
            <div className="istep-n">1</div>
            <div className="istep-body">
              <h4>Открой на телевизоре</h4>
              <p>
                На ТВ зайди на <b>{cfg?.tv.web_import_url ?? "tv.happ.su"}</b> и введи ссылку
                подписки:
              </p>
              <SubCopyRow subUrl={subUrl} />
            </div>
          </div>
          <div className="istep">
            <div className="istep-n">2</div>
            <div className="istep-body">
              <h4>Инструкция под платформу</h4>
              <p>Пошаговый гайд под твой телевизор:</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {cfg?.tv.faq.apple_tv && (
                  <a className="btn btn-ghost" href={cfg.tv.faq.apple_tv} target="_blank" rel="noreferrer">
                    Apple TV
                  </a>
                )}
                {cfg?.tv.faq.android_tv && (
                  <a
                    className="btn btn-ghost"
                    href={cfg.tv.faq.android_tv}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Android TV
                  </a>
                )}
              </div>
            </div>
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
                    App Store (RU)
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="istep">
            <div className="istep-n">2</div>
            <div className="istep-body">
              <h4>Добавь Tuna</h4>
              <p>Одним тапом — настроится само.</p>
              <a className="btn btn-amber" style={{ marginTop: 10 }} href={deepLink || undefined}>
                <Icon name="bolt" size={17} /> Добавить подписку в Happ
              </a>
              <SubCopyRow subUrl={subUrl} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
