import { create } from "zustand";
import type { SidebarState } from "./types";

export const useSidebarStore = create<SidebarState>((set) => ({
  isSidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ isSidebarOpen: sidebarOpen }),
}));
