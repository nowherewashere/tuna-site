import Link from "next/link";
import AuthCta from "@/components/AuthCta";
import Icon from "@/components/Icon";
import DepthGauge from "@/components/DepthGauge";
import Nav from "@/components/Nav";
import HeroScene from "@/components/HeroScene";
import PricingSection from "@/components/PricingSection";
import { Reveal } from "@/components/ui";

// FAQPage structured data (SEO/AEO). The answer text is the plain-text sibling
// of the visible answers below — keep the two in sync when editing copy.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Законно ли пользоваться VPN в России?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Да. Использование VPN обычным человеком в России не образует отдельного нарушения — за сам факт не штрафуют, и телефоны никто не проверяет. Закон связывает ответственность не с VPN, а с конкретными противоправными действиями. Tuna — это инструмент доступа к открытому интернету, а что открывать — решаешь ты.",
      },
    },
    {
      "@type": "Question",
      name: "Это безопасно? Вы видите, что я делаю в интернете?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Да. Твой трафик шифруется, а историю того, что ты открываешь, мы не ведём. С бесплатными VPN бывает наоборот — они собирают и продают данные пользователей, вплоть до паролей и истории поиска, а иногда содержат вирусы. Точные формулировки — в политике конфиденциальности.",
      },
    },
    {
      "@type": "Question",
      name: "Почему другие VPN перестают работать?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Потому что старые протоколы вроде OpenVPN и WireGuard легко распознаются по характерным признакам, и такие соединения становятся нестабильными. Tuna использует несколько современных протоколов: трафик идёт как обычное защищённое соединение и ничем не выделяется. А если условия сети меняются, мы быстро выкатываем обновление — поэтому Tuna остаётся на связи там, где другие уже лежат.",
      },
    },
    {
      "@type": "Question",
      name: "Как понять, что VPN будет работать в России?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Смотри не на бренд, а на протокол. Сегодня стабильнее всего работают сервисы на современных протоколах — например, VLESS+Reality или AmneziaWG: трафик идёт как обычное защищённое соединение. Tuna построена именно на них, поэтому работает, пока старые VPN отваливаются. Второй фактор — как быстро сервис приходит в норму, если условия меняются; у нас это очень быстро.",
      },
    },
    {
      "@type": "Question",
      name: "Будет ли Tuna работать на моём провайдере?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Да — на домашнем и мобильном интернете любого провайдера. Условия в разных сетях отличаются и иногда меняются, поэтому если где-то что-то пошло не так — ты в пару кликов переключаешь сервер или протокол и снова в сети.",
      },
    },
    {
      "@type": "Question",
      name: "С включённым VPN не открываются банки и маркетплейсы. Что делать?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Чаще всего это не поломка. С весны 2026 года некоторые российские сервисы — банки, маркетплейсы, Яндекс — просят выключить VPN, если видят, что он включён. С Tuna это обычно не мешает: российские сайты и приложения работают напрямую, как будто VPN выключен, а всё остальное — через защищённое подключение. Иногда отдельные приложения всё же показывают плашку «Выключите VPN» — оно смотрит не на локацию, а на сам факт включённого VPN, и это не зависит от конкретного VPN. Твоя локация остаётся российской; если приложение упирается, на пару минут выключи VPN и включи снова.",
      },
    },
    {
      "@type": "Question",
      name: "Нужен ли Telegram, чтобы подключиться?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Нет. У многих VPN доступ выдают только через Telegram-бота — и если с самим Telegram проблемы, получается замкнутый круг. Tuna работает не так: подключиться можно и через сайт, и через Telegram-бота — как удобнее. Сайт открывается без мессенджера, так что регистрация, подписка, настройка и управление доступны в любом случае.",
      },
    },
    {
      "@type": "Question",
      name: "Не будет ли VPN тормозить? Подойдёт ли для игр?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Современные протоколы, на которых работает Tuna, лёгкие — на скорость почти не влияют, видео и звонки идут без просадок. Если конкретный сервер подтормаживает, в пару тапов меняешь локацию или протокол. Для игр и звонков выбирай локацию поближе: чем ближе сервер, тем ниже пинг. Например, если ты во Владивостоке — подключай Японию.",
      },
    },
    {
      "@type": "Question",
      name: "Зачем платить, если есть бесплатные VPN?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "За бесплатный VPN обычно платишь данными: их собирают и продают, вплоть до паролей и истории поиска, режут скорость и ставят лимиты, а ещё первыми перестают работать при усложнении. Tuna платная, чтобы не зарабатывать на тебе: стабильные серверы, честная скорость и живая поддержка. Проверить можно на бесплатном пробном периоде.",
      },
    },
    {
      "@type": "Question",
      name: "На сколько устройств и на каких платформах работает подписка?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Число устройств зависит от типа подписки. Подключать можно в любом сочетании: телефон, ноутбук, планшет, компьютер, телевизор. Приложения есть под Windows, macOS, iOS, Android и Smart TV.",
      },
    },
    {
      "@type": "Question",
      name: "А если не заработает? Есть пробный период?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Есть — бесплатно и без карты. Так ты спокойно проверишь всё до оплаты. Настраивать вручную ничего не нужно: подписка добавляется в приложение Happ одним нажатием. А если в твоей сети что-то не пошло — в пару кликов меняешь локацию или протокол, поддержка подскажет на любом этапе.",
      },
    },
    {
      "@type": "Question",
      name: "Как оплатить VPN из России?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Российскими картами и через СБП. Принимаем и криптовалюту. Начать можно без оплаты — пробный период бесплатный и карту не спрашивает.",
      },
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      <a href="#main" className="skip-link">
        К содержимому
      </a>

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
                    guest={{ href: "/connect", label: "Подключить" }}
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
            <div className="sec-kicker">
              <span className="kick-mono">{"// погружение"}</span>
              Три шага до открытой воды
            </div>
            <div className="dive-track">
              <Reveal className="dive-step" delay={0}>
                <div className="ds-mark">
                  <span className="ds-n">01</span>
                </div>
                <div className="ds-body">
                  <div className="ds-ic">
                    <Icon name="mail" size={24} />
                  </div>
                  <h3>Получи доступ</h3>
                  <p>Регистрируешься — мы сразу выдаём подписку. Можно войти через Telegram.</p>
                </div>
              </Reveal>
              <Reveal className="dive-step" delay={0.08}>
                <div className="ds-mark">
                  <span className="ds-n">02</span>
                </div>
                <div className="ds-body">
                  <div className="ds-ic">
                    <Icon name="download" size={24} />
                  </div>
                  <h3>Установи Happ</h3>
                  <p>Приложение, через которое работает VPN. Ссылка под твою платформу.</p>
                </div>
              </Reveal>
              <Reveal className="dive-step" delay={0.16}>
                <div className="ds-mark">
                  <span className="ds-n">03</span>
                </div>
                <div className="ds-body">
                  <div className="ds-ic">
                    <Icon name="check" size={24} />
                  </div>
                  <h3>Добавь VPN профиль</h3>
                  <p>Одно нажатие — всё настроится само. Открытый интернет без ограничений.</p>
                </div>
              </Reveal>
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
              <Reveal className="feat" delay={0}>
                <span className="ic">
                  <Icon name="globe" size={26} />
                </span>
                <div>
                  <h3>Умная маршрутизация</h3>
                  <p>
                    Несколько адаптивных протоколов — соединение держится там, где обычные VPN
                    отваливаются. Tuna поможет преодолеть любой цифровой шторм.
                  </p>
                </div>
              </Reveal>
              <Reveal className="feat" delay={0.06}>
                <span className="ic">
                  <Icon name="bolt" size={26} />
                </span>
                <div>
                  <h3>Быстро и удобно</h3>
                  <p>Подключение за минуту, автоподбор лучшего сервера. Никаких ручных настроек.</p>
                </div>
              </Reveal>
              <Reveal className="feat" delay={0.12}>
                <span className="ic">
                  <Icon name="tv" size={26} />
                </span>
                <div>
                  <h3>Стриминг, звонки, игры</h3>
                  <p>
                    Видео в 4K, созвоны без лагов и низкий пинг в играх. Никаких искусственных
                    ограничений скорости.
                  </p>
                </div>
              </Reveal>
              <Reveal className="feat" delay={0.18}>
                <span className="ic">
                  <Icon name="phone" size={26} />
                </span>
                <div>
                  <h3>Единый доступ на всё</h3>
                  <p>
                    Телефон, ноутбук, планшет, ТВ — несколько устройств на одной подписке, зависит
                    от тарифа.
                  </p>
                </div>
              </Reveal>
              <Reveal className="feat" delay={0.24}>
                <span className="ic">
                  <Icon name="shield" size={26} />
                </span>
                <div>
                  <h3>Не храним твои данные</h3>
                  <p>
                    Не ведём логи подключений и не собираем историю трафика. Что ты открываешь и
                    куда заходишь — знаешь только ты.
                  </p>
                </div>
              </Reveal>
              <Reveal className="feat" delay={0.3}>
                <span className="ic">
                  <Icon name="refresh" size={26} />
                </span>
                <div>
                  <h3>Автообновление</h3>
                  <p>Никаких запутанных интерфейсов — все обновления подключаются сами.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <PricingSection />

        <section id="faq">
          <div className="wrap">
            <div className="sec-eyebrow">Вопросы</div>
            <h2 className="sec-title">Коротко о главном</h2>
            <p className="sec-intro">
              Если остались вопросы — поддержка на связи и отвечает быстро.
            </p>
            <div className="faq-list">
              <details className="q" open>
                <summary>
                  Законно ли пользоваться VPN в России?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Да. Использование VPN обычным человеком в России не образует отдельного нарушения —
                  за сам факт не штрафуют, и телефоны никто не проверяет. Закон связывает
                  ответственность не с VPN, а с конкретными противоправными действиями. Tuna — это
                  инструмент доступа к открытому интернету, а что открывать — решаешь ты.
                </p>
              </details>
              <details className="q">
                <summary>
                  Это безопасно? Вы видите, что я делаю в интернете?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Да, безопасно. Твой трафик шифруется, а мы не ведём историю того, что ты открываешь,
                  — нам это ни к чему. С бесплатными VPN бывает ровно наоборот: некоторые зарабатывают
                  тем, что собирают и продают данные пользователей — вплоть до паролей и истории поиска,
                  — а иные ещё и тащат с собой вирусы. Правило простое: если ты не платишь за продукт —
                  продукт это ты. Точные формулировки — в политике конфиденциальности.
                </p>
              </details>
              <details className="q">
                <summary>
                  Почему другие VPN перестают работать?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Потому что старые протоколы вроде OpenVPN и WireGuard легко распознаются по
                  характерным признакам, и такие соединения становятся нестабильными. Tuna использует
                  несколько современных протоколов: трафик идёт как обычное защищённое соединение и
                  ничем не выделяется. А если условия сети меняются, мы быстро выкатываем обновление —
                  поэтому Tuna остаётся на связи там, где другие уже лежат.
                </p>
              </details>
              <details className="q">
                <summary>
                  Как понять, что VPN вообще будет работать в России?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Смотри не на бренд, а на протокол. Сегодня стабильнее всего работают сервисы на
                  современных протоколах — например, VLESS+Reality или AmneziaWG: трафик идёт как
                  обычное защищённое соединение. Tuna построена именно на них, поэтому работает, пока
                  старые VPN отваливаются. Второй фактор — как быстро сервис приходит в норму, если
                  условия меняются; у нас это очень быстро.
                </p>
              </details>
              <details className="q">
                <summary>
                  Будет ли Tuna работать на моём провайдере?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Да — на домашнем и мобильном интернете любого провайдера. Условия в разных сетях
                  отличаются и иногда меняются, поэтому если где-то что-то пошло не так — ты в пару
                  кликов переключаешь сервер или протокол и снова в сети.
                </p>
              </details>
              <details className="q">
                <summary>
                  С включённым VPN не открываются банки и маркетплейсы. Что делать?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Чаще всего это не поломка. С весны 2026 года некоторые российские сервисы — банки,
                  маркетплейсы, Яндекс — просят выключить VPN, если видят, что он включён. С Tuna это
                  обычно не мешает: российские сайты и приложения работают напрямую, как будто VPN
                  выключен, а всё остальное — через защищённое подключение.
                </p>
                <p>
                  Иногда отдельные приложения всё же показывают плашку «Выключите VPN» — оно смотрит не
                  на локацию, а на сам факт включённого VPN, и это не зависит от конкретного VPN. Твоя
                  локация остаётся российской; если приложение упирается, на пару минут выключи VPN и
                  включи снова.
                </p>
              </details>
              <details className="q">
                <summary>
                  Нужен ли Telegram, чтобы подключиться?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Нет. У многих VPN доступ выдают только через Telegram-бота — и если с самим Telegram
                  проблемы, получается замкнутый круг. Tuna работает не так: подключиться можно и через
                  сайт, и через Telegram-бота — как удобнее. Сайт открывается без мессенджера, так что
                  регистрация, подписка, настройка и управление доступны в любом случае.
                </p>
              </details>
              <details className="q">
                <summary>
                  Не будет ли Tuna тормозить? А для игр подойдёт?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Современные протоколы, на которых работает Tuna, лёгкие — на скорость почти не
                  влияют, видео и звонки идут без просадок. Если конкретный сервер подтормаживает, в
                  пару тапов меняешь локацию или протокол. Для игр и звонков выбирай локацию поближе:
                  чем ближе сервер, тем ниже пинг. Например, если ты во Владивостоке — подключай
                  Японию.
                </p>
              </details>
              <details className="q">
                <summary>
                  Зачем платить, если есть бесплатные VPN?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Потому что за бесплатный VPN обычно платишь по-другому — своими данными: многие
                  собирают и продают их (вплоть до паролей и истории поиска), режут скорость и ставят
                  лимиты, а ещё первыми перестают работать, когда становится сложнее. Tuna платная
                  ровно затем, чтобы не зарабатывать на тебе: стабильные серверы, честная скорость и
                  живая поддержка. А чтобы не платить вслепую — сначала бесплатный пробный период.
                </p>
              </details>
              <details className="q">
                <summary>
                  На сколько устройств и на каких платформах работает подписка?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Число устройств зависит от типа подписки. Подключать можно в любом сочетании:
                  телефон, ноутбук, планшет, компьютер, телевизор. Приложения есть под все популярные
                  платформы — Windows, macOS, iOS, Android и Smart TV, так что одного аккаунта хватает
                  на всю технику дома.
                </p>
              </details>
              <details className="q">
                <summary>
                  А если не заработает? Есть пробный период?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Есть — бесплатно и без карты. Так ты спокойно проверишь всё до оплаты. Настраивать
                  вручную ничего не нужно: подписка добавляется в приложение Happ одним нажатием. А
                  если в твоей сети что-то не пошло — в пару кликов меняешь локацию или протокол,
                  поддержка подскажет на любом этапе.
                </p>
              </details>
              <details className="q">
                <summary>
                  Как оплатить из России? <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Российскими картами и через СБП — привычными способами. Принимаем и криптовалюту,
                  если так удобнее. А начать можно вообще без оплаты: пробный период бесплатный и карту
                  не спрашивает.
                </p>
              </details>
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
              guest={{ href: "/connect", label: "Подключить" }}
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
