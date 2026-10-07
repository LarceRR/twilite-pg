import type { EditorDraftSnapshot } from "@/shared/store/editorCanvas/model/draftDocument";

import { parsePixelObjectType, type PixelObjectType } from "./objectType";

export const OBJECT_DRAFT_TITLE = "Черновик";

export type ObjectDraftRecord = {
  id: string;
  projectId: string;
  objectType: PixelObjectType;
  title: string;
  updatedAt: string;
  previewPng: Blob | null;
  snapshot: EditorDraftSnapshot;
};

const DB_NAME = "twilite-object-drafts";
const DB_VERSION = 1;
const STORE = "drafts";

const listeners = new Set<() => void>();
const sealed = new Set<string>();
let dbPromise: Promise<IDBDatabase> | null = null;

export function subscribeObjectDrafts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitDrafts(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Stop autosave from writing this id again after it was submitted or discarded. */
export function sealObjectDraft(id: string): void {
  sealed.add(id);
}

export function isObjectDraftSealed(id: string): boolean {
  return sealed.has(id);
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB недоступен"));
  }
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("byProject", "projectId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error("IndexedDB open failed"));
    };
  });
  return dbPromise;
}

function isDraftRecord(value: unknown): value is ObjectDraftRecord {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Partial<ObjectDraftRecord>;
  return (
    typeof row.id === "string" &&
    typeof row.projectId === "string" &&
    parsePixelObjectType(row.objectType) !== null &&
    typeof row.title === "string" &&
    typeof row.updatedAt === "string" &&
    row.snapshot != null &&
    typeof row.snapshot === "object"
  );
}

export async function getObjectDraft(id: string): Promise<ObjectDraftRecord | null> {
  const db = await openDb();
  const transaction = db.transaction(STORE, "readonly");
  const row = await requestToPromise(transaction.objectStore(STORE).get(id));
  await transactionDone(transaction);
  return isDraftRecord(row) ? row : null;
}

export async function putObjectDraft(record: ObjectDraftRecord): Promise<void> {
  if (sealed.has(record.id)) {
    return;
  }
  const db = await openDb();
  const transaction = db.transaction(STORE, "readwrite");
  transaction.objectStore(STORE).put(record);
  await transactionDone(transaction);
  emitDrafts();
}

export async function removeObjectDraft(id: string): Promise<void> {
  const db = await openDb();
  const transaction = db.transaction(STORE, "readwrite");
  transaction.objectStore(STORE).delete(id);
  await transactionDone(transaction);
  emitDrafts();
}

export async function listObjectDraftsByProject(projectId: string): Promise<ObjectDraftRecord[]> {
  const db = await openDb();
  const transaction = db.transaction(STORE, "readonly");
  const rows = await requestToPromise(transaction.objectStore(STORE).index("byProject").getAll(projectId));
  await transactionDone(transaction);
  return rows.filter(isDraftRecord).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
