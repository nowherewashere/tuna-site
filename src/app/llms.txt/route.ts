import { SITE_URL } from "@/lib/config";

// Emitted as a static /llms.txt at build (output: "export"), same as robots.ts /
// sitemap.ts. The absolute links are built from SITE_URL so they rotate with the
// public domain — the former static public/llms.txt pinned tuna-vpn.com and silently
// missed domain rotation. Single source of truth: src/lib/config.ts.
export const dynamic = "force-static";

const BODY = `# Tuna VPN

> VPN для доступа к открытому интернету из России. Работает на нескольких современных
> протоколах (VLESS+Reality, AmneziaWG и др.), которые остаются на связи, когда обычные
> VPN отваливаются. Бесплатный пробный период без карты. Подключение через сайт или
> Telegram-бота; приложение — Happ (iOS, Android, Windows, macOS, Linux, Smart TV).

## Основное
- [Главная и тарифы](${SITE_URL}/): что такое Tuna, почему работает в России,
  тарифы на подписку, число устройств, безлимитный трафик.
- [Частые вопросы](${SITE_URL}/#faq): законность VPN в России, безопасность и
  логи, почему другие VPN перестают работать, оплата из России (карты, СБП, крипта),
  устройства и платформы, пробный период.

## Документы
- [Публичная оферта](${SITE_URL}/oferta)
- [Политика конфиденциальности](${SITE_URL}/privacy)
`;

export function GET(): Response {
  return new Response(BODY, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
