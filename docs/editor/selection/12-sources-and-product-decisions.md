# 12 — Sources & product decisions

## Цель

Единый реестр **интернет-источников** (обязательное правило этой спецификации) и **зафиксированных продуктовых решений**, где платформы расходятся.

---

## Primary sources (official / vendor docs)

### Aseprite

1. Selecting — https://aseprite.org/docs/selecting/  
   Boolean Replace / Shift union / **Alt+Shift** subtract / Ctrl+Shift intersect; Select All; Deselect; Reselect; Invert; active cel scope; marching ants.
2. Move Selection — https://aseprite.com/docs/move-selection/  
   Drag/arrows; BG vs transparent clear colors; transform fields X/Y/W/H/Rotation/Skew.
3. Keyboard Shortcuts / Action Modifiers — https://aseprite.com/docs/keyboard-shortcuts/  
   Shape: Shift aspect, **Ctrl** from-center, Alt rotate shape, Space move origin; Selection translate/scale/rotate modifiers (Shift aspect on scale; Shift angle snap 26.6°/45°/90° on rotate).
4. Edit Menu — https://aseprite.com/docs/edit-menu/  
   Cut/Copy/Copy Merged/Paste/Delete; Transform Ctrl+T.
5. Transformations — https://aseprite.org/docs/transformations/  
   Handles; multi-cel commit on click outside.

### Adobe Photoshop

1. Select with marquee tools — https://helpx.adobe.com/photoshop/using/selecting-marquee-tools.html  
   Rect/ellipse; Shift constrain; Alt from-center; Space reposition; New/Add/Subtract/Intersect; feather/AA notes.
2. Select with lasso tools — https://helpx.adobe.com/photoshop/using/selecting-lasso-tools.html  
   Freehand close on release; polygonal; magnetic; boolean options; Selection Brush (out of scope).
3. Get started with selections — https://helpx.adobe.com/photoshop/using/making-selections.html  
   Select All; Deselect (Ctrl/Cmd+D); click outside with Rect/Ellipse/Lasso to deselect; Reselect.
4. Adjust a selection manually — https://helpx.adobe.com/ie/photoshop/desktop/make-selections/refine-modify-selections/adjust-a-selection-manually.html  
   Shift add; Alt/Option subtract.
5. Select only an area intersected by other selections — https://helpx.adobe.com/photoshop/desktop/make-selections/refine-modify-selections/select-area-intersected-by-other-selections.html  
   Intersect via options bar or **Alt+Shift** / Option+Shift.
6. Free Transform — https://helpx.adobe.com/photoshop/using/free-transformations-images-shapes-paths.html  
   Scale/rotate; Shift **15°** rotate; commit/cancel paths; aspect ratio button behavior (21.0+); Legacy Free Transform preference.
7. Copy and paste selections — https://helpx.adobe.com/photoshop/desktop/make-selections/refine-modify-selections/copy-and-paste-selections.html  
   Copy/Cut/Paste; Move tool drag; paste as new layer.
8. Delete or cut selected pixels — https://helpx.adobe.com/photoshop/desktop/make-selections/refine-modify-selections/delete-or-cut-selected-pixels.html  
   Clear / Delete / Cut; BG color vs transparency on standard layer.
9. Magic Wand — https://helpx.adobe.com/photoshop/desktop/make-selections/automatic-color-based-selections/select-areas-by-color-with-the-magic-wand-tool.html  
   Tolerance 0–255, Contiguous, Sample All Layers, Anti-alias (default value **not** stated on this page).
10. Vanishing Point floating selection description — https://helpx.adobe.com/photoshop/using/vanishing-point.html  
    Domain-specific floating selection wording (hover + click outside paste); not primary FT reference.

### Secondary (illustrative, lower priority)

- Selection Tools (mintlify wiki mirroring tool UX) — https://mintlify.wiki/aseprite/aseprite/tools/selection  
  Useful for freehand lasso auto-close / wand tolerance narrative / 1-bit mask wording.  
  **Do not trust for modifiers:** wiki says Alt = subtract and Alt = from-center; official docs say **Alt+Shift** subtract and **Ctrl** from-center. Prefer aseprite.org / aseprite.com always on conflict.
