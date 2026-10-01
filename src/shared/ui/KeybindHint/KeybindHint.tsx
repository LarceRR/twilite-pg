import { formatHotkeyParts } from "@/shared/lib/hotkeys";
import { useOperatingSystem } from "@/shared/hooks/useOperatingSystem";
import { isAppleOS } from "@/shared/lib/os/detectOperatingSystem";
import { Command } from "lucide-react";
import "./KeybindHint.scss";

export interface KeybindHintProps {
  hotkey: string;
  className?: string;
}

export default function KeybindHint({
  hotkey,
  className = "",
}: KeybindHintProps) {
  const os = useOperatingSystem();
  const parts = formatHotkeyParts(hotkey, os);

  return (
    <div
      className={`keybind-hint ${className}`.trim()}
      aria-hidden
      title={parts.map((part) => part.label).join("+")}
    >
      {parts.map((part, index) => (
        <span key={`${part.type}-${index}`} className="keybind-hint__part">
          {part.type === "mod" && isAppleOS(os) ? (
            <Command size={14} />
          ) : (
            <span>{part.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
