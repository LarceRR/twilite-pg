import { create } from "zustand";

type PixelObjectEditState = {
  /** When set, catalog submit uses PATCH /pixel-objects/:id. */
  editingObjectId: string | null;
  title: string;
  sourceStatus: "pending" | "published" | "rejected" | null;
  setEditingObject: (input: {
    id: string;
    title: string;
    status: "pending" | "published" | "rejected";
  }) => void;
  setTitle: (title: string) => void;
  clearEditingObject: () => void;
};

export const usePixelObjectEditStore = create<PixelObjectEditState>((set) => ({
  editingObjectId: null,
  title: "",
  sourceStatus: null,
  setEditingObject: ({ id, title, status }) =>
    set({ editingObjectId: id, title, sourceStatus: status }),
  setTitle: (title) => set({ title }),
  clearEditingObject: () => set({ editingObjectId: null, title: "", sourceStatus: null }),
}));
