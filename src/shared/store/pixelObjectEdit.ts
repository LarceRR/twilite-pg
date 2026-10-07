import { create } from "zustand";

import type { PixelObjectType } from "@/shared/pixelObject/objectType";

type PixelObjectEditState = {
  /** When set, catalog submit uses PATCH /pixel-objects/:id. */
  editingObjectId: string | null;
  projectId: string | null;
  objectType: PixelObjectType | null;
  title: string;
  sourceStatus: "pending" | "published" | "rejected" | null;
  setEditingObject: (input: {
    id: string;
    projectId: string;
    title: string;
    objectType: PixelObjectType;
    status: "pending" | "published" | "rejected";
  }) => void;
  setTitle: (title: string) => void;
  clearEditingObject: () => void;
};

export const usePixelObjectEditStore = create<PixelObjectEditState>((set) => ({
  editingObjectId: null,
  projectId: null,
  objectType: null,
  title: "",
  sourceStatus: null,
  setEditingObject: ({ id, projectId, title, objectType, status }) =>
    set({ editingObjectId: id, projectId, title, objectType, sourceStatus: status }),
  setTitle: (title) => set({ title }),
  clearEditingObject: () =>
    set({
      editingObjectId: null,
      projectId: null,
      objectType: null,
      title: "",
      sourceStatus: null,
    }),
}));
