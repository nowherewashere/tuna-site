import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      <nav className="site">
        <div className="wrap">
          <div className="logo">Tuna VPN</div>
          <div className="nav-links">
            <a href="#why">Почему Tuna</a>
            <a href="#how">Подключение</a>
            <a href="#faq">Вопросы</a>
            <Link className="btn btn-ghost" style={{ padding: "9px 18px" }} href="/login">
              Войти
            </Link>
          </div>
        </div>
      </nav>

      <header className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hero-tuna" src="/assets/images/hero-tuna.png" alt="Tuna" />
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <div className="eyebrow">
                <span className="dot" /> Открытый интернет за минуту
              </div>
              <h1 className="hero-title">
                Tuna <span className="amber">VPN</span>
              </h1>
              <p className="hero-sub">
                Рассекаем волны блокировок. VPN работает, пока другие отваливаются.
              </p>
              <div className="hero-cta">
                <Link className="btn btn-amber btn-lg" href="/connect">
                  🚀 Подключить
                </Link>
                <Link className="btn btn-ghost btn-lg" href="/login">
                  Войти
                </Link>
              </div>
              <p className="hero-note">
                Пробный период <span className="mono">24 часа</span> · без карты · до 3 устройств
              </p>
            </div>
            <div className="hero-visual" />
          </div>

          <div className="steps" id="how">
            <div className="steps-head">Подключение за 3 шага</div>
            <div className="steps-row">
              <div className="step">
                <div className="n">01</div>
                <div className="emoji">✉️</div>
                <h3>Получи доступ</h3>
                <p>Регистрируешься — мы сразу выдаём подписку. Можно без почты.</p>
              </div>
              <div className="step">
                <div className="n">02</div>
                <div className="emoji">📲</div>
                <h3>Установи Happ</h3>
                <p>Приложение, через которое работает VPN. Ссылка под твою платформу.</p>
              </div>
              <div className="step">
                <div className="n">03</div>
                <div className="emoji">✅</div>
                <h3>Добавь VPN профиль</h3>
                <p>Одно нажатие — всё настроится само. Пользуйся интернетом без ограничений.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="why" id="why">
        <div className="wrap">
          <div className="sec-eyebrow">Почему Tuna VPN?</div>
          <h2 className="sec-title">Свободный доступ к мировому интернету</h2>
          <p className="sec-intro">
            Туннелирование и обфускация под операторов. Когда блокировки усиливаются — Tuna VPN
            подстраивается, а ты остаёшься в сети.
          </p>
          <div className="feat-grid">
            <div className="feat">
              <span className="ic">🐟</span>
              <div>
                <h3>Умный обход блокировок</h3>
                <p>
                  Несколько протоколов и маскировка трафика — работает там, где обычные VPN
                  отваливаются.
                </p>
              </div>
            </div>
            <div className="feat">
              <span className="ic">⚡</span>
              <div>
                <h3>Быстро и удобно</h3>
                <p>Подключение за минуту, автоподбор лучшего сервера. Никаких ручных настроек.</p>
              </div>
            </div>
            <div className="feat">
              <span className="ic">📱</span>
              <div>
                <h3>Единый доступ на всё</h3>
                <p>Телефон, ноутбук, телевизор — до 3 устройств на одной подписке.</p>
              </div>
            </div>
            <div className="feat">
              <span className="ic">🔄</span>
              <div>
                <h3>Автообновление</h3>
                <p>Никаких запутанных интерфейсов — все обновления подключаются сами.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq">
        <div className="wrap">
          <div className="sec-eyebrow">Вопросы</div>
          <h2 className="sec-title">Коротко о главном</h2>
          <p className="sec-intro">Если остались вопросы — поддержка на связи и отвечает быстро.</p>
          <div className="faq-list">
            <details className="q" open>
              <summary>
                Это легально для меня? <span className="chev">＋</span>
              </summary>
              <p>
                Использование VPN частным лицом в России не образует состава правонарушения. Tuna —
                инструмент доступа к открытому интернету, ответственность за контент остаётся на
                пользователе.
              </p>
            </details>
            <details className="q">
              <summary>
                Почему другие VPN перестают работать? <span className="chev">＋</span>
              </summary>
              <p>
                Операторы и РКН учатся распознавать и резать VPN-трафик. Tuna использует несколько
                протоколов и маскировку под обычный трафик, а при усилении блокировок быстро
                выкатывает обновление.
              </p>
            </details>
            <details className="q">
              <summary>
                Это безопасно? <span className="chev">＋</span>
              </summary>
              <p>
                Трафик шифруется, мы не ведём логи вашей активности. Точные формулировки — в политике
                конфиденциальности.
              </p>
            </details>
            <details className="q">
              <summary>
                Нужен ли Telegram? <span className="chev">＋</span>
              </summary>
              <p>
                Нет. Доступ полностью работает через сайт: регистрация, оплата, выдача конфига и
                управление подпиской. Telegram можно привязать по желанию.
              </p>
            </details>
            <details className="q">
              <summary>
                А если не заработает? <span className="chev">＋</span>
              </summary>
              <p>
                В пару тапов меняется локация или протокол, а поддержка помогает с любым шагом.
                Пробный период — чтобы проверить всё до оплаты.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <span className="fishmoji">🐟</span>
          <h2>Открытый океан ждёт</h2>
          <p>Сутки бесплатно. Без карты. Мы уверены в своём качестве.</p>
          <Link className="btn btn-amber btn-lg" href="/connect">
            🚀 Подключить
          </Link>
        </div>
      </section>

      <footer className="site">
        <div className="wrap">
          <div className="foot-grid">
            <div className="logo">Tuna VPN</div>
            <div className="foot-links">
              <a href="#">Поддержка</a>
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
