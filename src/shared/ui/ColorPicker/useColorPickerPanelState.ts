import { useCallback, useEffect, useRef, useState } from "react";
import {
  hexToHsv,
  hsvMatchesHex,
  hsvToHex,
  normalizeHex,
  type Hsv,
} from "./colorMath";

type UseColorPickerPanelStateOptions = {
  committedHex: string;
  open: boolean;
};

export function useColorPickerPanelState({ committedHex, open }: UseColorPickerPanelStateOptions) {
  const normalized = normalizeHex(committedHex);
  const hsvMemoryRef = useRef<Hsv>(hexToHsv(normalized));
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(normalized));

  useEffect(() => {
    if (open) {
      return;
    }
    const next = hexToHsv(normalized);
    hsvMemoryRef.current = next;
    setHsv(next);
  }, [normalized, open]);

  useEffect(() => {
    if (!hsvMatchesHex(hsvMemoryRef.current, normalized)) {
      const derived = hexToHsv(normalized);
      hsvMemoryRef.current = derived;
      setHsv(derived);
    }
  }, [normalized, hsv]);

  const commitHsv = useCallback(
    (next: Hsv): string | null => {
      hsvMemoryRef.current = next;
      setHsv(next);
      const hex = hsvToHex(next);
      if (hex === normalized) {
        return null;
      }
      return hex;
    },
    [normalized],
  );

  const setHue = useCallback(
    (hue: number) => {
      const next: Hsv = { ...hsvMemoryRef.current, h: hue };
      return commitHsv(next);
    },
    [commitHsv],
  );

  const setSaturationValue = useCallback(
    (s: number, v: number) => {
      const next: Hsv = { ...hsvMemoryRef.current, s, v };
      return commitHsv(next);
    },
    [commitHsv],
  );

  return {
    hsv,
    hsvMemoryRef,
    setHue,
    setSaturationValue,
    previewHex: hsvToHex(hsvMemoryRef.current),
  };
}
