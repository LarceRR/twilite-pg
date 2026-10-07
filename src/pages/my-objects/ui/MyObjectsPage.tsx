import "./MyObjectsPage.scss";

import { emptyObjectsMessage } from "../model/objectFormatters";
import { matchProjectDrafts } from "../model/matchProjectDrafts";
import { canDeleteObject, canOpenObject } from "../model/objectRules";
import { useMyObjects } from "../model/useMyObjects";
import { useObjectBrowser } from "../model/useObjectBrowser";
import { useProjectDrafts } from "../model/useProjectDrafts";
import { DraftObjectCard } from "./components/DraftObjectCard/DraftObjectCard";
import { MyObjectsEmptyState } from "./components/MyObjectsEmptyState/MyObjectsEmptyState";
import { MyObjectsHeader } from "./components/MyObjectsHeader/MyObjectsHeader";
import { MyObjectsPagination } from "./components/MyObjectsPagination/MyObjectsPagination";
import { MyObjectsToolbar } from "./components/MyObjectsToolbar/MyObjectsToolbar";
import { ObjectCard } from "./components/ObjectCard/ObjectCard";
import { ObjectCategoryTabs } from "./components/ObjectCategoryTabs/ObjectCategoryTabs";
import { ObjectSelectionBar } from "./components/ObjectSelectionBar/ObjectSelectionBar";

export function MyObjectsPage() {
  const objects = useMyObjects();
  const browser = useObjectBrowser(objects.items, objects.projectId);
  const projectDrafts = useProjectDrafts(objects.projectId);
  const draftsVisible = matchProjectDrafts(
    projectDrafts.drafts,
    browser.query,
    browser.status,
    browser.category,
  );
  const waitingForDrafts = Boolean(objects.projectId) && !projectDrafts.ready;
  const serverEmpty = !objects.loading && objects.items.length === 0;
  const hasDrafts = projectDrafts.drafts.length > 0;
  const isEmpty = !waitingForDrafts && serverEmpty && !hasDrafts;
  const scoped = Boolean(objects.projectId);
  const showHeader = scoped || !isEmpty;
  const initialLoading =
    (objects.loading && objects.items.length === 0) || (waitingForDrafts && objects.items.length === 0);

  function goPrev(): void {
    browser.setPage(Math.max(1, browser.page - 1));
  }

  async function goNext(): Promise<void> {
    const current = browser.page;
    if (current < browser.pageCount) {
      browser.setPage(current + 1);
      return;
    }
    const added = await objects.loadMore();
    if (added > 0) {
      browser.setPage(current + 1);
    }
  }

  return (
    <section className={`my-objects${isEmpty && !scoped ? " my-objects--empty" : ""}`}>
      {initialLoading ? <p className="my-objects__status">Загрузка…</p> : null}

      {showHeader && !initialLoading ? (
        <MyObjectsHeader
          title={objects.title}
          objectCount={isEmpty ? 0 : browser.visibleCount + draftsVisible.length}
          toolbar={
            isEmpty ? null : (
              <MyObjectsToolbar
                query={browser.query}
                sortMode={browser.sortMode}
                status={browser.status}
                canCreate={objects.canCreate}
                onQueryChange={browser.setQuery}
                onSortMode={browser.setSortMode}
                onStatus={browser.setStatus}
                onCreate={objects.createObject}
              />
            )
          }
        />
      ) : null}

      {isEmpty ? (
        <MyObjectsEmptyState
          heroSrc={objects.emptyHeroSrc}
          canCreate={objects.canCreate}
          heading={scoped ? null : "Создайте первый объект"}
          onCreate={objects.createObject}
        />
      ) : null}

      {draftsVisible.length > 0 && !initialLoading ? (
        <div className="my-objects__grid">
          {draftsVisible.map((draft) => (
            <DraftObjectCard
              key={draft.id}
              draft={draft}
              busy={objects.bulkBusy}
              onOpen={() => projectDrafts.openDraft(draft)}
              onDiscard={() => void projectDrafts.discardDraft(draft)}
            />
          ))}
        </div>
      ) : null}

      {serverEmpty && hasDrafts && draftsVisible.length === 0 && !initialLoading ? (
        <p className="my-objects__status">
          {emptyObjectsMessage(browser.query, browser.category, browser.status)}
        </p>
      ) : null}

      {!serverEmpty && !initialLoading ? (
        <>
          <ObjectCategoryTabs value={browser.category} onChange={browser.setCategory} />
          {browser.visibleCount > 0 ? (
            <ObjectSelectionBar
              selectedCount={browser.selectedCount}
              allSelected={browser.pageAllSelected}
              someSelected={browser.pageSomeSelected}
              busy={objects.bulkBusy}
              onTogglePage={(selected) =>
                browser.setPageSelection(
                  browser.pageItems.map((item) => item.id),
                  selected,
                )
              }
              onDelete={() => void objects.removeMany(browser.selectedItems)}
            />
          ) : (
            <p className="my-objects__status">
              {emptyObjectsMessage(browser.query, browser.category, browser.status)}
            </p>
          )}

          {browser.visibleCount > 0 ? (
            <div className="my-objects__grid">
              {browser.pageItems.map((item) => (
                <ObjectCard
                  key={item.id}
                  item={item}
                  selected={browser.isSelected(item.id)}
                  busy={objects.bulkBusy || objects.busyId === item.id}
                  canOpen={canOpenObject(item)}
                  canDelete={canDeleteObject(item)}
                  onToggleSelected={() => browser.toggleSelected(item.id)}
                  onOpen={() => void objects.openInEditor(item)}
                  onDelete={() => void objects.removeMany([item])}
                />
              ))}
            </div>
          ) : null}

          {browser.visibleCount > 12 ? (
            <MyObjectsPagination
              page={browser.page}
              pageCount={browser.pageCount}
              pageSize={browser.pageSize}
              canPrev={browser.page > 1}
              canNext={browser.page < browser.pageCount || Boolean(objects.nextCursor)}
              loadingMore={objects.loadingMore}
              onPage={browser.setPage}
              onPrev={goPrev}
              onNext={() => void goNext()}
              onPageSize={browser.setPageSize}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
