import { createBrowserRouter } from "react-router";
import { Layout } from "@/shared/ui/Layout/Layout";
import { HomePage } from "@/pages/home";
import { CabinetPage } from "@/pages/cabinet";
import { AppRoutes } from "@/shared/const/routes";
import { EditorPage } from "@/pages/new-project";
import { MyProjectsPage } from "@/pages/my-projects";
import LucideIconsPage from "@/pages/lucide-icons/ui/LucideIconsPage";
import { LogInPage } from "@/pages/log-in";
import { ThemeStudioPage } from "@/pages/theme-studio";
import { ThemeModerationPage } from "@/pages/theme-moderation";
import { PixelObjectModerationPage } from "@/pages/pixel-object-moderation";
import { ObjectCatalogPage } from "@/pages/object-catalog";
import { RequireAuth } from "@/app/providers/RequireAuth";
import { RequirePermission } from "@/app/providers/RequirePermission";
import { TPG_PERMISSIONS } from "@/shared/lib/rbac";

export const router = createBrowserRouter([
  {
    path: AppRoutes[3].routes.LOGIN.path,
    element: <LogInPage />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      {
        path: AppRoutes[0].routes.MYPROJECTS.path,
        element: (
          <RequirePermission permission={TPG_PERMISSIONS.EDITOR_VIEW}>
            <MyProjectsPage />
          </RequirePermission>
        ),
      },
      {
        path: AppRoutes[0].routes.MYOBJECTS.path,
        element: (
          <RequirePermission
            anyOf={[TPG_PERMISSIONS.PIXEL_OBJECTS_SUBMIT, TPG_PERMISSIONS.PIXEL_OBJECTS_CREATE]}
          >
            <ObjectCatalogPage mode="mine" />
          </RequirePermission>
        ),
      },
      {
        path: AppRoutes[0].routes.DISCOVER.path,
        element: (
          <RequirePermission permission={TPG_PERMISSIONS.PIXEL_OBJECTS_READ}>
            <ObjectCatalogPage mode="catalog" />
          </RequirePermission>
        ),
      },
      {
        path: AppRoutes[0].routes.NEWPROJECT.path,
        element: (
          <RequirePermission
            anyOf={[
              TPG_PERMISSIONS.PIXEL_OBJECTS_CREATE,
              TPG_PERMISSIONS.PIXEL_OBJECTS_SUBMIT,
              TPG_PERMISSIONS.EDITOR_VIEW,
            ]}
          >
            <EditorPage />
          </RequirePermission>
        ),
      },
      { path: AppRoutes[0].routes.ICONS.path, element: <LucideIconsPage /> },
      { path: AppRoutes[1].routes.FAVORITES.path, element: <span>Favorities</span> },
      { path: AppRoutes[1].routes.COLLECTIONS.path, element: <span>Collections</span> },
      { path: AppRoutes[1].routes.TEMPLATES.path, element: <span>Templates</span> },
      { path: AppRoutes[2].routes.IMAGEIMPORT.path, element: <span>Import image</span> },
      {
        path: AppRoutes[2].routes.COLPALETTES.path,
        element: (
          <RequirePermission allOf={[TPG_PERMISSIONS.THEMES_CREATE]}>
            <ThemeStudioPage />
          </RequirePermission>
        ),
      },
      {
        path: AppRoutes[2].routes.THEMEMODERATION.path,
        element: (
          <RequirePermission allOf={[TPG_PERMISSIONS.THEMES_MODERATE]}>
            <ThemeModerationPage />
          </RequirePermission>
        ),
      },
      {
        path: AppRoutes[2].routes.OBJECTMODERATION.path,
        element: (
          <RequirePermission allOf={[TPG_PERMISSIONS.PIXEL_OBJECTS_MODERATE]}>
            <PixelObjectModerationPage />
          </RequirePermission>
        ),
      },
      { path: AppRoutes[3].routes.CABINET.path, element: <CabinetPage /> },
    ],
  },
]);
