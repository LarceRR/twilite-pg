import { useState } from "react";

import { signInWithPassword } from "@/shared/api/auth";
import { completeLogin } from "@/shared/store/session";

export function usePasswordLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setError(null);
    setPending(true);

    try {
      await signInWithPassword(email.trim(), password);
      await completeLogin();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось войти");
    } finally {
      setPending(false);
    }
  };

  return { email, password, error, pending, setEmail, setPassword, submit };
}
