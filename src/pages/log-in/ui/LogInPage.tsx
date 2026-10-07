import { useState } from "react";
import { Navigate, useSearchParams } from "react-router";

import Logo from "@/shared/ui/logo/Logo";
import { useSessionStore } from "@/shared/store/session";
import { safeInternalPath } from "@/shared/lib/auth/safeRedirect";

import { usePasswordLogin } from "../model/usePasswordLogin";
import { useQrLogin } from "../model/useQrLogin";
import "./LogInPage.scss";
import { RotateCcw } from "lucide-react";

export default function LogInPage() {
  const user = useSessionStore((state) => state.user);
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"qr" | "password">("qr");
  const [showHowTo, setShowHowTo] = useState(false);
  const qr = useQrLogin(mode === "qr" && user === null);
  const password = usePasswordLogin();

  if (user) {
    return <Navigate to={safeInternalPath(searchParams.get("next"))} replace />;
  }

  return (
    <section className="login-page">
      <div className="login-page__container">
        <div className="login-page__container-left">
          <video
            src="left-auth-video.mp4"
            className="login-page__container-left-video"
            muted
            autoPlay
            loop
          ></video>
          <div className="login-page__container-left-content-wrapper">
            <Logo height={48} width={48} />
            <div className="login-page__container-left-content">
              <h1 className="login-page__container-left-title">Twilite Pixelart Generator</h1>
              <p className="login-page__container-left-description">
                Your imagination is someone's reality.
              </p>
            </div>
          </div>
          <div className="login-page__container-left-content-exploration">
            <h2 className="login-page__container-left-content-exploration-title">
              Become an artist of people's history
            </h2>
            <p className="login-page__container-left-content-exploration-description">
              Create beautiful and memorisable arts users can use in our app
            </p>
            <div className="login-page__container-left-content-exploration-images">
              <img src="/exploration/exploration_1.jpg" alt="Pixel Art 1" width={100} height={100} />
              <img src="/exploration/exploration_2.jpg" alt="Pixel Art 2" width={100} height={100} />
              <img src="/exploration/exploration_3.jpg" alt="Pixel Art 3" width={100} height={100} />
              <img src="/exploration/exploration_1.jpg" alt="Pixel Art 1" width={100} height={100} />
            </div>
          </div>
        </div>
        <div className="login-page__container-right">
          {mode === "qr" ? (
            <>
              <div className="login-page__container-right-qr-code" aria-live="polite">
                {qr.view.kind === "ready" ? (
                  <img src={qr.view.qrDataUrl} alt="QR code to sign in with the Twilite app" />
                ) : qr.view.kind === "approved" ? (
                  <p className="login-page__status">Вход выполнен</p>
                ) : qr.view.kind === "denied" ? (
                  <p className="login-page__status">Вход отклонён</p>
                ) : qr.view.kind === "error" ? (
                  <p className="login-page__status login-page__status--error">{qr.view.message}</p>
                ) : (
                  <p className="login-page__status">Готовим QR-код…</p>
                )}
                
                {qr.view.kind === "denied" || qr.view.kind === "error" ? (
                <button type="button" className="login-page__retry" onClick={() => void qr.retry()}>
                    <RotateCcw color="black"
                     size={20}/>
                  </button>
                ) : null}
              </div>
              <div className="login-page__container-right-content">
                <h1 className="login-page__container-right-title">Welcome back</h1>
                <p className="login-page__container-right-description">
                  {qr.view.kind === "ready" && qr.view.scanned
                    ? "Подтвердите вход в приложении Twilite"
                    : "Scan QR code in your Twilite App to login"}
                  <button
                    type="button"
                    className="login-page__container-right-description-how"
                    onClick={() => setShowHowTo((open) => !open)}
                  >
                    How to scan?
                  </button>
                </p>
                {showHowTo ? (
                  <ol className="login-page__howto">
                    <li>Откройте приложение Twilite на телефоне, где вы уже вошли.</li>
                    <li>В профиле нажмите «Войти на компьютере» и наведите камеру приложения на этот QR-код. Системную камеру не используйте.</li>
                    <li>Проверьте устройство и подтвердите вход только если это вы.</li>
                  </ol>
                ) : null}
                <p className="login-page__container-right-phonewrapper">
                  or
                  <button
                    type="button"
                    className="login-page__container-right-phonewrapper-phone"
                    onClick={() => setMode("password")}
                  >
                    login via email and password
                  </button>
                </p>
              </div>
            </>
          ) : (
            <form
              className="login-page__form"
              onSubmit={(event) => {
                event.preventDefault();
                void password.submit();
              }}
            >
              <h1 className="login-page__container-right-title">Welcome back</h1>
              <label className="login-page__field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  value={password.email}
                  onChange={(event) => password.setEmail(event.target.value)}
                  required
                />
              </label>
              <label className="login-page__field">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password.password}
                  onChange={(event) => password.setPassword(event.target.value)}
                  required
                  minLength={1}
                />
              </label>
              <button type="submit" className="login-page__submit" disabled={password.pending}>
                {password.pending ? "Входим…" : "Войти"}
              </button>
              <button type="button" className="login-page__retry" onClick={() => setMode("qr")}>
                Вернуться к QR-коду
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
