import { Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { MAX_LAYERS, useEditorCanvasStore } from "@/shared/store/editorCanvas";
import { toast } from "@/shared/ui/Toast";
import { EditorLayer } from "./components/Layer/Layer";
import { LayerSettings } from "./components/LayerSettings/LayerSettings";
import "./EditorLayers.scss";

export const EditorLayers = () => {
  const layers = useEditorCanvasStore((state) => state.layers);
  const activeLayerId = useEditorCanvasStore((state) => state.activeLayerId);
  const isDrawing = useEditorCanvasStore((state) => state.isDrawing);
  const addLayer = useEditorCanvasStore((state) => state.addLayer);
  const deleteLayer = useEditorCanvasStore((state) => state.deleteLayer);
  const duplicateLayer = useEditorCanvasStore((state) => state.duplicateLayer);
  const setActiveLayer = useEditorCanvasStore((state) => state.setActiveLayer);
  const setLayerVisibility = useEditorCanvasStore((state) => state.setLayerVisibility);
  const setLayerLocked = useEditorCanvasStore((state) => state.setLayerLocked);

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // UI lists top layer first (like PS/Aseprite).
  const displayLayers = [...layers].reverse();

  const report = (result: { ok: true } | { ok: false; reason: string }) => {
    if (!result.ok) {
      toast.warn("Слои", { description: result.reason });
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="editor-layers">
      <div className="editor-layers__toolbar">
        <button
          type="button"
          className="editor-layers__tool-btn"
          title="Добавить слой"
          disabled={isDrawing || layers.length >= MAX_LAYERS}
          onClick={() => report(addLayer())}
        >
          <Plus size={20} />
        </button>
        <button
          type="button"
          className="editor-layers__tool-btn"
          title="Дублировать слой"
          disabled={isDrawing || layers.length >= MAX_LAYERS}
          onClick={() => report(duplicateLayer(activeLayerId))}
        >
          <Copy size={20} />
        </button>
        <button
          type="button"
          className="editor-layers__tool-btn"
          title="Удалить слой"
          disabled={isDrawing || layers.length <= 1}
          onClick={() => report(deleteLayer(activeLayerId))}
        >
          <Trash2 size={20} />
        </button>
        <span className="editor-layers__count">
          {layers.length}/{MAX_LAYERS}
        </span>
      </div>

      <div className="editor-layers__wrapper">
        {displayLayers.map((layer) => (
          <EditorLayer
            key={layer.id}
            layerId={layer.id}
            name={layer.name}
            isHidden={!layer.visible}
            isLocked={layer.locked}
            isActive={layer.id === activeLayerId}
            isExpanded={Boolean(expandedIds[layer.id])}
            onSelect={() => report(setActiveLayer(layer.id))}
            onToggleHidden={() => setLayerVisibility(layer.id, !layer.visible)}
            onToggleLocked={() => setLayerLocked(layer.id, !layer.locked)}
            onToggleExpanded={() => toggleExpanded(layer.id)}
          />
        ))}
      </div>

      <div className="editor-layers__additional">
        <LayerSettings />
      </div>
    </div>
  );
};
