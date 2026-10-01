# 11 — Edge cases matrix (all tools)

## Цель

Сводная матрица edge cases из плана + платформенных источников + всех файлов 01–10. При конфликте — колонка **Twilite v1** и [`12`](./12-sources-and-product-decisions.md).

Термины: `selectionMask`, `selectionDraft`, `floatSession`, `selectionOpMode` (sticky) vs **effective** mode — [`01`](./01-lifecycle-state-model.md).

## Легенда

- OK — поддерживаем  
- NO — no-op / ignore  
- N/A — out of scope  

## Document / layer / frame

| Case | Twilite v1 | Notes / sources |
|------|------------|-----------------|
| Empty layer + selection | OK | Mask independent of pixels; Aseprite selects region of cel |
| Mask on fully transparent pixels | OK | Extract transparent float; Delete may no-op visually |
| Locked layer: change mask | OK | Product plan |
| Locked layer: float/cut/delete/paste | NO | Product plan |
| Hidden active layer: mask | OK | Pixel ops still target layer buffer |
| Switch layer mid-float | commitFloat on source | Photoshop commits on layer click in FT |
| Switch frame mid-float | commitFloat on source | Plan |
| Mask document-level across frames | OK | Same mask, different pixels underneath |
| Commit float always stamps `sourceLayerId`/`sourceFrameId` | OK | [`01`](./01-lifecycle-state-model.md) |
| Max 16 layers | N/A interaction | Existing limit |
| Cannot have `selectionDraft` + `floatSession` simultaneously | Invariant | Auto-commit float before new draft |
| Empty mask after any op → `selectionMask = null` | OK | Not empty buffer forever |

## Geometry / input

