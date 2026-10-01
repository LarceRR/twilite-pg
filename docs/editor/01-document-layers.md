# 01 — Document model & layers

## Цель

Заменить плоский `pixels: Uint8ClampedArray` на документ со слоями, композитингом, per-layer undo и лимитом слоёв. Это **фундамент** до soft brushes / import / export.

## Текущее состояние

- [`editorCanvasStore`](../../src/shared/store/editorCanvas/model/editorCanvasStore.ts) — один буфер, один undo stack, snapshot на stroke  
- [`EditorLayers`](../../src/pages/new-project/ui/components/EditorRightToolsSidebar/EditorLayers/EditorLayers.tsx) — `MOCK_LAYERS`, hide/lock локальные  

## Целевая модель

```ts
const MAX_LAYERS = 16; // единая константа рядом с CANVAS_*

type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'add' | 'subtract';

type Layer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0..1
  blendMode: BlendMode;
  pixels: Uint8ClampedArray<ArrayBuffer>; // W*H*4, straight alpha
  undoStack: Uint8ClampedArray<ArrayBuffer>[];
  redoStack: Uint8ClampedArray<ArrayBuffer>[];
};

type EditorDocument = {
  width: 160;
  height: 160;
  layers: Layer[];           // bottom → top
  activeLayerId: string;
  revision: number;          // bump for view sync
};
```

Константы вынести явно:

```ts
export const MAX_LAYERS = 16;
export const MAX_LAYER_UNDO_STEPS = 30; // per layer
```

## Best practices (исследование)

### Aseprite / Doc + Transaction

- Document model **отделён** от UI  
- Изменения группируются в **transaction / Cmd** (atomic undo)  
- Ссылки по id, не по pointer (удобно для undo/GC)  
- Источник: [Aseprite Document Manipulation](https://deepwiki.com/aseprite/aseprite/7.2-document-manipulation-api), `Transaction` / `Tx`

### Per-layer undo — осознанный trade-off

Пользователь запросил **undo per layer**. Классика (Aseprite/PS) — **document-level** undo: Ctrl+Z откатывает последнюю операцию независимо от активного слоя.

**Рекомендуемая гибридная семантика (зафиксировать в UX):**

| Действие | Стек |
|----------|------|
| Paint / erase / fill на слое L | `L.undoStack` |
| Ctrl+Z / Ctrl+Y | всегда стек **active** слоя |
| Add / delete / reorder / rename / opacity / blend | отдельный **documentOps** стек **или** snapshot списка слоёв |
| Удаление слоя | уничтожает его undo/redo (с confirm) |

**Проблемы per-layer undo и решения:**

| Проблема | Решение |
|----------|---------|
| Юзер рисует на A, переключается на B, жмёт Ctrl+Z — ожидает откат A | Toast/hint: «Undo: Layer N»; опционально hotkey «Undo last edit anywhere» позже |
| Память: 16 × 30 × 160×160×4 ≈ **49 MB** worst case | OK для web; trim `MAX_LAYER_UNDO_STEPS`; не копировать неизменённые слои в doc-ops |
| Stroke начат → switch layer | Блокировать смену слоя пока `isDrawing`; `pointerup`/`cancel` завершают stroke |
| Locked / invisible active | Нельзя рисовать; UI disable + tooltip |

### Композитинг

- Хранить **straight alpha** в буферах слоёв (как сейчас ImageData)  
- При composite переходить в **premultiplied** для стабильного `source-over`  
- Формула normal (Porter-Duff src-over, premultiplied): `R = S + D * (1 - Sa)`  
- Источники: [Ciechanowski — Alpha compositing](https://ciechanow.ski/alpha-compositing/), SVG blend modes  

**Фаза blend modes (сразу, но тестируемо):**

| Mode | Назначение |
|------|------------|
| `normal` | default |
| `multiply` | тени / затемнение |
| `screen` | свет |
| `overlay` | контраст |
| `add` | glow / FX |
| `subtract` | вычитание (осторожно с clamp) |

Реализовать чистые функции `blendPixel(mode, src, dst) → rgba` + `compositeLayers(layers) → ImageData`, покрыть табличными тестами.

### Opacity слоя

`effectiveSrcAlpha = src.a * layer.opacity` перед blend.

## Операции слоя (API)

- `addLayer({ afterId? })` — fail если `layers.length >= MAX_LAYERS`  
- `deleteLayer(id)` — нельзя удалить последний; confirm  
- `duplicateLayer(id)` — считает в лимит  
- `reorderLayers(from, to)`  
- `setActiveLayer(id)`  
- `setVisibility / setLocked / setOpacity / setBlendMode / rename`  
- `beginStroke / paint* / endStroke` — только active + !locked + visible (или allow paint invisible? → **нет**)  
- `mergeDown(id)` — flatten id + below в один, undo как doc-op  

## Риски и ошибки

| Case | Handling |
|------|----------|
| `MAX_LAYERS` reached | UI disable «+», toast |
| Delete last layer | forbidden |
| Corrupt pixel length | assert `CANVAS_BYTE_LENGTH` on load/clone |
| Export while drawing | force `endStroke` |
| Concurrent paint (2 pointers) | ignore extra pointerIds |

## Тест-план

1. Unit: `compositeLayers` normal + opacity 0.5  
2. Unit: каждый blend mode на известных цветах (golden rgba)  
3. Store: add 16 layers → 17-я throws/returns error  
4. Store: undo/redo per layer независимо  
5. Store: cannot paint locked; stroke blocked on layer switch  
6. Memory: undo stack trim at `MAX_LAYER_UNDO_STEPS`  

## Acceptance

- Правый таб «Слои» работает на реальных данных  
- Рисование только на active  
- Composite отображается на canvas  
- Export/PNG preview = composite  
- Лимит 16 из константы  

## Вне скоупа этого файла

Masks, groups, adjustment layers, tilemaps, linked cels / animation.  
