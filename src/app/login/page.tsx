import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="login">
      <div className="wrap">
        <div className="login-card">
          <span className="fishmoji">🐟</span>
          <h2>Вход в Tuna</h2>
          <p className="lead">Введи почту — пришлём ссылку для входа. Без пароля.</p>
          <div className="field-row">
            <input className="field" type="email" placeholder="твой@email.ру" />
          </div>
          <button className="btn btn-amber btn-full btn-lg">Получить ссылку</button>
          <p className="onb-alt" style={{ marginTop: 20 }}>
            или <a>войти по паролю</a> · <Link href="/connect">без почты</Link>
          </p>
          <p className="turnstile-note">🛡 Cloudflare Turnstile</p>
        </div>
      </div>
    </div>
  );
}
