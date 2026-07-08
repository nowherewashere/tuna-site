import Link from "next/link";
import AuthCta from "@/components/AuthCta";
import Icon from "@/components/Icon";
import DepthGauge from "@/components/DepthGauge";
import Nav from "@/components/Nav";
import HeroScene from "@/components/HeroScene";
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
        text: "Да. Использование VPN обычным человеком в России не образует отдельного нарушения — за сам факт не штрафуют и телефоны на VPN не проверяют. Ответственность связана с тем, что ты открываешь, а не с самим VPN. Tuna — инструмент доступа к открытому интернету.",
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
        text: "Операторы научились распознавать обычный VPN-трафик по характерным признакам и резать такие соединения — стандартные OpenVPN и WireGuard отваливаются. Tuna использует несколько протоколов с маскировкой: трафик выглядит как обычная загрузка сайтов. Когда становится сложнее, сервис быстро обновляется.",
      },
    },
    {
      "@type": "Question",
      name: "Как понять, что VPN будет работать в России?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Смотри на протокол, а не на бренд. Стабильно работают VPN, которые маскируют трафик под обычный HTTPS — например VLESS+Reality или AmneziaWG. На таких протоколах построена Tuna. Второй фактор — как быстро сервис приходит в норму при изменениях; у Tuna это происходит очень быстро.",
      },
    },
    {
      "@type": "Question",
      name: "VPN работает у оператора МТС, МегаФон, Билайн, Tele2?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Да, Tuna рассчитана на всех крупных операторов: МТС, МегаФон, Билайн, Tele2, Ростелеком. Ограничения у операторов разные и меняются, поэтому при необходимости в пару тапов переключаешь сервер или протокол.",
      },
    },
    {
      "@type": "Question",
      name: "С включённым VPN не открываются банки и маркетплейсы. Что делать?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Чаще всего это не поломка VPN: с весны 2026 российские сервисы (банки, маркетплейсы, Яндекс) ограничивают доступ при включённом VPN. С Tuna российские сайты и приложения работают как будто VPN выключен. Иногда отдельное приложение всё же показывает плашку «Выключите VPN», ориентируясь на сам факт включённого VPN — обойти это нельзя ни одним VPN; локация при этом остаётся российской, а VPN можно на пару минут выключить.",
      },
    },
    {
      "@type": "Question",
      name: "Нужен ли Telegram, чтобы подключиться?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Нет. У многих VPN доступ выдают только через Telegram-бота, и при недоступности Telegram получается замкнутый круг. У Tuna подключиться можно и через сайт, и через Telegram-бота. Сайт открывается без мессенджера, поэтому регистрация, подписка, настройка и управление доступны всегда.",
      },
    },
    {
      "@type": "Question",
      name: "Не будет ли VPN тормозить? Подойдёт ли для игр?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Маскирующие протоколы Tuna лёгкие и почти не влияют на скорость — видео и звонки идут без просадок. Если сервер подтормаживает, меняешь локацию или протокол. Для игр и звонков выбирай локацию поближе — например, из Владивостока подключай Японию: чем ближе сервер, тем ниже пинг.",
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
        text: "Число устройств зависит от типа подписки — вплоть до 15 на самой премиальной. Подключать можно в любом сочетании: телефон, ноутбук, планшет, компьютер, телевизор. Приложения есть под Windows, macOS, iOS, Android и Smart TV.",
      },
    },
    {
      "@type": "Question",
      name: "А если не заработает? Есть пробный период?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Есть пробный период — 3 дня бесплатно и без карты. Настраивать вручную ничего не нужно: подписка добавляется в приложение Happ одним нажатием. Если что-то не пошло — меняешь локацию или протокол, поддержка помогает на любом шаге.",
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
                  Рассекаем волны блокировок. VPN работает, пока другие отваливаются.
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
                  Пробный период <span className="mono">3 дня</span> · без карты
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
                  <p>Регистрируешься — мы сразу выдаём подписку. Можно без почты.</p>
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
              Туннелирование и обфускация под операторов. Когда блокировки усиливаются — Tuna VPN
              подстраивается, а ты остаёшься в сети.
            </p>
            <div className="feat-grid">
              <Reveal className="feat feat-primary" delay={0}>
                <span className="ic">
                  <Icon name="shield" size={30} />
                </span>
                <div>
                  <span className="feat-kick">bypass</span>
                  <h3>Умный обход блокировок</h3>
                  <p>
                    Несколько протоколов и маскировка трафика под обычный — работает там, где
                    обычные VPN отваливаются. Усиливают блокировки — Tuna подстраивается.
                  </p>
                </div>
              </Reveal>
              <Reveal className="feat" delay={0.06}>
                <span className="ic">
                  <Icon name="bolt" size={26} />
                </span>
                <div>
                  <span className="feat-kick">speed</span>
                  <h3>Быстро и удобно</h3>
                  <p>Подключение за минуту, автоподбор лучшего сервера. Никаких ручных настроек.</p>
                </div>
              </Reveal>
              <Reveal className="feat" delay={0.12}>
                <span className="ic">
                  <Icon name="phone" size={26} />
                </span>
                <div>
                  <span className="feat-kick">devices</span>
                  <h3>Единый доступ на всё</h3>
                  <p>
                    Телефон, ноутбук, планшет, ТВ — до 15 устройств на одной подписке, зависит от
                    тарифа.
                  </p>
                </div>
              </Reveal>
              <Reveal className="feat" delay={0.18}>
                <span className="ic">
                  <Icon name="refresh" size={26} />
                </span>
                <div>
                  <span className="feat-kick">auto</span>
                  <h3>Автообновление</h3>
                  <p>Никаких запутанных интерфейсов — все обновления подключаются сами.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

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
                  за сам факт не штрафуют, и телефоны на VPN никто не проверяет. Ответственность закон
                  связывает не с VPN, а с тем, что ты через него делаешь: не стоит целенаправленно
                  искать запрещённый контент. Tuna — это инструмент доступа к открытому интернету, а
                  что открывать — решаешь ты.
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
                  Потому что операторы научились распознавать обычный VPN-трафик по характерным
                  признакам и резать такие соединения — стандартные протоколы вроде OpenVPN и WireGuard
                  так и «отваливаются». Tuna использует несколько протоколов с маскировкой: трафик
                  выглядит как обычная загрузка сайтов, и его не отличают от неё. А когда становится
                  сложнее, мы быстро выкатываем обновление — поэтому Tuna остаётся на связи там, где
                  другие уже красные.
                </p>
              </details>
              <details className="q">
                <summary>
                  Как понять, что VPN вообще будет работать в России?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Смотри не на бренд, а на протокол. Сейчас в России стабильно работают только VPN,
                  которые маскируют трафик под обычный HTTPS — например, на протоколах вроде
                  VLESS+Reality или AmneziaWG. Именно на таких протоколах построена Tuna, поэтому она
                  работает там, где стандартные VPN не работают. Второй важный фактор — как быстро
                  сервис приходит в норму, если что-то меняется; у нас это происходит очень быстро.
                </p>
              </details>
              <details className="q">
                <summary>
                  А у моего оператора — МТС, МегаФон, Билайн, Tele2 — будет работать?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Да — Tuna рассчитана на всех крупных операторов: МТС, МегаФон, Билайн, Tele2,
                  Ростелеком. Ограничения у операторов разные и постоянно меняются, поэтому если у
                  твоего вдруг что-то отключат — ты в пару тапов переключаешь сервер или протокол и
                  снова в сети.
                </p>
              </details>
              <details className="q">
                <summary>
                  С включённым VPN не открываются банки и маркетплейсы. Что делать?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Чаще всего это не поломка твоего VPN. С весны 2026 года российские сервисы — банки,
                  маркетплейсы, Яндекс — начали ограничивать доступ, если видят включённый VPN. С Tuna
                  это в основном не проблема: российские сайты и приложения работают как будто VPN
                  выключен, а всё остальное — через защищённое подключение.
                </p>
                <p>
                  Иногда отдельное приложение всё же показывает плашку «Выключите VPN» — оно смотрит не
                  на локацию, а на сам факт включённого VPN, и обойти это нельзя ни одним VPN. Твоя
                  локация при этом остаётся российской; если приложение упирается, на пару минут VPN
                  можно выключить и включить обратно.
                </p>
              </details>
              <details className="q">
                <summary>
                  Нужен ли Telegram, чтобы подключиться?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Нет. У многих VPN доступ выдают только через Telegram-бота — а если сам Telegram
                  недоступен, получается замкнутый круг. У Tuna так не выйдет: подключиться можно и
                  через сайт, и через Telegram-бота — как тебе удобнее. Сайт открывается без
                  мессенджера, так что регистрация, подписка, настройка и управление доступны в любом
                  случае.
                </p>
              </details>
              <details className="q">
                <summary>
                  Не будет ли Tuna тормозить? А для игр подойдёт?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Маскирующие протоколы, на которых работает Tuna, лёгкие — на скорость они почти не
                  влияют, видео и звонки идут без просадок. Если конкретный сервер вдруг подтормаживает,
                  в пару тапов меняешь локацию или протокол. Для игр и звонков выбирай локацию поближе:
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
                  Число устройств зависит от типа подписки — вплоть до 15 на самой премиальной.
                  Подключать можно в любом сочетании: телефон, ноутбук, планшет, компьютер, телевизор.
                  Приложения есть под все популярные платформы — Windows, macOS, iOS, Android и Smart TV,
                  так что одного аккаунта хватает на всю технику дома.
                </p>
              </details>
              <details className="q">
                <summary>
                  А если не заработает? Есть пробный период?{" "}
                  <span className="chev" aria-hidden="true" />
                </summary>
                <p>
                  Есть — 3 дня бесплатно и без карты. Так ты спокойно проверяешь всё до оплаты.
                  Настраивать вручную ничего не нужно: подписка добавляется в приложение Happ одним
                  нажатием. А если у твоего оператора что-то не пошло — в пару тапов меняешь локацию
                  или протокол, поддержка подскажет на любом шаге.
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
            <div className="final-depth mono">−4000 м · открытая вода</div>
            <h2>Открытый океан ждёт</h2>
            <p>3 дня бесплатно. Без карты. Мы уверены в своём качестве.</p>
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
