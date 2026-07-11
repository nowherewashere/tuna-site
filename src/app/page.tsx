import Link from "next/link";
import AuthCta from "@/components/AuthCta";
import Icon, { type IconName } from "@/components/Icon";
import DepthGauge from "@/components/DepthGauge";
import Nav from "@/components/Nav";
import HeroScene from "@/components/HeroScene";
import PricingSection from "@/components/PricingSection";
import { fetchLandingPlans } from "@/lib/plans.server";
import { HERO_AVIF_SRCSET, HERO_SIZES, HERO_PRELOAD_HREF } from "@/lib/heroImage";
import { Reveal } from "@/components/ui";

const DIVE_STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "mail",
    title: "Получи доступ",
    body: "Регистрируешься — мы сразу выдаём подписку. Можно войти через Telegram.",
  },
  {
    icon: "download",
    title: "Установи Happ",
    body: "Приложение, через которое работает VPN. Ссылка под твою платформу.",
  },
  {
    icon: "check",
    title: "Добавь VPN профиль",
    body: "Одно нажатие — всё настроится само. Открытый интернет без ограничений.",
  },
];

const WHY_FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "globe",
    title: "Умная маршрутизация",
    body: "Несколько адаптивных протоколов — соединение держится там, где обычные VPN отваливаются. Tuna поможет преодолеть любой цифровой шторм.",
  },
  {
    icon: "bolt",
    title: "Быстро и удобно",
    body: "Подключение за минуту, автоподбор лучшего сервера. Никаких ручных настроек.",
  },
  {
    icon: "tv",
    title: "Стриминг, звонки, игры",
    body: "Видео в 4K, созвоны без лагов и низкий пинг в играх. Никаких искусственных ограничений скорости.",
  },
  {
    icon: "phone",
    title: "Единый доступ на всё",
    body: "Телефон, ноутбук, планшет, ТВ — несколько устройств на одной подписке, зависит от тарифа.",
  },
  {
    icon: "shield",
    title: "Не храним твои данные",
    body: "Не ведём логи подключений и не собираем историю трафика. Что ты открываешь и куда заходишь — знаешь только ты.",
  },
  {
    icon: "refresh",
    title: "Автообновление",
    body: "Никаких запутанных интерфейсов — все обновления подключаются сами.",
  },
];

