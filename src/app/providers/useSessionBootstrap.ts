import { useEffect, useState } from "react";

import { bootstrapSession } from "@/shared/store/session";

export function useSessionBootstrap(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void bootstrapSession().finally(() => {
      if (!cancelled) {
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
