import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

import { pollQrLogin, startQrLogin, type QrLoginStart } from "@/shared/api/auth";
import { completeLogin } from "@/shared/store/session";

const POLL_MS = 2_000;
const REFRESH_BEFORE_MS = 2_000;

export type QrLoginView =
  | { kind: "loading" }
  | { kind: "ready"; qrDataUrl: string; expiresAt: string; scanned: boolean }
  | { kind: "denied" }
  | { kind: "error"; message: string }
  | { kind: "approved" };

export function useQrLogin(enabled: boolean) {
  const [view, setView] = useState<QrLoginView>({ kind: "loading" });
  const challengeRef = useRef<QrLoginStart | null>(null);
  const generationRef = useRef(0);

  const begin = useCallback(async () => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setView({ kind: "loading" });

    try {
      const started = await startQrLogin();
      if (generation !== generationRef.current) {
        return;
      }

      const qrDataUrl = await QRCode.toDataURL(started.qrPayload, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#111111", light: "#ffffff" },
      });

      if (generation !== generationRef.current) {
        return;
      }

      challengeRef.current = started;
      setView({ kind: "ready", qrDataUrl, expiresAt: started.expiresAt, scanned: false });
    } catch (error) {
      if (generation !== generationRef.current) {
        return;
      }

      setView({
        kind: "error",
        message: error instanceof Error ? error.message : "Не удалось создать QR-код",
      });
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void begin();

    return () => {
      generationRef.current += 1;
    };
  }, [begin, enabled]);

  useEffect(() => {
    if (!enabled || view.kind !== "ready") {
      return;
    }

    let cancelled = false;
    let timeoutId = 0;

    const tick = async () => {
      const challenge = challengeRef.current;

      if (cancelled || challenge === null) {
        return;
      }

      if (Date.parse(challenge.expiresAt) - Date.now() <= REFRESH_BEFORE_MS) {
        await begin();
        return;
      }

      try {
        const status = await pollQrLogin(challenge.challengeId, challenge.pollToken);

        if (cancelled) {
          return;
        }

        if (status.status === "approved") {
          await completeLogin();
          setView({ kind: "approved" });
          return;
        }

        if (status.status === "denied") {
          setView({ kind: "denied" });
          return;
        }

        if (status.status === "expired") {
          await begin();
          return;
        }

        if (status.status === "scanned") {
          setView((current) =>
            current.kind === "ready" ? { ...current, scanned: true } : current,
          );
        }
      } catch (error) {
        if (!cancelled) {
          setView({
            kind: "error",
            message: error instanceof Error ? error.message : "Потеряно соединение",
          });
        }
        return;
      }

      timeoutId = window.setTimeout(() => {
        void tick();
      }, POLL_MS);
    };

    timeoutId = window.setTimeout(() => {
      void tick();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [begin, enabled, view.kind]);

  return { view, retry: begin };
}
