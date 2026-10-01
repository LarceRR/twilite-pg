import { RouterProvider } from "react-router";
import { router } from "./providers/router";
import { ThemeProvider } from "@/shared/lib/theme/ThemeContext";
import { useAdaptiveSizes } from "@/shared/hooks/useAdaptiveSizes";
import { useSessionBootstrap } from "@/app/providers/useSessionBootstrap";
import './App.scss'

function App() {
  const adaptiveSize = useAdaptiveSizes();
  const sessionReady = useSessionBootstrap();

  return (
    <ThemeProvider>
      {adaptiveSize === "desktop" || adaptiveSize === "laptop" ? (
        sessionReady ? (
          <RouterProvider router={router} />
        ) : (
          <h1 className="login-page-not-desktop">Загрузка сессии…</h1>
        )
      ) : (
        <h1 className="login-page-not-desktop">Available only on laptop or desktop</h1>
      )}
    </ThemeProvider>
  );
}

export default App;
