import { Outlet, useLocation } from "react-router";
import Navbar from "@/shared/ui/Navbar/Navbar";
import Sidebar from "../Sidebar/Sidebar";
import "./Layout.scss";
import { useSidebarStore } from "@/shared/store/sidebar";
import { useEffect } from "react";
import { AppRoutes } from "@/shared/const/routes";

export const Layout = () => {

  const sidebarMode = useSidebarStore((state) => state.isSidebarOpen)
  const setSidebarOpen = useSidebarStore((state) => state.setSidebarOpen)

  const { pathname } = useLocation()
  const editorPath = AppRoutes[0].routes.NEWPROJECT.path

  useEffect(() => {
    setSidebarOpen(pathname !== editorPath)
  }, [pathname, editorPath, setSidebarOpen])
  
  return (
    <div className="layout">
      <Navbar />
      <div className="layout__body">
        <Sidebar isCollapsed={sidebarMode}/>
        <main className="layout__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
