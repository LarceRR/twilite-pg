import { useState } from "react";

import { signInWithPassword } from "@/shared/api/auth";
import { completeLogin } from "@/shared/store/session";
import { toast } from "@/shared/ui/Toast";

export function usePasswordLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);

    try {
      await signInWithPassword(email.trim(), password);
      await completeLogin();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Не удалось войти");
    } finally {
      setPending(false);
    }
  };

  return { email, password, pending, setEmail, setPassword, submit };
}
