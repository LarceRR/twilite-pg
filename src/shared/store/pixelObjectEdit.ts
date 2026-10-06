import { create } from "zustand";

type PixelObjectEditState = {
  /** When set, catalog submit uses PATCH /pixel-objects/:id. */
  editingObjectId: string | null;
  projectId: string | null;
  title: string;
  sourceStatus: "pending" | "published" | "rejected" | null;
  setEditingObject: (input: {
    id: string;
    projectId: string;
    title: string;
    status: "pending" | "published" | "rejected";
  }) => void;
  setTitle: (title: string) => void;
  clearEditingObject: () => void;
};

export const usePixelObjectEditStore = create<PixelObjectEditState>((set) => ({
  editingObjectId: null,
  projectId: null,
  title: "",
  sourceStatus: null,
  setEditingObject: ({ id, projectId, title, status }) =>
    set({ editingObjectId: id, projectId, title, sourceStatus: status }),
  setTitle: (title) => set({ title }),
  clearEditingObject: () =>
    set({ editingObjectId: null, projectId: null, title: "", sourceStatus: null }),
}));
