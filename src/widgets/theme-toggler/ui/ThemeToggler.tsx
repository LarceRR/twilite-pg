import React from "react";
import { useTheme } from "@/shared/lib/theme/ThemeContext";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    toggleTheme(x, y);
  };

  return (
    <button onClick={handleClick} aria-label="Переключить тему">
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
};