| Case | Twilite v1 |
|------|------------|
| Empty drag (zero area) | Discard |
| Tiny < 1px | Discard |
| 1×1 selection | OK |
| pointerDown cell == pointerUp cell (not deselect path) | 1×1 apply effective mode ([`02`](./02-rectangular-marquee.md)) |
| Drag outside canvas | Clip fill to canvas |
| Negative drag direction | Normalize |
| Lasso < 3 points | Discard |
| Lasso all points colinear (zero area) | Discard |
| Lasso self-intersect | Fill even-odd (fixed) |
| Lasso points outside canvas | Clip polygon on fill |
| Lasso mid-stroke Shift/Alt flip | Ignored; effective latched on pointerDown |
| Ellipse hit in bbox corner outside mask | Not «inside» |
| Extreme / flat ellipse (e.g. 1×N, 2×100) | Binary fill continuous; no crash |
| Space reposition mid-marquee (rect/ellipse) | **REQUIRED** ([Adobe marquee](https://helpx.adobe.com/photoshop/using/selecting-marquee-tools.html); [`12`](./12-sources-and-product-decisions.md)) |
| Space pushes draft partially off canvas | Clip on commit |
| Shift square vs Shift add conflict | Rules in [`02`](./02-rectangular-marquee.md) / [`05`](./05-boolean-modes.md) |
| Shift released before mouse up (square) | Constrain tracks live Shift; geometry at up uses current flag ([`02`](./02-rectangular-marquee.md)) |
| Sticky Replace + no mask + Shift | Square/circle; effective Replace |
| Sticky Replace + mask + Shift | Effective Add; no square |
| Sticky Add/Subtract + Shift square | Square **not** applied |
| Alt from-center vs Alt subtract | Subtract wins; from-center out |
| Intersect modifiers (Ctrl+Shift / Alt+Shift) | Never Intersect; Alt+Shift → Subtract ([`05`](./05-boolean-modes.md)) |
| Right-click subtract (Aseprite) | Not required |
| Pointer leave browser mid-drag | Pointer capture until up |
| Double-click inside float | **Commit float** (Adobe FT; v1 YES — [`06`](./06-floating-transform.md), [`12`](./12-sources-and-product-decisions.md)) |
| Double-click elsewhere | No special |
| Zoomed view sub-pixel pointer | Round to nearest document pixel consistently |
| Add when mask null | Equivalent to Replace |
| Subtract when mask null | NO (discard) |
| Subtract equals full mask | → null / Idle |
| New fully inside old on Add | Mask unchanged (still non-null) |
| Multi-island mask | OK; ants per island; one AABB handles |

## Transform / float

| Case | Twilite v1 |
|------|------------|
| Rotate creates new bounds | OK; mask updates on **commit** |
| Scale below 1px | Clamp 1×1 |
| Paste / float beyond canvas | Clip on stamp |
| Esc float | Restore base + original mask; HasMask; no undo |
| Esc draft | Discard draft; keep previous mask |
| Esc when Idle/HasMask (no draft/float) | NO (not deselect) |
| Double Esc after cancel float | Second Esc NO; use Ctrl+D |
| Enter float | Stamp + update mask to transformed shape |
| Double-click inside float | Commit (same as Enter) |
| Click outside float | Commit only; mask remains (second outside click may deselect) |
| Click inside float without drag | Keep float active |
| Tool switch | Commit float; keep mask |
| Layer/frame switch | Auto-commit on source cel; keep mask |
| Undo during float | **PRODUCT DECISION:** Ctrl+Z → cancelFloat only (no stack pop) ([`06`](./06-floating-transform.md)) |
| Ctrl+Z after layer undo while float was open | Never leave orphan float over restored pixels ([`01`](./01-lifecycle-state-model.md)) |
| NN vs RotSprite | NN only (plan); RotSprite later |
| Skew / distort / warp | Out |
| Softening on transform (Photoshop bitmap note) | N/A with NN |
| Shift aspect lock on scale | OK |
| Shift rotate snap | 15° |
| Arrow key nudge while Floating | 1px translate |
| Arrow key from HasMask | **PRODUCT DECISION:** first arrow cut-out → float, then nudge 1px; further arrows nudge float ([`06`](./06-floating-transform.md), [`12`](./12-sources-and-product-decisions.md)) |
| Empty extract (transparent under mask) | Float OK |
| Multi-island → one float | OK; holes preserved |
| Cut does **not** enter float | Cut → Idle ([`07`](./07-clipboard-cut-copy-paste-delete.md)) |

## Clipboard

| Case | Twilite v1 |
|------|------------|
| OS clipboard | Not used |
| Copy Merged | Out / no-op |
| Copy with no selection | NO |
| Copy while Floating | Copies float visual |
| Copy fully transparent region | OK (shape + transparent pixels) |
| Paste with empty clipboard | NO |
| Paste without selection | Float from clipboard |
| Paste after deselect | OK (clipboard persists) |
| Paste first / repeated | Center canvas; then +1,+1 without intervening Copy/Cut |
| Paste on locked layer | NO |
| Paste larger than canvas | Float may extend; stamp clips |
| Cut | Copy + clear pixels + clear mask → Idle |
| Cut on locked | NO |
| Cut while Floating | Copy float + keep hole + clear mask + undo |
| Delete clears pixels then mask | Yes (**PRODUCT**; Adobe Clear vs Deselect separate; Aseprite keep-selection pref is secondary community) |
| Delete on locked | NO |
| Delete while Floating | Keep hole; clear float+mask; undo |
| Undo after Delete | Restores pixels; mask stays cleared |
| Undo after Paste commit | Removes pasted pixels |
| Hotkey while focus in text Input | Do not intercept |

## Boolean / paint consumers

| Case | Twilite v1 |
|------|------------|
| Sticky Subtract + Shift (no Alt) | Effective Add; sticky stays Subtract |
| Sticky Add + Alt | Effective Subtract; sticky stays Add |
| Alt+Shift (PS Intersect chord) | Subtract (Alt wins); never Intersect |
| Sticky mode across tool switch | Persists until flyout change or new/close document |
| Sticky mode disk persist | **No** — session/store only; reset Replace on new/close doc ([`05`](./05-boolean-modes.md), [`12`](./12-sources-and-product-decisions.md)) |
| Mid-gesture sticky/modifier mode change | Ignored after latch |
| Sticky unchanged after modifier stroke | OK |
| Paint/Fill clip to mask when HasMask | OK (consumer; [`05`](./05-boolean-modes.md)) |
| Empty mask null → no paint clip | OK |

## Animation / concurrency

| Case | Twilite v1 |
|------|------------|
| Play animation | Block mutating selection ops; commit float on play start |
| Deselect (Ctrl+D) while playing | OK (safe clear) |
| isDrawing conflict | Select exclusive; no parallel stroke |
| Race tool-switch mid-draft | **PRODUCT DECISION:** cancel draft (keep previous mask); do not apply partial boolean |
| Wand tool selected | Prefs OK; canvas click no-op; existing mask kept ([`09`](./09-magic-wand-deferred.md)) |

## Overlay / hit-testing

| Case | Twilite v1 |
|------|------------|
| Hit priority | Rotate → scale → inside move → outside ([`10`](./10-overlay-hit-testing.md)) |
| Handles constant CSS size across zoom | OK (~8–12px hit) |
| Mask 1px still shows handles | OK |
| Multi-island ants + one AABB | OK |
| Ellipse/lasso ants follow mask topology | OK (not bbox-only) |
| Pointer capture lost | End drag gracefully |
| Touch larger hit slop | Out v1 |

## UX exit

| Case | Twilite v1 |
|------|------------|
| Esc | Cancel draft/float only (**not** deselect; PS FT cancel; Aseprite Esc-as-deselect is secondary) |
| Ctrl+D | Deselect; if Floating → commitFloat then deselect |
| Ctrl+D while Drafting | Cancel draft then clear mask |
| Ctrl+A | Full canvas mask; commit float first; locked OK |
| Click outside (HasMask, Replace, no mods) | Deselect |
| Click outside (HasMask, sticky Add/Subtract or Shift/Alt) | Begin draft (do not deselect) |
| Click outside (Floating) | Commit only |
| Ellipse bbox corner outside mask + Replace | Deselect (outside mask), not float |
| Ellipse bbox corner + sticky Add | Begin draft Add, not float |
| Ctrl+A then Replace marquee | New shape replaces full-canvas mask |
| pointerCancel / blur mid-draft | Cancel draft; keep previous mask |
| Lasso Alt at pointerDown | Subtract boolean — **not** PS straight-segment toggle |
| Tool switch | Commit float; keep mask |
| Reselect / Invert | Out |

## Performance

| Case | Twilite v1 |
|------|------------|
| 160×160 mask ops | OK sync |
| Long lasso point list | Coalesce / cap |
| Ants every frame | Contour cached per mask change |

## Acceptance

- [ ] Каждый row имеет тест или явный skip reason
- [ ] Нет молчаливых отличий от этой матрицы в коде
- [ ] Новые edge cases из 01–10 сначала попадают сюда, потом в код