// Single source of truth for the FAQ: drives both the visible <details> list
// and the FAQPage structured data (SEO/AEO). Each `a` element is one paragraph.
const FAQ_ITEMS: { q: string; a: string[] }[] = [
  {
    q: "Законно ли пользоваться VPN в России?",
    a: [
      "Да. Использование VPN обычным человеком в России не образует отдельного нарушения — за сам факт не штрафуют, и телефоны никто не проверяет. Закон связывает ответственность не с VPN, а с конкретными противоправными действиями. Tuna — это инструмент доступа к открытому интернету, а что открывать — решаешь ты.",
    ],
  },
  {
    q: "Это безопасно? Вы видите, что я делаю в интернете?",
    a: [
      "Да, безопасно. Твой трафик шифруется, а мы не ведём историю того, что ты открываешь, — нам это ни к чему. С бесплатными VPN бывает ровно наоборот: некоторые зарабатывают тем, что собирают и продают данные пользователей — вплоть до паролей и истории поиска, — а иные ещё и тащат с собой вирусы. Правило простое: если ты не платишь за продукт — продукт это ты. Точные формулировки — в политике конфиденциальности.",
    ],
  },
  {
    q: "Почему другие VPN перестают работать?",
    a: [
      "Потому что старые протоколы вроде OpenVPN и WireGuard легко распознаются по характерным признакам, и такие соединения становятся нестабильными. Tuna использует несколько современных протоколов: трафик идёт как обычное защищённое соединение и ничем не выделяется. А если условия сети меняются, мы быстро выкатываем обновление — поэтому Tuna остаётся на связи там, где другие уже лежат.",
    ],
  },
  {
    q: "Как понять, что VPN вообще будет работать в России?",
    a: [
      "Смотри не на бренд, а на протокол. Сегодня стабильнее всего работают сервисы на современных протоколах — например, VLESS+Reality или AmneziaWG: трафик идёт как обычное защищённое соединение. Tuna построена именно на них, поэтому работает, пока старые VPN отваливаются. Второй фактор — как быстро сервис приходит в норму, если условия меняются; у нас это очень быстро.",
    ],
  },
  {
    q: "Будет ли Tuna работать на моём провайдере?",
    a: [
      "Да — на домашнем и мобильном интернете любого провайдера. Условия в разных сетях отличаются и иногда меняются, поэтому если где-то что-то пошло не так — ты в пару кликов переключаешь сервер или протокол и снова в сети.",
    ],
  },
  {
    q: "С включённым VPN не открываются банки и маркетплейсы. Что делать?",
    a: [
      "Чаще всего это не поломка. С весны 2026 года некоторые российские сервисы — банки, маркетплейсы, Яндекс — просят выключить VPN, если видят, что он включён. С Tuna это обычно не мешает: российские сайты и приложения работают напрямую, как будто VPN выключен, а всё остальное — через защищённое подключение.",
      "Иногда отдельные приложения всё же показывают плашку «Выключите VPN» — оно смотрит не на локацию, а на сам факт включённого VPN, и это не зависит от конкретного VPN. Твоя локация остаётся российской; если приложение упирается, на пару минут выключи VPN и включи снова.",
    ],
  },
  {
    q: "Нужен ли Telegram, чтобы подключиться?",
    a: [
      "Нет. У многих VPN доступ выдают только через Telegram-бота — и если с самим Telegram проблемы, получается замкнутый круг. Tuna работает не так: подключиться можно и через сайт, и через Telegram-бота — как удобнее. Сайт открывается без мессенджера, так что регистрация, подписка, настройка и управление доступны в любом случае.",
    ],
  },
  {
    q: "Не будет ли Tuna тормозить? А для игр подойдёт?",
    a: [
      "Современные протоколы, на которых работает Tuna, лёгкие — на скорость почти не влияют, видео и звонки идут без просадок. Если конкретный сервер подтормаживает, в пару тапов меняешь локацию или протокол. Для игр и звонков выбирай локацию поближе: чем ближе сервер, тем ниже пинг. Например, если ты во Владивостоке — подключай Японию.",
    ],
  },
  {
    q: "Зачем платить, если есть бесплатные VPN?",
    a: [
      "Потому что за бесплатный VPN обычно платишь по-другому — своими данными: многие собирают и продают их (вплоть до паролей и истории поиска), режут скорость и ставят лимиты, а ещё первыми перестают работать, когда становится сложнее. Tuna платная ровно затем, чтобы не зарабатывать на тебе: стабильные серверы, честная скорость и живая поддержка. А чтобы не платить вслепую — сначала бесплатный пробный период.",
    ],
  },
  {
    q: "На сколько устройств и на каких платформах работает подписка?",
    a: [
      "Число устройств зависит от типа подписки. Подключать можно в любом сочетании: телефон, ноутбук, планшет, компьютер, телевизор. Приложения есть под все популярные платформы — Windows, macOS, iOS, Android и Smart TV, так что одного аккаунта хватает на всю технику дома.",
    ],
  },
  {
    q: "А если не заработает? Есть пробный период?",
    a: [
      "Есть — бесплатно и без карты. Так ты спокойно проверишь всё до оплаты. Настраивать вручную ничего не нужно: подписка добавляется в приложение Happ одним нажатием. А если в твоей сети что-то не пошло — в пару кликов меняешь локацию или протокол, поддержка подскажет на любом этапе.",
    ],
  },
  {
    q: "Как оплатить из России?",
    a: [
      "Российскими картами и через СБП — привычными способами. Принимаем и криптовалюту, если так удобнее. А начать можно вообще без оплаты: пробный период бесплатный и карту не спрашивает.",
    ],
  },
];

// FAQPage structured data (SEO/AEO) derived from the same source as the visible list.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a.join(" "),
    },
  })),
};

