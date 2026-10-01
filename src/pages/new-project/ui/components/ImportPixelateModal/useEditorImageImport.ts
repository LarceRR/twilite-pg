import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import {
  classifyImportFile,
  fileFromClipboard,
  isEditablePasteTarget,
  pickImportFile,
  type ImportPixelateRequest,
} from "./importFile";

export function useEditorImageImport() {
  const [request, setRequest] = useState<ImportPixelateRequest | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const depth = useRef(0);

  const openFile = useCallback((file: File | null) => {
    const classified = classifyImportFile(file);
    setRequest(
      classified.ok
        ? { kind: "file", file: classified.file }
        : { kind: "rejected", reason: classified.reason },
    );
  }, []);

  const close = useCallback(() => {
    setRequest(null);
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isEditablePasteTarget(event.target)) {
        return;
      }
      const file = fileFromClipboard(event.clipboardData);
      if (!file) {
        return;
      }
      event.preventDefault();
      openFile(file);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [openFile]);

  const dragProps = {
    onDragEnter: (event: DragEvent<HTMLElement>) => {
      if (!dragHasFiles(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      depth.current += 1;
      setDropActive(true);
    },
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!dragHasFiles(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
    },
    onDragLeave: () => {
      depth.current -= 1;
      if (depth.current <= 0) {
        depth.current = 0;
        setDropActive(false);
      }
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      if (!dragHasFiles(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      depth.current = 0;
      setDropActive(false);
      openFile(pickImportFile(event.dataTransfer.files));
    },
  };

  return { request, dropActive, close, dragProps };
}

function dragHasFiles(data: DataTransfer | null): boolean {
  if (!data) {
    return false;
  }
  return Array.from(data.types).includes("Files");
}
