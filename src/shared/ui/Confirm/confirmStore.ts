import { create } from "zustand";

import type { ConfirmRequest } from "./confirmTypes";

type Resolver = (value: boolean) => void;

type ConfirmStoreState = {
  current: ConfirmRequest | null;
  queue: ConfirmRequest[];
  /** Resolvers keyed by request id. Kept outside React state updates on purpose. */
  resolvers: Map<string, Resolver>;
  enqueue: (request: ConfirmRequest, resolve: Resolver) => void;
  settle: (id: string, confirmed: boolean) => void;
  /** Immediate clear without resolving (tests). */
  reset: () => void;
};

function advance(queue: ConfirmRequest[]): {
  current: ConfirmRequest | null;
  queue: ConfirmRequest[];
} {
  if (queue.length === 0) {
    return { current: null, queue: [] };
  }
  const [current, ...rest] = queue;
  return { current, queue: rest };
}

export const useConfirmStore = create<ConfirmStoreState>((set, get) => ({
  current: null,
  queue: [],
  resolvers: new Map(),
  enqueue: (request, resolve) => {
    get().resolvers.set(request.id, resolve);
    set((state) => {
      if (!state.current) {
        return { current: request };
      }
      return { queue: [...state.queue, request] };
    });
  },
  settle: (id, confirmed) => {
    const { current, queue, resolvers } = get();
    if (!current || current.id !== id) {
      return;
    }
    const resolve = resolvers.get(id);
    resolvers.delete(id);
    resolve?.(confirmed);
    set(advance(queue));
  },
  reset: () => {
    const { resolvers } = get();
    for (const resolve of resolvers.values()) {
      resolve(false);
    }
    resolvers.clear();
    set({ current: null, queue: [] });
  },
}));
