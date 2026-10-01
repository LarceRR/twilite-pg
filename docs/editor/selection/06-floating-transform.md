# 06 — Floating selection & Free Transform (move / scale / rotate)

## Цель

После ненулевой маски пользователь может перемещать / масштабировать / вращать **пиксели** под маской. Это создаёт float session, затем commit или cancel.

## Источники

### Aseprite

- Move selection: drag or arrow keys; background layer clears with background color; transparent layer clears with transparent ([Move Selection](https://aseprite.com/docs/move-selection/)).
- Context bar: X, Y, Width, Height, Rotation, Skew (Skew **out of scope** v1).
- Translating modifiers: Alt snap grid; Shift lock axis; Ctrl copy-on-move before start; Ctrl fine translate ([Keyboard Shortcuts](https://aseprite.com/docs/keyboard-shortcuts/)).
- Scaling: Shift maintain aspect; Alt scale from center; Ctrl fine scale.
- Rotating: Shift angle snap (docs: 26.6°, 45°, 90°, etc.).
- Transformations overview: handles; commit by clicking outside ([Transformations](https://aseprite.org/docs/transformations/)).
- Selection applies to active cel only ([Selecting](https://aseprite.org/docs/selecting/)).

### Photoshop

- Free Transform: scale handles; rotate by dragging outside bounding border (curved arrow); Shift constrains rotation to **15°** increments ([Free Transform / Transform images](https://helpx.adobe.com/photoshop/using/free-transformations-images-shapes-paths.html)).
- Commit: Enter/Return, Commit button, double-click inside, select new tool, click outside bounding box, click outside canvas, click layer in Layers panel.
- Cancel: Esc (same page).
- Proportional scale: Maintain Aspect Ratio button; Shift toggles (Photoshop 21.0+). Legacy: Shift constrained proportions (`Preferences > General > Legacy Free Transform`).
- Note: repeated bitmap transforms soften image — prefer cumulative before commit (Adobe). Для pixel art — **nearest-neighbor**; «один commit» важен для undo.

### Floating selection concept

Photoshop Vanishing Point docs describe a floating selection as pixels hovering above the image; click outside pastes into the image ([Vanishing Point](https://helpx.adobe.com/photoshop/using/vanishing-point.html)). Это доменный термин Adobe в VP; для общего Move/FT поведение берём из Free Transform + Move Selection docs выше, не из VP alone.

## Продуктовый scope v1

| In | Out |
|----|-----|
| Move (integer pixel snap) | Skew, distort, warp, perspective |
| Scale via 8 handles | Movable pivot (pivot = bbox center fixed) |
| Rotate via outside-corner zone | RotSprite algorithm |
| Nearest-neighbor destination-driven sample | Subpixel fine translate (Aseprite Ctrl fine) |
| Shift aspect lock on scale | Scale-from-center Alt (nice-to-have later) |
| Shift angle snap on rotate (**15°**) | Copy-on-move Ctrl-drag (use Ctrl+C / later) |
| Enter commit / Esc cancel / **double-click inside commit** | Numeric context bar X/Y/W/H (later) |
| Arrow key nudge (incl. HasMask → float) | Snap-to-grid Alt |

**Angle snap:** Photoshop **15°** ([Free Transform](https://helpx.adobe.com/photoshop/using/free-transformations-images-shapes-paths.html)); Aseprite mentions 26.6°/45°/90° ([Keyboard Shortcuts](https://aseprite.com/docs/keyboard-shortcuts/)). **v1: 15°**.

**Aspect lock:** **hold Shift = maintain aspect** (Aseprite Scaling Selection; classic/legacy Photoshop). Ignore PS 21+ toggle complexity.

## Happy path — от HasMask до exit

### 1. Enter float from HasMask

Триггеры:

- PointerDown inside mask (not on handle) + drag → cut-out + move.
- PointerDown on scale handle → cut-out + scale.
- PointerDown on rotate zone → cut-out + rotate.
- **Arrow key** while HasMask → cut-out + nudge 1px in that direction (**PRODUCT DECISION**, [`12`](./12-sources-and-product-decisions.md)).
- Cut (Ctrl+X) → **не** float в v1 (см. [`07`](./07-clipboard-cut-copy-paste-delete.md): Cut = clipboard + clear + deselect).
- Paste (Ctrl+V) → new float from clipboard.

**Cut-out алгоритм:**

1. Snapshot `baseLayerSnapshot = clone(activeLayerPixels)`.
2. Extract RGBA under mask into float buffer (+ float mask).
3. Clear those pixels on layer to transparent (наш editor = transparent layers; нет BG-layer fill color как в Aseprite BG — всегда transparent hole; Aseprite transparent-layer behavior: [Move Selection](https://aseprite.com/docs/move-selection/)).
4. `floatSession` created; **не** push undo ещё.
5. State = Floating.

### 2. Manipulate

| Op | Behavior |
|----|----------|
| Move | Translate `transform.x/y` integer; live preview |
| Scale | Update w/h from handle; NN resample from immutable source buffer; Shift = aspect lock |
| Rotate | Update rotation; NN resample; bounds expand; Shift = snap 15° |
| Arrow key nudge | **While Floating:** ±1px translate (Aseprite — [Move Selection](https://aseprite.com/docs/move-selection/)). **From HasMask:** first arrow **PRODUCT DECISION** — `startFloatFromSelection` (cut-out) then nudge 1px; subsequent arrows nudge float only. Locked in [`12`](./12-sources-and-product-decisions.md) / [`11`](./11-edge-cases-matrix.md). |

### 3. Commit

Триггеры (Photoshop-aligned + plan):

- Enter / Return
- **Double-click inside** the transform marquee / float bbox (**v1 YES** — Adobe [Free Transform](https://helpx.adobe.com/photoshop/using/free-transformations-images-shapes-paths.html); locked in [`12`](./12-sources-and-product-decisions.md))
- Click outside float bbox (not on UI chrome)
- Switch tool
- Switch frame / layer (auto-commit onto **source** cel)
- Start new selection draft

Действия:

1. Stamp float pixels onto layer (clip to canvas).
2. `pushLayerUndo` once (весь float lifecycle = одна запись).
3. Update `selectionMask` to transformed shape (rasterize float mask through transform).
4. Clear `floatSession`.
5. State HasMask (unless mask empty → Idle).

### 4. Cancel (Esc)

1. Restore layer from `baseLayerSnapshot`.
2. Restore **original** mask (pre-float).
3. Clear floatSession.
4. No undo entry.
5. **Не** deselect (маска возвращается).

### 5. После commit — выход из selection

- Ctrl+D → Idle.
- Click outside → deselect (вторым кликом после commit-outside).
- Esc после commit → no-op.

## Handles layout

- 8 scale handles: 4 corners + 4 edges (Photoshop/Aseprite).
- Rotate hit zone: near outside corners (cursor curved arrow) — Adobe Free Transform.
- Pivot: center of float bbox — **fixed** (movable pivot out of scope).

## Sampling

Destination-driven nearest neighbor:

```
for each dest pixel in float stamp bounds:
  map back through inverse(transform)
  if source in bounds: copy nearest source pixel else transparent
```

Rotation free any angle; Shift snaps to multiples of 15°.

## Edge cases

| Case | Expected |
|------|----------|
| Move partially off canvas | Stamp clips; off-canvas pixels discarded on commit |
| Scale to 0 / negative | Clamp min size 1×1 |
| Rotate 45° expands AABB | Mask/handles update on commit (live preview expands) |
| Empty extract (mask on transparent) | Float of transparent pixels still valid |
| Locked layer | Block float start |
| Undo during float | **PRODUCT DECISION:** Ctrl+Z while Floating = `cancelFloat` only (restore base+mask; no undo stack pop). Aligns with [`11`](./11-edge-cases-matrix.md) |
| Double Esc | First cancels float; second **no-op** (Esc ≠ deselect) |
| Click inside float without drag | Keep float active |
| Double-click inside float | **Commit** (Adobe FT path; v1 YES) |
| Tool switch mid-float | Commit (Adobe) |
| Animation play | Block transform drags; commit on play start ([`08`](./08-select-all-deselect-exit.md)) |
| Multi-island mask | One float from all selected pixels; holes preserved in float mask |
| Paste creates float | Same commit/cancel contracts |
| Layer switch mid-float | Commit onto **source** layer/frame, then switch |

## Interaction with Select tool vs Move tool

Aseprite has Move tool `V`; Photoshop Move tool moves pixels.  
У нас отдельного Move tool может не быть — Select tool owns transform when HasMask/Floating (план: SelectionOverlay handles).

## Acceptance

- [ ] One undo on commit only
- [ ] Esc restores pixels + mask (does not deselect)
- [ ] NN sampling
- [ ] Shift aspect / 15° rotate
- [ ] Auto-commit on tool/frame/layer change
- [ ] Double-click inside float commits
- [ ] Arrow from HasMask starts float then nudges 1px
