import "./CabinetPage.scss";

import { ImagePlus, Trash2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { ApiError } from "@/shared/api/http";
import { updateProfile, uploadAvatarFile } from "@/shared/api/users";
import { userInitials } from "@/shared/lib/auth/userInitials";
import { signOut, useSessionStore } from "@/shared/store/session";
import LiquidGlassButton from "@/shared/ui/LiquidGlassButton/LiquidGlassButton";
import Logo from "@/shared/ui/logo/Logo";

const CabinetPage: React.FC = () => {
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const hasAvatar = typeof user?.avatarUrl === "string" && user.avatarUrl.length > 0;
  const showPhoto = hasAvatar && !avatarBroken;

  useEffect(() => {
    setAvatarBroken(false);
  }, [user?.avatarUrl]);

  async function onFileChosen(file: File | undefined): Promise<void> {
    if (!file) return;

    setBusy(true);
    setError(null);
    setSheetOpen(false);

    try {
      setUser(await uploadAvatarFile(file));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Не удалось обновить аватар";
      setError(message);
    } finally {
      setBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function onRemove(): Promise<void> {
    setBusy(true);
    setError(null);
    setSheetOpen(false);

    try {
      setUser(await updateProfile({ avatarUrl: null }));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Не удалось удалить аватар";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cabinet">
      <header className="cabinet__top">
        <Logo width={36} height={36} />
        <h1 className="cabinet__title">Профиль</h1>
      </header>

      <section className="cabinet__identity">
        <button
          type="button"
          className="cabinet__identity-hit"
          disabled={!user || busy}
          onClick={() => setSheetOpen(true)}
          aria-label="Изменить фото профиля"
        >
          <div className="cabinet__avatar" aria-hidden>
            {showPhoto ? (
              <img
                src={user!.avatarUrl!}
                alt=""
                className="cabinet__avatar-img"
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <span className="cabinet__avatar-initials">
                {userInitials(user?.displayName ?? "TP")}
              </span>
            )}
          </div>
          <div className="cabinet__identity-text">
            <strong className="cabinet__name">{user?.displayName ?? "Аккаунт"}</strong>
            <span className="cabinet__email">{user?.email ?? "—"}</span>
          </div>
        </button>
        {error ? <p className="cabinet__error">{error}</p> : null}
        {busy ? <p className="cabinet__hint">Загружаем…</p> : null}
      </section>

      <div className="cabinet__actions">
        <LiquidGlassButton
          text="Выйти"
          action={() => {
            void signOut();
          }}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="cabinet__file"
        onChange={(event) => {
          void onFileChosen(event.target.files?.[0]);
        }}
      />

      {sheetOpen ? (
        <div className="cabinet-sheet" role="presentation">
          <button
            type="button"
            className="cabinet-sheet__backdrop"
            aria-label="Закрыть"
            onClick={() => setSheetOpen(false)}
          />
          <div className="cabinet-sheet__panel" role="dialog" aria-label="Фото профиля">
            <div className="cabinet-sheet__handle" />
            <h2 className="cabinet-sheet__title">Фото профиля</h2>
            <p className="cabinet-sheet__caption">Квадратный кадр · до 2 МБ · JPEG, PNG или WebP</p>
            <button
              type="button"
              className="cabinet-sheet__row"
              disabled={busy}
              onClick={() => {
                setSheetOpen(false);
                requestAnimationFrame(() => fileInputRef.current?.click());
              }}
            >
              <ImagePlus size={18} />
              <span>Обновить фотографию</span>
            </button>
            {hasAvatar ? (
              <button
                type="button"
                className="cabinet-sheet__row cabinet-sheet__row--danger"
                disabled={busy}
                onClick={() => {
                  void onRemove();
                }}
              >
                <Trash2 size={18} />
                <span>Удалить</span>
              </button>
            ) : null}
            <button
              type="button"
              className="cabinet-sheet__cancel"
              onClick={() => setSheetOpen(false)}
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CabinetPage;
