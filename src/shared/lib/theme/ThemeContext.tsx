import React, { createContext, useContext, useEffect, useState } from "react";
import { type Theme } from "./types";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: (x?: number, y?: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getInitialTheme = (): Theme => {
  const saved = localStorage.getItem("theme") as Theme | null;
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // Основная функция переключения с анимацией
  const toggleTheme = (x?: number, y?: number) => {
    const newTheme = theme === "light" ? "dark" : "light";

    if (document.startViewTransition) {
      // Координаты: если переданы – используем их, иначе центр экрана
      const cx = x ?? window.innerWidth / 2;
      const cy = y ?? window.innerHeight / 2;
      // Максимальный радиус для полного покрытия
      const endRadius = Math.hypot(
        Math.max(cx, window.innerWidth - cx),
        Math.max(cy, window.innerHeight - cy),
      );

      // Для эффекта сетки используем polygon, который стартует с маленького квадрата
      // и расширяется до полного экрана. Размер ячейки — 50px, регулируйте под свой дизайн.
      const cellSize = 50;
      const startX = Math.floor(cx / cellSize) * cellSize;
      const startY = Math.floor(cy / cellSize) * cellSize;
      const cols = Math.ceil(window.innerWidth / cellSize);
      const rows = Math.ceil(window.innerHeight / cellSize);
      // Строим polygon: от левого верхнего угла ячейки до правого нижнего
      // Но для анимации проще использовать квадрат, который растёт, но сохраняет форму.
      // Альтернатива: использовать clip-path с inset, который расширяется от точки.
      // Для имитации сетки сделаем анимацию через @keyframes в CSS, но ViewTransition
      // позволяет только один ключевой кадр. Поэтому используем простой прямоугольник,
      // который растёт от точки, но с острыми углами (как сетка).
      // Можно использовать clip-path: polygon(...) с 4 точками, который растёт.
      // Для простоты я предлагаю оставить круг (самый плавный), но если нужна именно сетка,
      // то можно использовать квадрат с жёсткими границами:
      // clip-path: inset(calc(100% - ...)) — но это сложно.
      // Лучше использовать circle, но с быстрым затуханием, и добавить CSS-эффект сетки отдельно.
      // Я предлагаю использовать circle, а для сетки просто настроить easing и длительность.
      // Если вы настаиваете на сетке, можно использовать следующий polygon:

      // Для демонстрации я оставляю circle, но если хотите сетку — раскомментируйте блок с polygon
      // и закомментируйте circle.

      document
        .startViewTransition(() => {
          setTheme(newTheme);
        })
        .ready.then(() => {
          // Вариант 1: круг (работает везде)
          document.documentElement.animate(
            [
              { clipPath: `circle(0px at ${cx}px ${cy}px)` },
              { clipPath: `circle(${endRadius}px at ${cx}px ${cy}px)` },
            ],
            {
              duration: 500,
              easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              pseudoElement: "::view-transition-new(root)",
            },
          );

          // Вариант 2: сетка (квадрат с острыми углами) — эффект ячеек
          // Раскомментируйте этот блок и закомментируйте предыдущий
          /*
        const size = 20; // начальный размер квадрата
        const maxSize = Math.max(window.innerWidth, window.innerHeight) * 2;
        document.documentElement.animate(
          [
            { clipPath: `inset(${cy - size/2}px ${window.innerWidth - cx - size/2}px ${window.innerHeight - cy - size/2}px ${cx - size/2}px)` },
            { clipPath: `inset(0px 0px 0px 0px)` },
          ],
          {
            duration: 600,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            pseudoElement: '::view-transition-new(root)',
          }
        );
        */
        });
    } else {
      // Fallback без анимации
      setTheme(newTheme);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