- Aseprite community (keep selection after delete preference) — https://community.aseprite.org/t/keep-marquee-tool-after-pressing-the-delete-button/8288  
  Confirms a Preferences option exists; not an official default spec.
- Aseprite community (Esc mentioned as deselect in a bug thread) — https://community.aseprite.org/t/select-tool-persisting-disallowing-other-tools/12491  
  Secondary only; Twilite Esc policy follows Photoshop FT cancel, not this.
- Photoshop Essentials marquee tutorials (Space reposition walkthrough): https://www.photoshopessentials.com/basics/photoshop-selection-basics-the-rectangular-and-elliptical-marquee-tools/
- Adobe rectangular marquee how-to: https://helpx.adobe.com/ph_fil/photoshop/how-to/rectangular-marquee-tool.html
- Marching ants: https://en.wikipedia.org/wiki/Marching_ants

---

## Conflicts → Twilite v1 decisions

| Topic | Photoshop | Aseprite | **Twilite v1** | Doc |
|-------|-----------|----------|----------------|-----|
| Subtract modifier | Alt | Alt+Shift (or RMB) | **Alt** | [`05`](./05-boolean-modes.md) |
| Intersect | Alt+Shift | Ctrl+Shift | **Out** (Alt[+Shift] → Subtract, not Intersect) | [`05`](./05-boolean-modes.md) |
| Draw from center | Alt | Ctrl | **Out** (Alt = subtract) | [`02`](./02-rectangular-marquee.md) |
| Rotate snap | 15° | 26.6°/45°/90° mentioned | **15°** | [`06`](./06-floating-transform.md) |
| Aspect lock | Shift toggles (modern) / legacy constrain | Shift maintain | **Shift = maintain aspect** | [`06`](./06-floating-transform.md) |
| Paste target | New layer | Paste into sprite/cel | **Float on active layer** | [`07`](./07-clipboard-cut-copy-paste-delete.md) |
| Delete + mask | Clear removes pixels; Deselect separate (ants policy not explicit in Clear doc) | Delete content; optional keep-selection pref (secondary) | **Clear mask after Delete** | [`07`](./07-clipboard-cut-copy-paste-delete.md) |
| Cut aftereffect | Content to clipboard | Cuts selection content | **Clipboard + clear pixels + clear mask; no leftover float** | [`07`](./07-clipboard-cut-copy-paste-delete.md) |
| OS clipboard | Yes | Yes | **Internal only** | [`07`](./07-clipboard-cut-copy-paste-delete.md) |
| Feather / AA | Available | Soft edges options exist | **Binary only** | plan |
| Sampling rotate | Bicubic etc. | Multiple incl. RotSprite | **Nearest-neighbor** | plan / [`06`](./06-floating-transform.md) |
| Mask in undo | History includes selection (typical PS) | Full undo model (not fully cited here) | **Mask changes not in undo** | [`01`](./01-lifecycle-state-model.md) |
| Esc | Cancel FT (not Deselect) | Community sometimes uses Esc to deselect (secondary) | **Cancel draft/float, not deselect** | [`08`](./08-select-all-deselect-exit.md) |
| Wand runtime | Yes | Yes | **Deferred** | [`09`](./09-magic-wand-deferred.md) |
| Wand default tolerance | Range 0–255 documented; default not on official wand page | Range 0–255 (secondary wiki) | **Code default 32 (PRODUCT)** | [`09`](./09-magic-wand-deferred.md) |
| Skew | Yes in FT | Yes | **Out** | [`06`](./06-floating-transform.md) |
| Movable pivot | Reference point locator in FT | Pivot options exist | **Out** (fixed bbox center) | [`06`](./06-floating-transform.md) |
| Lasso fill rule on self-intersect | Not specified as API | Not specified as API | **even-odd (PRODUCT)** | [`04`](./04-lasso.md) |
| Paste offset spam | Common UX pattern; not a hard Adobe rule | Pastes at location (docs) | **Center first; then +1,+1** | [`07`](./07-clipboard-cut-copy-paste-delete.md) |
| Space reposition mid-marquee | Documented (hold Space while dragging) | Space = Move Origin (shape tools) | **v1 REQUIRED** (rect/ellipse) | [`02`](./02-rectangular-marquee.md), [`03`](./03-elliptical-marquee.md) |
| Double-click commit float | Documented commit path in Free Transform | Click outside commits transform | **v1 YES** (alongside Enter) | [`06`](./06-floating-transform.md) |
| Ellipse binary fill | Anti-alias optional; binary coverage when AA off | Not specified as API | **Analytical pixel-center ≤1** | [`03`](./03-elliptical-marquee.md) |
| Sticky boolean persistence | Options bar sticky for session | Context bar sticky for session | **Session / store lifetime; reset Replace on new/close doc; not disk** | [`05`](./05-boolean-modes.md) |
| Arrow nudge from HasMask | Move tool / FT moves pixels | Arrows move selection ([Move Selection](https://aseprite.com/docs/move-selection/)) | **First arrow cut-out→float then 1px; further arrows nudge float** | [`06`](./06-floating-transform.md), [`11`](./11-edge-cases-matrix.md) |

---

## Locked PRODUCT DECISIONs (consensus close-out)

These close remaining open items. Platform-aligned rows cite vendor URLs above; pure product locks are labeled.

1. **Space reposition while dragging marquee — v1 REQUIRED** (rect / ellipse only; not lasso).  
   Adobe primary: [Select with the marquee tools](https://helpx.adobe.com/photoshop/using/selecting-marquee-tools.html) («To reposition a rectangular or elliptical marquee… hold down the spacebar»). Aseprite: Space = Move Origin on Shape Tool ([Keyboard Shortcuts](https://aseprite.com/docs/keyboard-shortcuts/)). Implementation is translate-both-corners while Space held — low risk → **ship required**, not defer.

2. **Double-click inside float → commit — YES (v1).**  
   Additional commit path alongside Enter / click-outside / tool switch. Adobe: [Free Transform](https://helpx.adobe.com/photoshop/using/free-transformations-images-shapes-paths.html) lists double-click inside the transformation marquee as a commit method.

3. **Ellipse fill algorithm — analytical pixel-center `≤ 1` is canonical.**  
   Mid-point ellipse fill is allowed **only** if golden mask tests prove bit-identical to the analytical formula. See [`03`](./03-elliptical-marquee.md). **PRODUCT DECISION** (vendors do not publish a pixel-API fill rule for binary AA-off ellipse).

4. **Sticky `selectionOpMode` persistence — editor session / Zustand store lifetime.**  
   Survives tool switches and strokes. Resets to **Replace** on full document close / new document. **Not** persisted to disk: current `editorCanvasStore` has no persist middleware for selection tool prefs (`selectionTool` is in-memory only). If disk persistence for tool prefs is added later, revisit explicitly.

5. **Arrow-key nudge from HasMask — first arrow starts float (cut-out) then nudges 1px; subsequent arrows nudge the float.**  
   Aligns with Aseprite arrows moving selection content ([Move Selection](https://aseprite.com/docs/move-selection/)). **PRODUCT DECISION** on the HasMask→float cut-out trigger (Adobe Move/FT is a separate tool path). Documented in [`06`](./06-floating-transform.md) and [`11`](./11-edge-cases-matrix.md).

---

## Scope reminder (from feature plan)

**In:** rect, ellipse, lasso; Replace/Add/Subtract; free transform move/scale/rotate; NN; copy/cut/paste/delete; layer undo on pixel commit; clip paint/fill to mask; mask NOT in undo; Subtract = Alt; Delete clears mask; Esc cancels draft/float but does NOT deselect; **Space reposition mid-marquee (rect/ellipse) REQUIRED**; **double-click inside float commits**; **arrow from HasMask starts float then nudges**.

**Out:** wand runtime; Intersect; skew/distort/RotSprite; soft feather/AA; Copy Merged; system clipboard; movable pivot; from-center draw; polygonal/magnetic lasso as separate tools; disk-persist sticky boolean mode.

---

## Rule for future editors of these docs

1. Любое новое поведение платформы — только с URL источника (prefer aseprite.org / aseprite.com / helpx.adobe.com).
2. Если источника нет — помечать `PRODUCT DECISION` явно, не маскировать под «так делают все».
3. При расхождении Adobe vs Aseprite — обновить таблицу Conflicts, не размазывать по файлам без ссылки сюда.
4. Mintlify / Reddit / community — secondary only; never override official Selecting / Keyboard Shortcuts / Adobe help.
