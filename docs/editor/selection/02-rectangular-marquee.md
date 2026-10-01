# 02 — Rectangular Marquee (`rect`)

## Цель

Инструмент прямоугольного выделения: пользователь выбирает тул, тянет прямоугольник (опционально квадрат), на отпускании маска обновляется через boolean mode, затем может refine / transform / clipboard / deselect.

## Источники (без отсебятины)

| Поведение | Источник |
|-----------|----------|
| Drag rectangle; Shift → square; release mouse **before** Shift to keep constraint | [Adobe: Select with the marquee tools](https://helpx.adobe.com/photoshop/using/selecting-marquee-tools.html) |
| Spacebar while mouse down → reposition marquee, then continue sizing | Same Adobe page («To reposition a rectangular or elliptical marquee… hold down the spacebar») |
| Alt/Option **after** begin drag → draw from center | Same Adobe page |
| Options: New / Add To / Subtract From / Intersect With | Same Adobe page |
| Click outside selection with Rect/Ellipse/Lasso → deselect | [Adobe: Get started with selections](https://helpx.adobe.com/photoshop/using/making-selections.html) |
| Aseprite: Shift = square aspect; Space = Move Origin; Ctrl = draw from center (Shape Tool incl. Rectangular Marquee) | [Aseprite Keyboard Shortcuts — Action Modifiers / Shape Tool](https://aseprite.com/docs/keyboard-shortcuts/) |
| Aseprite boolean: default replace; Shift = union; **Alt+Shift** = subtract; Ctrl+Shift = intersect | [Aseprite Selecting](https://aseprite.org/docs/selecting/) |
| Marching ants after selection | [Aseprite Selecting](https://aseprite.org/docs/selecting/); [Wikipedia Marching ants](https://en.wikipedia.org/wiki/Marching_ants) (linked from Aseprite docs) |

**Не использовать** mintlify wiki как источник модификаторов Aseprite: там Alt = from-center / Alt = subtract, что **противоречит** официальным [Keyboard Shortcuts](https://aseprite.com/docs/keyboard-shortcuts/) (Ctrl from-center) и [Selecting](https://aseprite.org/docs/selecting/) (Alt+Shift subtract). См. [`12`](./12-sources-and-product-decisions.md).

## Продуктовый mapping модификаторов (v1)

Конфликт платформ обязателен к явному решению (см. [`12`](./12-sources-and-product-decisions.md)):

| Жест | Photoshop | Aseprite | **Twilite v1** |
|------|-----------|----------|----------------|
| Constrain square | Shift | Shift | **Shift** |
| Draw from center | Alt after drag start | Ctrl | **Out of scope v1** (Alt занят Subtract) |
| Reposition while dragging | Space | Space (Move Origin) | **Space — v1 REQUIRED** ([`12`](./12-sources-and-product-decisions.md)) |
| Add to selection | Shift (when selection exists) / Add button | Shift | **Shift override → Add** (Photoshop-like) |
| Subtract | Alt | Alt+Shift (or RMB) | **Alt override → Subtract** (Photoshop-like, по плану) |
| Intersect | Alt+Shift | Ctrl+Shift | **Out of scope** |

**Важно (sticky vs effective vs square):** когда маски ещё нет, Shift при drag = constrain square (Photoshop: «constrain the marquee to a square»). Когда маска есть и user начинает новый drag с Shift — Photoshop использует Shift для Add ([Adjust a selection manually](https://helpx.adobe.com/ie/photoshop/desktop/make-selections/refine-modify-selections/adjust-a-selection-manually.html)).

Рекомендуемое правило (тесты / [`05`](./05-boolean-modes.md)):

1. Sticky Replace + no existing mask + Shift → **effective Replace** + square constraint.
2. Sticky Replace + existing mask + Shift → **effective Add**; square **не** применяется.
3. Sticky Add → effective Add; Shift на constrain square **не** применяется.
4. Sticky Subtract / Alt → effective Subtract; square не применяется.
5. **Effective** boolean mode latch на `pointerDown`; mid-drag Shift/Alt не меняют boolean. Square/circle geometry may track live Shift while held (sample constrain flag on move/up).

## Happy path — от клика на тул до выхода

### A. Активация тула

1. User открывает Select в sidebar / hotkey Select group.
2. В `SelectionToolFlyout` нажимает `rect` (`SquareDashed`) → `setSelectionTool("rect")`.
3. Cursor / affordance: marquee crosshair (Replace) или +/- badge если sticky Add/Subtract ([`05`](./05-boolean-modes.md)).
4. Canvas pointer branch обслуживает Select (не brush stroke).

### B. Первое выделение (Replace)

1. State = Idle, `selectionOpMode = "replace"`, `selectionMask = null`, `floatSession = null`.
2. `pointerDown` на canvas pixel `(x0,y0)` → sample modifiers (см. effective mode) → `selectionDraft = { kind:"rect", x0,y0,x1:x0,y1:y0, constrainSquare:false }`.
3. State = Drafting. Overlay: live rectangle outline (не ants).
4. Drag → `x1,y1` обновляются каждый move.
5. Hold Space → translate оба угла одинаково (Adobe reposition — **v1 REQUIRED**); release Space → снова resize.
6. Hold Shift (правило выше) → `constrainSquare=true`, стороны равны по abs max.
7. `pointerUp`:
   - Нормализовать `min/max` → inclusive pixel rect.
   - Если width < 1 **или** height < 1 (empty / zero-area) → discard draft, остаться Idle (план: empty drag → no-op).
   - Иначе fillRect в temp mask → apply Replace → `selectionMask`.
8. State = HasMask. Показать marching ants + 8 handles (см. [`06`](./06-floating-transform.md), [`10`](./10-overlay-hit-testing.md)).
9. Mask change **не** в undo.

### C. Refine маски (второй и последующие штрихи)

1. Sticky Replace / Add / Subtract из flyout **или** modifier override на pointerDown ([`05`](./05-boolean-modes.md)).
2. Новый drag без modifiers / sticky Replace → Replace целиком.
3. Sticky Add или Shift (per rules) → union.
4. Sticky Subtract или Alt → subtract.
5. Если result empty → `selectionMask = null` → Idle.
6. Escape mid-drag → cancel draft; предыдущая маска нетронута.

### D. Работа с пикселями (после HasMask)

| Действие | Переход | Doc |
|----------|---------|-----|
| Click inside mask + drag | Floating (cut-out + move) | [`06`](./06-floating-transform.md) |
| Drag scale/rotate handle | Floating | [`06`](./06-floating-transform.md) |
| Ctrl+C / Ctrl+X / Ctrl+V / Delete | clipboard / clear (**Cut → Idle, not float**) | [`07`](./07-clipboard-cut-copy-paste-delete.md) |
| Paint/Fill с другой tool | clip to mask (после tool switch commit float) | [`05`](./05-boolean-modes.md), [`08`](./08-select-all-deselect-exit.md) |

### E. Завершение / выход

| Путь | Результат |
|------|-----------|
| Ctrl+D | Deselect → Idle ([`08`](./08-select-all-deselect-exit.md)) |
| Click outside mask (Replace, no modifiers, not handle) | Deselect → Idle (Adobe click-outside deselect) |
| Escape во время draft | Cancel draft; маска прежняя; **не** deselect |
| Escape без draft/float | **no-op** (не deselect) |
| Смена tool | Commit float если был; **маска сохраняется** |
| Enter | Commit float если Floating; иначе no-op |
| Delete | Clear pixels + clear mask → Idle ([`07`](./07-clipboard-cut-copy-paste-delete.md)) |

## Rasterization правила

- Пиксель `(x,y)` входит в rect, если `x ∈ [minX, maxX]` и `y ∈ [minY, maxY]` в **inclusive integer** координатах document space.
- Drag от (5,5) до (5,5) → 1×1 selection (один пиксель) — **валидно**.
- **PRODUCT:** tiny selection < 1px → discard; 1px OK. Если `pointerDown` cell == `pointerUp` cell → **1×1** на этой клетке, **кроме** «click outside existing mask для deselect».

### Click outside vs 1×1

Порядок hit-test на pointerDown (Select + rect):

1. Если float → handle/inside/outside float commit logic ([`06`](./06-floating-transform.md)).
2. Если HasMask и hit transform handle → start scale/rotate.
3. Если HasMask и hit inside mask → start move float.
4. Если HasMask и hit outside + sticky Replace + no Add/Subtract modifiers → **deselect**, **не** начинать 1×1.
5. Иначе begin draft.

## Edge cases (rect-specific)

| Case | Expected |
|------|----------|
| Drag beyond canvas | Allow off-canvas draft corners; **clip fill** to canvas (маска всегда W×H) |
| Negative drag (right→left, bottom→top) | Normalize min/max; валидный rect |
| Zoomed view, sub-pixel pointer | Round to nearest document pixel on down/move/up consistently |
| Space reposition pushes rect partially off canvas | Clip on commit |
| Shift released before mouse up | Adobe: release mouse **before** Shift to keep constraint. v1: constrain активен пока Shift held на up; sample flag at up |
| Shift pressed mid-drag (no mask) | Engage square from that moment |
| Existing float | Auto-commit before new draft |
| Locked layer | Mask OK; pixel float blocked |
| Animation playing | Ignore pointer draft |
| isDrawing / other tool stroke | Select tool exclusive; no concurrent stroke |
| Subtract last remaining pixels | → Idle |
| Add when null mask | Equivalent to Replace |
| pointerCancel / blur mid-drag | Cancel draft (preserve previous mask) |
| Ctrl+A then rect Replace | New rect replaces full-canvas mask |

## Overlay / preview

- Draft: solid or dashed rect stroke in screen space (hairline), mapped through viewport transform.
- Committed: marching ants по границе mask (для rect граница = bbox).

## Тест-план

1. Drag L→R, T→B → expected inclusive rect.
2. Drag R→L → same normalized.
3. Shift square when no mask.
4. Empty cancel: Escape mid-drag restores previous mask.
5. Click outside deselects.
6. Add second rect with Shift/sticky Add → union pixels.
7. Subtract hole with Alt.
8. 1×1 cell selection exists and copyable.
9. Off-canvas drag clips.
10. Tool switch keeps mask; Esc does not deselect.

## Acceptance

- [ ] Rect tool создаёт бинарную маску без anti-alias/feather (out of scope)
- [ ] Boolean modes работают
- [ ] Space reposition (REQUIRED) соответствует Adobe description
- [ ] Deselect / Esc / exit paths из [`08`](./08-select-all-deselect-exit.md) работают
