# 08 — Select All / Deselect / Exit paths

## Цель

Все способы **закончить** или **сбросить** выделение / draft / float — единая таблица приоритетов.

## Источники

| Action | Aseprite | Photoshop |
|--------|----------|-----------|
| Select All | Select > All, Ctrl+A ([Selecting](https://aseprite.org/docs/selecting/)) | Select > All ([Get started with selections](https://helpx.adobe.com/photoshop/using/making-selections.html)) |
| Deselect | Select > Deselect, Ctrl+D ([Selecting](https://aseprite.org/docs/selecting/)) | Select > Deselect, Ctrl/Cmd+D; also click outside with Rect/Ellipse/Lasso ([Get started with selections](https://helpx.adobe.com/photoshop/using/making-selections.html)) |
| Reselect | Ctrl+Shift+D | Select > Reselect — **out of scope v1** |
| Invert | Ctrl+Shift+I | Select > Inverse — **out of scope v1** |
| Cancel transform | Esc cancel (documented for transform UX in mintlify secondary; official move/transform pages emphasize commit outside) | Esc cancels Free Transform ([Free Transform](https://helpx.adobe.com/photoshop/using/free-transformations-images-shapes-paths.html)) |
| Commit transform | Click outside ([Transformations](https://aseprite.org/docs/transformations/)) | Enter; click outside; tool change; etc. ([Free Transform](https://helpx.adobe.com/photoshop/using/free-transformations-images-shapes-paths.html)) |

**Esc ≠ Deselect (PRODUCT):** Photoshop Esc cancels Free Transform and does **not** replace Select > Deselect (Deselect is Ctrl/Cmd+D). Aseprite community threads sometimes mention Esc as deselect ([example](https://community.aseprite.org/t/select-tool-persisting-disallowing-other-tools/12491)) — **not** official Selecting docs. Twilite follows Photoshop FT cancel semantics: **Esc cancels draft/float only**.

## Product hotkeys (plan)

| Hotkey | Action |
|--------|--------|
| Ctrl+A | selectAll |
| Ctrl+D | deselect |
| Enter | commitFloat (if floating) |
| Double-click inside float | commitFloat (if floating) |
| Escape | cancel draft OR cancelFloat |
| Ctrl+C/X/V | clipboard |
| Delete | deleteSelection |
| Arrow keys | nudge float 1px; from HasMask first arrow starts float then nudges |

## Happy path — полный exit cycle

### Session example

1. Activate rect → drag → HasMask.
2. Refine with Add → still HasMask.
3. Drag inside → Floating → Enter → HasMask (transformed).
4. Esc → no-op (already committed).
5. Ctrl+D → Idle.
6. Optionally switch to Brush.

### Alternate exit via Delete

1. HasMask → Delete → pixels cleared + mask cleared → Idle ([`07`](./07-clipboard-cut-copy-paste-delete.md)).

### Alternate exit via click outside

1. HasMask + Replace + click outside → Idle.
2. Floating + click outside → commitFloat → HasMask; **second** click outside → Idle.

## Select All

1. If float → commitFloat first.
2. If draft → cancel draft first (or treat as discard then fill — **PRODUCT: cancel draft, then fill all**).
3. `selectionMask =` filled 1s for all W×H.
4. State HasMask.
5. Works on locked layer (mask only).
6. Does not push undo.

## Deselect (Ctrl+D)

1. If Drafting → cancel draft, then clear mask.
2. If Floating → **`commitFloat` then `deselect`** (preserve pixel edits, drop ants). **PRODUCT** (avoid losing committed work via accidental Deselect-as-cancel).
3. If HasMask → clear mask → Idle.
4. Clipboard unchanged.

## Escape priority

```
if selectionDraft: cancel draft (keep mask) ; return
if floatSession: cancelFloat (restore pixels+mask) ; return
else: no-op  // do NOT deselect on Esc
```

## Enter / double-click commit

```
if floatSession: commitFloat
else: no-op
```

Double-click inside the float transform marquee also commits (**v1 YES** — Adobe [Free Transform](https://helpx.adobe.com/photoshop/using/free-transformations-images-shapes-paths.html); [`12`](./12-sources-and-product-decisions.md)).
## Click outside (Select tool)

См. hit-test order в [`02`](./02-rectangular-marquee.md):

- Outside mask + Replace + no modifiers → deselect ([Adobe](https://helpx.adobe.com/photoshop/using/making-selections.html)).
- If Floating + outside → commitFloat (Adobe FT), mask remains (HasMask), **не** auto-deselect.
- **v1:** one click outside float = commit only; second click outside new mask = deselect.

## Tool switch

1. commitFloat if any.
2. Keep mask.
3. New tool may paint clipped to mask (plan).
4. Wand tool selected → mask kept; wand clicks no-op until runtime ([`09`](./09-magic-wand-deferred.md)).

## Frame / layer change

1. commitFloat onto source cel.
2. Keep document mask (mask is document-level).
3. Pixel ops now target new active layer under same mask.

## Animation play start

1. commitFloat if any.
2. Block new drafts; keep mask visible read-only.

## Full exit to Idle checklist

1. Esc (cancel in-progress draft/float) →
2. Ctrl+D (deselect) →
3. Optionally switch to Brush.

Или Delete (clears pixels+mask).

## Edge cases

| Case | Expected |
|------|----------|
| Esc while Idle | no-op |
| Esc while HasMask | no-op (keep ants) |
| Ctrl+D while Idle | no-op |
| Ctrl+A while Floating | commit then full mask |
| Click outside while sticky Add | Do **not** deselect; begin Add draft (or no-op if zero area) — **PRODUCT: outside+Add does not deselect** |
| Click outside while sticky Subtract | Same — no deselect |
| Enter while Drafting | no-op (finish with pointerUp) |
| Double-click inside float | commitFloat |
| Arrow from HasMask | cut-out → float → nudge 1px |
| Rapid Esc Esc | First cancels float/draft; second no-op |

## Acceptance

- [ ] Esc ≠ Deselect
- [ ] Ctrl+D clears mask; commits float first
- [ ] Ctrl+A full canvas mask
- [ ] Click-outside rules documented and tested
- [ ] Two-step outside click: commit float then deselect
- [ ] Double-click inside float commits
- [ ] Arrow from HasMask starts float then nudges
