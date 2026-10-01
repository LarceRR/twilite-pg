import { ChevronDown, ChevronRight, Eye, EyeClosed, Lock, LockOpen } from "lucide-react";
import type { MouseEvent } from "react";
import type { LayerId } from "@/shared/store/editorCanvas";
import { LayerThumbnail } from "./LayerThumbnail";
import "./Layer.scss";

export type EditorLayerProps = {
  layerId: LayerId;
  name: string;
  isHidden: boolean;
  isLocked: boolean;
  isActive: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleHidden: () => void;
  onToggleLocked: () => void;
  onToggleExpanded: () => void;
};

export const EditorLayer = ({
  layerId,
  name,
  isHidden,
  isLocked,
  isActive,
  isExpanded,
  onSelect,
  onToggleHidden,
  onToggleLocked,
  onToggleExpanded,
}: EditorLayerProps) => {
  const handleLock = (event: MouseEvent) => {
    event.stopPropagation();
    onToggleLocked();
  };

  const handleHide = (event: MouseEvent) => {
    event.stopPropagation();
    onToggleHidden();
  };

  const handleExpand = (event: MouseEvent) => {
    event.stopPropagation();
    onToggleExpanded();
  };

  return (
    <div
      className={`editor-layer${isActive ? " editor-layer--active" : ""}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="editor-layer__left-side">
        {isHidden ? (
          <EyeClosed size={16} onClick={handleHide} />
        ) : (
          <Eye size={16} onClick={handleHide} />
        )}
        <LayerThumbnail layerId={layerId} />
        <span>{name}</span>
      </div>
      <div className="editor-layer__right-side">
        {isLocked ? (
          <Lock size={14} onClick={handleLock} color="var(--primary)" />
        ) : (
          <LockOpen size={14} onClick={handleLock} />
        )}
        {isExpanded ? (
          <ChevronDown size={16} onClick={handleExpand} />
        ) : (
          <ChevronRight size={16} onClick={handleExpand} />
        )}
      </div>
    </div>
  );
};
