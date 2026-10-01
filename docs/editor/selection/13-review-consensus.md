# 13 — Review consensus (implementation gate)

## Status

**APPROVED FOR IMPLEMENTATION** — readiness **10 / 10**.

Two prior reviewers edited `docs/editor/selection/`. This file records the **final consensus denominator**: remaining open items are locked, Cut/Esc/Shift/paste/undo-float contracts agree across 01–12, and indexes point here.

Canonical registry of vendor URLs + conflict table: [`12-sources-and-product-decisions.md`](./12-sources-and-product-decisions.md).

---

## Final locked decisions (close-out items 1–5)

| # | Topic | Decision | Label | Primary cite / note |
|---|-------|----------|-------|---------------------|
| 1 | Space reposition while dragging marquee | **v1 REQUIRED** for `rect` / `ellipse` (not lasso) | Adobe-aligned | [Select with the marquee tools](https://helpx.adobe.com/photoshop/using/selecting-marquee-tools.html); Aseprite Space = Move Origin — [Keyboard Shortcuts](https://aseprite.com/docs/keyboard-shortcuts/). Low implement risk → required, not deferred. |
| 2 | Double-click inside float → commit | **YES** — additional commit path with Enter / click-outside / tool switch | Adobe-aligned | [Free Transform](https://helpx.adobe.com/photoshop/using/free-transformations-images-shapes-paths.html) |
| 3 | Ellipse fill algorithm | **Canonical:** analytical pixel-center \(\le 1\). Mid-point only if golden tests prove bit-identical | **PRODUCT DECISION** | Vendors do not publish a pixel-API binary fill rule; see [`03`](./03-elliptical-marquee.md) |
| 4 | Sticky `selectionOpMode` persistence | Session / store lifetime; reset to **Replace** on new/close document; **not** disk-persisted | **PRODUCT DECISION** | `editorCanvasStore` has no persist middleware for selection prefs today |
| 5 | Arrow-key nudge from HasMask | First arrow **cut-out → float** then nudge 1px; further arrows nudge float | **PRODUCT DECISION** (trigger) + Aseprite arrows | [Move Selection](https://aseprite.com/docs/move-selection/); docs [`06`](./06-floating-transform.md), [`11`](./11-edge-cases-matrix.md) |

---

## Cross-file contracts (must stay consistent)

| Contract | Locked behavior |
|----------|-----------------|
| **Cut** | Clipboard + clear pixels (undo) + clear mask → **Idle**; **never** leaves float |
| **Esc** | Cancel draft **or** cancelFloat (restore base+mask); **never** deselect |
| **Shift** | Square/circle only when sticky Replace + no mask + effective Replace; otherwise Add override when mask exists / sticky Add |
| **Paste** | Internal clipboard → float on active layer; center first, then +1,+1 spam offset |
| **Undo + float** | Ctrl+Z while Floating = `cancelFloat` only (no stack pop); one layer undo on commit |
| **Delete** | Clear pixels then **clear mask** → Idle |
| **Ctrl+D while Floating** | `commitFloat` then deselect |
| **Subtract** | **Alt** (Photoshop-like); Intersect out |
| **Mask undo** | Mask changes **not** in undo v1 |

---

## Reviewer consensus statement

The selection domain docs under `docs/editor/selection/` are the **single source of truth** for v1 runtime behavior. Platform claims carry vendor URLs in [`12`](./12-sources-and-product-decisions.md). Where Adobe and Aseprite diverge, Twilite choices are explicit in the Conflicts table. Soft/open language on Space, float double-click, ellipse fill, sticky disk persistence, and HasMask arrow nudge is **closed**. A future coding session may implement against 01–11 without reopening product questions unless a new conflict with code feasibility is raised — then update [`12`](./12-sources-and-product-decisions.md) and this file together.

**Consensus readiness: 10 / 10.**

---

## Index pointers

- Folder index: [`00-INDEX.md`](./00-INDEX.md)
- Editor roadmap: [`../00-INDEX.md`](../00-INDEX.md) → Selection & Transform
