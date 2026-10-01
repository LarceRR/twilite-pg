import "./EditorPage.scss";
import { useSidebarStore } from "@/shared/store/sidebar";
import { useEditorCanvasStore } from "@/shared/store/editorCanvas";
import { getEditorToolByName, useEditorSelectedToolStore } from "@/shared/store/editorSelectedTool";
import { APP_HOTKEYS } from "@/shared/const/hotkeys";
import { useHotkey } from "@/shared/hooks/useHotkey";
import React, { useEffect } from "react";
import { EditorLeftToolsSidebar } from "./components/EditorLeftToolsSidebar/EditorLeftToolsSidebar";
import { EditorMiddleBlock } from "./components/EditorMiddleBlock/EditorMiddleBlock";
import { ImportPixelateModal } from "./components/ImportPixelateModal/ImportPixelateModal";
import { useEditorImageImport } from "./components/ImportPixelateModal/useEditorImageImport";
import { StoryboardImportModal } from "./components/StoryboardImportModal/StoryboardImportModal";
import { useStoryboardImport } from "./components/StoryboardImportModal/useStoryboardImport";
import { EditorRightToolsSidebar } from "./components/EditorRightToolsSidebar/EditorRightToolsSidebar";

const EditorPage: React.FC = () => {
  const setSidebarOpen = useSidebarStore((state) => state.setSidebarOpen);
  const imageImport = useEditorImageImport();
  const storyboardImport = useStoryboardImport();

  useEffect(() => {
    setSidebarOpen(false);

    return () => setSidebarOpen(true);
  }, [setSidebarOpen]);

  useHotkey(APP_HOTKEYS.UNDO, () => {
    useEditorCanvasStore.getState().undo();
  });

  useHotkey(APP_HOTKEYS.REDO, () => {
    useEditorCanvasStore.getState().redo();
  });

  useHotkey(APP_HOTKEYS.REDO_ALT, () => {
    useEditorCanvasStore.getState().redo();
  });

  useHotkey(APP_HOTKEYS.SWAP_COLORS, () => {
    useEditorCanvasStore.getState().swapColors();
  });

  useHotkey(APP_HOTKEYS.SELECT_FILL, () => {
    const fill = getEditorToolByName("Fill");
    if (fill) {
      useEditorSelectedToolStore.getState().setCurrentTool(fill);
    }
  });

  useHotkey(APP_HOTKEYS.SELECT_ALL, () => {
    useEditorCanvasStore.getState().selectAll();
  });

  useHotkey(APP_HOTKEYS.DESELECT, () => {
    useEditorCanvasStore.getState().deselect();
  });

  useHotkey(APP_HOTKEYS.COPY, () => {
    useEditorCanvasStore.getState().copySelection();
  });

  useHotkey(APP_HOTKEYS.CUT, () => {
    useEditorCanvasStore.getState().cutSelection();
  });

  useHotkey(APP_HOTKEYS.PASTE, () => {
    useEditorCanvasStore.getState().pasteClipboard();
  });

  useHotkey(APP_HOTKEYS.DELETE_SELECTION, () => {
    useEditorCanvasStore.getState().deleteSelection();
  });

  useHotkey(APP_HOTKEYS.COMMIT_FLOAT, () => {
    const state = useEditorCanvasStore.getState();
    if (state.floatSession) {
      state.commitFloat();
    }
  });

  useHotkey(APP_HOTKEYS.CLOSE_OVERLAY, () => {
    const state = useEditorCanvasStore.getState();
    if (state.selectionDraft) {
      state.cancelSelectionDraft();
      return;
    }
    if (state.floatSession) {
      state.cancelFloat();
    }
  });

  const nudgeSelection = (dx: number, dy: number) => {
    const state = useEditorCanvasStore.getState();
    if (state.isPlaying) return false;
    if (state.floatSession) {
      const t = state.floatSession.transform;
      state.updateFloatTransform({ ...t, x: t.x + dx, y: t.y + dy });
      return true;
    }
    if (state.selectionMask) {
      if (!state.startFloatFromSelection()) return true;
      const floating = useEditorCanvasStore.getState();
      const session = floating.floatSession;
      if (!session) return true;
      floating.updateFloatTransform({
        ...session.transform,
        x: session.transform.x + dx,
        y: session.transform.y + dy,
      });
      return true;
    }
    return false;
  };

  useHotkey(APP_HOTKEYS.PREV_FRAME, () => {
    if (nudgeSelection(-1, 0)) return;
    const state = useEditorCanvasStore.getState();
    const index = state.frames.findIndex((frame) => frame.id === state.activeFrameId);
    const prev = state.frames[index - 1];
    if (prev) {
      state.setActiveFrame(prev.id);
    }
  });

  useHotkey(APP_HOTKEYS.NEXT_FRAME, () => {
    if (nudgeSelection(1, 0)) return;
    const state = useEditorCanvasStore.getState();
    const index = state.frames.findIndex((frame) => frame.id === state.activeFrameId);
    const next = state.frames[index + 1];
    if (next) {
      state.setActiveFrame(next.id);
    }
  });

  useHotkey(APP_HOTKEYS.NUDGE_UP, () => {
    nudgeSelection(0, -1);
  });

  useHotkey(APP_HOTKEYS.NUDGE_DOWN, () => {
    nudgeSelection(0, 1);
  });

  return (
    <div
      className={`editor-page${imageImport.dropActive ? " editor-page--drop" : ""}`}
      {...imageImport.dragProps}
    >
      <EditorLeftToolsSidebar />
      <EditorMiddleBlock onStoryboardImport={storyboardImport.open} />
      <EditorRightToolsSidebar />
      {imageImport.dropActive ? (
        <div className="editor-page__drop" role="status">
          Отпустите изображение, чтобы импортировать
        </div>
      ) : null}
      {imageImport.request ? (
        <ImportPixelateModal request={imageImport.request} onClose={imageImport.close} />
      ) : null}
      {storyboardImport.isOpen ? (
        <StoryboardImportModal onClose={storyboardImport.close} />
      ) : null}
    </div>
  );
};

export default EditorPage;
