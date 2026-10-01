# 04 — Lasso (`lasso`)

## Цель

Freehand (freeform) выделение: пользователь рисует контур, на pointerUp контур закрывается, полигон заливается в маску, применяется boolean.

## Источники

| Поведение | Источник |
|-----------|----------|
| Lasso: drag freehand border; release mouse closes border (without Alt/Option) | [Adobe: Select with lasso tools](https://helpx.adobe.com/photoshop/using/selecting-lasso-tools.html) |
| Alt/Option toggles freehand ↔ straight segments; Delete erases recent straight segments | Same Adobe page — **out of scope v1** |
| Polygonal Lasso: click points; close on start / double-click / Ctrl\|Cmd-click; Shift constrains 45° | Same — **out of scope as separate tool** |
| Add/Subtract/Intersect via options bar | Same |
| Click outside → deselect (Lasso among others) | [Adobe: Get started with selections](https://helpx.adobe.com/photoshop/using/making-selections.html) |
| Boolean modifiers (official Aseprite) | [Aseprite Selecting](https://aseprite.org/docs/selecting/) — Shift add; **Alt+Shift** subtract |

### Secondary (Aseprite freehand UX detail)

Официальные aseprite.org/com docs **не** описывают пошагово freehand lasso close. Вторичный обзор:

- Freehand: draw outline; release auto-close with straight line; or connect to start  
- Polygonal: click corners; double-click finish; Esc cancel  
- Pixel Perfect cleans freehand corners  

Источник: [Selection Tools — mintlify wiki](https://mintlify.wiki/aseprite/aseprite/tools/selection).

**Warning:** тот же wiki **неверно** указывает boolean/modifiers (Alt = subtract, Alt = from-center). Для модификаторов всегда предпочитать [Selecting](https://aseprite.org/docs/selecting/) и [Keyboard Shortcuts](https://aseprite.com/docs/keyboard-shortcuts/). Auto-close freehand — PRODUCT + Adobe close-on-release + secondary wiki.

## Продуктовый scope v1

| В scope | Вне scope |
|---------|-----------|
| Freehand lasso (pointer move polyline) | Magnetic Lasso (Photoshop) |
| Auto-close on pointerUp (straight gap to start) | Polygonal click-to-point mode as separate tool |
| Fill polygon → binary mask | Feather / Anti-alias |
| Boolean Replace/Add/Subtract | Alt-toggle straight segments mid-stroke (nice-to-have later) |
| Esc cancel draft | Pixel Perfect cleanup |
| | Selection Brush / Magnetic |

UI имеет один пункт `lasso`. Поведение = Photoshop **Lasso Tool** freehand close-on-release + auto-close gap (PRODUCT / secondary Aseprite wiki).

## Happy path — от клика на тул до выхода

### A. Активация

1. `setSelectionTool("lasso")` из flyout.
2. Sticky boolean mode из [`05`](./05-boolean-modes.md).
3. Constrain square/circle **не применим** к lasso.

### B. Рисование (Replace)

1. `pointerDown` → latch effective boolean mode → `selectionDraft = { kind:"lasso", points:[{x,y}] }` (integer pixels).
2. State = Drafting.
3. Каждый `pointerMove` с кнопкой: если новая точка отличается от последней (или dist ≥ 1px document) → push point.  
   Throttle: не писать дубликаты одной клетки подряд.
4. Overlay: polyline через точки + optional rubber-band close preview к первой точке. **Не** ants.
5. `pointerUp`:
   - Если `points.length < 3` → **discard** (нельзя заполнить площадь).  
   - Auto-close: соединить last→first (Adobe: «To close the selection border, release the mouse without holding down Alt or Option»).
   - Rasterize polygon fill → temp mask → boolean → commit.
6. State HasMask или Idle если result empty (например subtract everything).

### C. Refine

1. Повторный lasso (или marquee) с Add/Subtract — [`05`](./05-boolean-modes.md).
2. Effective mode фиксируется на **pointerDown**; mid-stroke Shift/Alt **игнорируются** до следующего штриха.
3. Esc mid-lasso → discard draft; keep previous mask.

### D. Transform / clipboard

1. Inside-hit = mask fill bits (включая holes from self-intersect even-odd).
2. Float / Ctrl+C/X/V / Delete — [`06`](./06-floating-transform.md), [`07`](./07-clipboard-cut-copy-paste-delete.md).

### E. Exit

| Путь | Результат |
|------|-----------|
| Ctrl+D | Deselect |
| Click outside mask (Replace, no modifiers) | Deselect ([Adobe](https://helpx.adobe.com/photoshop/using/making-selections.html)) |
| Esc (draft) | Cancel draft only |
| Esc (no draft/float) | no-op — **не** deselect |
| Tool switch | Commit float if any; keep mask |
| Delete | Clear pixels + clear mask |

## Polygon fill

Бинарный fill полигона. Для простых freehand без самопересечений even-odd и non-zero совпадают.

**Самопересечения:** Photoshop/Aseprite допускают self-intersecting lassos (наблюдаемое UX; точный fill rule в vendor docs не специфицирован как API). **PRODUCT:** fix **even-odd** в тестах (предсказуемые «бантики»).

Алгоритм: scanline fill по integer edges (pure function для unit tests).

## Close gap behavior

Adobe: release closes border.  
Secondary Aseprite wiki: «Release mouse to auto-close with straight line».

Если user почти вернулся к start (dist ≤ 1–2 px), всё равно auto-close straight — не требует точного попадания.

## Edge cases (lasso-specific)

| Case | Expected |
|------|----------|
| Extremely fast move / few points | Still valid if ≥3 points |
| All points colinear | Area 0 → empty mask → no-op (discard) |
| Self-intersecting | Fill even-odd; golden tests |
| Points outside canvas | Clip polygon to canvas on fill |
| Single click no move | points.length==1 → discard; if HasMask+outside → deselect path ([`02`](./02-rectangular-marquee.md)) |
| Pointer leaves window mid-drag | Keep pointer capture until up/cancel |
| Esc mid-lasso | Discard draft; keep previous mask |
| Very long path (10k points) | Cap/resample for 160×160; coalesce collinear |
| Zoomed: screen jitter | Quantize to document pixels |
| Add lasso that overlaps | Union |
| Subtract lasso | Clear bits inside polygon |
| Locked layer | Mask OK |
| Float open | Commit float first |
| Mid-gesture mode change | Ignored (latched at pointerDown) |
| Alt held (v1) | Subtract boolean if latch at down — **not** straight-segment toggle |

## Interaction with boolean Shift/Alt

Во время lasso drag:

- Effective mode фиксируется на **pointerDown**.
- Photoshop mode buttons sticky; modifier gestures typically at start of adjust ([Adjust selection](https://helpx.adobe.com/ie/photoshop/desktop/make-selections/refine-modify-selections/adjust-a-selection-manually.html)).

## Preview

- Draft: polyline + translucent fill optional (nice); минимум stroke.
- Не показывать ants до commit.

## Тест-план

1. Triangle lasso ≥3 points → filled region.
2. <3 points → no mask change.
3. Auto-close includes pixels on closing edge.
4. Self-intersect even-odd golden.
5. Add/Subtract with second lasso.
6. Esc cancel.
7. Clip to canvas.
8. Click outside deselects; Esc does not.

## Acceptance

- [ ] Freehand only v1
- [ ] Auto-close on up
- [ ] Binary fill, no feather
- [ ] Boolean parity with rect/ellipse
- [ ] Esc ≠ deselect
