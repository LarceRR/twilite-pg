import type { ObjectDraftRecord } from "@/shared/pixelObject/objectDraftStore";

import type { ObjectCategoryId, ObjectStatusFilter } from "./objectCategories";

/** Local drafts are uncategorized and have no server status, so they stay on the unfiltered list. */
export function matchProjectDrafts(
  drafts: readonly ObjectDraftRecord[],
  query: string,
  status: ObjectStatusFilter,
  category: ObjectCategoryId,
): ObjectDraftRecord[] {
  if (status !== "all" || category !== "all") {
    return [];
  }
  const normalized = query.trim().toLocaleLowerCase("ru");
  if (!normalized) {
    return [...drafts];
  }
  return drafts.filter((draft) => draft.title.toLocaleLowerCase("ru").includes(normalized));
}