export default async function LandingPage() {
  // Fetched at build so the pricing cards ship in the served HTML (SEO-08 / GEO-01);
  // PricingSection refreshes them client-side on mount.
  const initialPlans = await fetchLandingPlans();

  return (
    <>
      {/* Preload the hero AVIF (the LCP element) so its download starts with the document
          instead of after the <picture> is parsed (CWV-01). React 19 hoists this <link>
          into <head>. type="image/avif" makes non-AVIF browsers skip it and fall back to
          the WebP/PNG <source>s; imageSrcSet/imageSizes mirror HeroScene's AVIF <source>. */}
      <link
        rel="preload"
        as="image"
        type="image/avif"
        href={HERO_PRELOAD_HREF}
        imageSrcSet={HERO_AVIF_SRCSET}
        imageSizes={HERO_SIZES}
        fetchPriority="high"
      />

      {/* Banner landmark so the skip link is contained in a region (axe). Kept separate
          from <Nav> because the nav is position:sticky — wrapping it in a short header
          would constrain its sticky containing block and break the pinned-on-scroll. */}
      <header className="skip-banner">
        <a href="#main" className="skip-link">
          К содержимому
        </a>
      </header>

      {/* Ambient ocean for the lower sections: slow caustic shimmer + light shafts.
          Fixed, behind everything, purely atmospheric (hidden for reduced-motion). */}
      <div className="ocean-fx" aria-hidden="true">
        <span className="fx-rays" />
        <span className="fx-caustic" />
      </div>

      <DepthGauge />
      <Nav />

      <main id="main">
        <header className="hero" id="surface">
          <HeroScene />
          <div className="wrap">
            <div className="hero-grid">
              <div className="hero-copy">
                <div className="eyebrow reveal d1">
                  <span className="dot" /> Открытый интернет за минуту
                </div>
                <h1 className="hero-title reveal d2">
                  Tuna <span className="amber">VPN</span>
                </h1>
                <p className="hero-sub reveal d3">
                  Свободный доступ к мировому океану интернета.
                </p>
                <div className="hero-cta reveal d4">
                  <AuthCta
                    className="btn btn-amber btn-lg"
                    guest={{ href: "/login", label: "Подключить" }}
                    authed={{ href: "/cabinet", label: "Открыть кабинет" }}
                  />
                  <AuthCta
                    className="btn btn-ghost btn-lg"
                    guest={{ href: "/login", label: "Войти" }}
                    authed={null}
                  />
                </div>
                <p className="hero-note reveal d5">
                  Бесплатный пробный период · без карты
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="dive" id="how">
          <div className="wrap">
            {/* Gives the three step <h3>s a parent heading level (h1 -> h2 -> h3);
                the visible kicker below stays decorative. */}
            <h2 className="sr-only">Как подключиться</h2>
            <div className="sec-kicker">
              <span className="kick-mono">{"// погружение"}</span>
              Три шага до открытой воды
            </div>
            <div className="dive-track">
              {DIVE_STEPS.map((step, i) => (
                <Reveal key={step.title} className="dive-step" delay={i * 0.08}>
                  <div className="ds-mark">
                    <span className="ds-n">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="ds-body">
                    <div className="ds-ic">
                      <Icon name={step.icon} size={24} />
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="why" id="why">
          <div className="wrap">
            <div className="sec-eyebrow">Почему Tuna VPN?</div>
            <h2 className="sec-title">Свободный доступ к мировому интернету</h2>
            <p className="sec-intro">
              Адаптивные протоколы, которые подстраиваются под условия сети. Меняется обстановка —
              Tuna подстраивается, а ты остаёшься на связи.
            </p>
            <div className="feat-grid">
              {WHY_FEATURES.map((feature, i) => (
                <Reveal key={feature.title} className="feat" delay={i * 0.06}>
                  <span className="ic">
                    <Icon name={feature.icon} size={26} />
                  </span>
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <PricingSection initialPlans={initialPlans} />

        <section id="faq">
          <div className="wrap">
            <div className="sec-eyebrow">Вопросы</div>
            <h2 className="sec-title">Коротко о главном</h2>
            <p className="sec-intro">
              Если остались вопросы — поддержка на связи и отвечает быстро.
            </p>
            <div className="faq-list">
              {FAQ_ITEMS.map((item, i) => (
                <details className="q" key={item.q} open={i === 0}>
                  <summary>
                    {item.q} <span className="chev" aria-hidden="true" />
                  </summary>
                  {item.a.map((para, j) => (
                    <p key={j}>{para}</p>
                  ))}
                </details>
              ))}
            </div>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
          </div>
        </section>

        <section className="final" id="final">
          <span className="final-glow" aria-hidden="true" />
          <div className="wrap">
            <div className="final-depth mono">∞ · глубины интернета</div>
            <h2>Открытый океан ждёт</h2>
            <p>Бесплатный пробный период. Без карты. Мы уверены в своём качестве.</p>
            <AuthCta
              className="btn btn-amber btn-lg"
              guest={{ href: "/login", label: "Подключить" }}
              authed={{ href: "/cabinet", label: "Открыть кабинет" }}
            />
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <div className="foot-grid">
            <div className="logo">
              <span className="logo-mark" aria-hidden="true" />
              Tuna VPN
            </div>
            <div className="foot-links">
              <Link href="/oferta">Оферта</Link>
              <Link href="/privacy">Конфиденциальность</Link>
            </div>
            <div>© 2026 Tuna VPN</div>
          </div>
        </div>
      </footer>
    </>
  );
}
