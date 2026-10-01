# 07 — Clipboard: Copy / Cut / Paste / Delete

## Цель

Спецификация Ctrl+C / Ctrl+X / Ctrl+V / Delete для selection + float. Internal clipboard only (v1).

## Источники

### Aseprite Edit menu ([docs](https://aseprite.com/docs/edit-menu/))

| Command | Shortcut | Behavior |
|---------|----------|----------|
| Cut | Ctrl+X | Cuts the active selection content |
| Copy | Ctrl+C | Copies selected content (or layer/cel/frame depending on context) |
| Copy Merged | Ctrl+Shift+C | Visible layers merged — **out of scope v1** |
| Paste | Ctrl+V | Pastes the clipboard |
| Delete | Del | Deletes the selected content |

### Photoshop ([Copy and paste selections](https://helpx.adobe.com/photoshop/desktop/make-selections/refine-modify-selections/copy-and-paste-selections.html))

- Edit > Copy / Copy Merged / Cut / Paste.
- Paste creates a **new layer** in the destination image.
- Dragging with the Move tool avoids the clipboard.
- Alt/Option-drag copies while dragging.
- Paste between different resolutions keeps pixel dimensions.

### Delete / Clear ([Delete or cut selected pixels](https://helpx.adobe.com/photoshop/desktop/make-selections/refine-modify-selections/delete-or-cut-selected-pixels.html))

- Edit > Clear or Backspace (Win) / Delete (macOS) «to remove the selection».
- Edit > Cut removes selection content and places it on the clipboard.
- Deleting on a background layer replaces with background color; on a standard layer → **transparency**.

Adobe wording «remove the selection» is ambiguous about marching ants. Deselect is a **separate** command ([Get started with selections](https://helpx.adobe.com/photoshop/using/making-selections.html)). Official Clear page does **not** explicitly say ants remain. Secondary tutorials commonly show ants remaining after Clear — **not** used as primary fact.

Transparent-layer clear on move aligns with Aseprite ([Move Selection](https://aseprite.com/docs/move-selection/)).

### Aseprite Delete + mask

Official Edit menu documents Delete content, not post-delete mask policy. Community notes a Preferences option to **keep selection after delete** (default often clears selection outline) — [community thread](https://community.aseprite.org/t/keep-marquee-tool-after-pressing-the-delete-button/8288) (secondary). Prefer PRODUCT over inventing official default.

### Product plan overrides

- Internal clipboard `{ pixels, mask, width, height }` — not OS clipboard.
- Paste as **new float** on active layer (не новый layer) — отличие от Photoshop.
- Paste centered; repeated pastes offset (+1,+1) — план.
- **Delete:** clear selected pixels (undoable), **then clear mask** → Idle (**PRODUCT**).
- Copy Merged out of scope.
- **Cut:** clipboard + clear pixels (undo) + **clear mask** → Idle (**PRODUCT**; не оставлять float после Cut).

## Happy paths — от hotkey до Idle/Floating

### Copy (Ctrl+C)

Preconditions: HasMask or Floating; else no-op.

1. If Floating: serialize current float pixels+mask (post-transform visual) into `selectionClipboard`.
2. If HasMask: extract under mask from active layer into clipboard (do **not** modify layer).
3. Mask remains; float remains.
4. No undo.
5. Fully transparent extract: **PRODUCT** — still store buffer+mask shape (pasteable empty float).

### Cut (Ctrl+X)

Preconditions: HasMask or Floating; layer unlocked; not animating.

1. Perform Copy semantics into clipboard.
2. Clear source pixels to transparent.
3. `pushLayerUndo` (pixel change).
4. Clear mask → Idle; clear float if any (already cut pixels — if Floating: treat as discard float session without restore, hole already present / or clear from HasMask path).
5. **PRODUCT v1:** Cut **не** leaves float. Float entry = Move / Paste only.

**Floating + Cut:** copy float content → discard float without restore (keep punched hole from cut-out) → push undo from base-with-hole → clear mask → Idle.

### Paste (Ctrl+V)

Preconditions: clipboard non-null; active layer unlocked; not animating.

1. If float open → `commitFloat` first.
2. Create `floatSession` from clipboard pixels/mask.
3. **Position PRODUCT:** first paste centers on canvas; each subsequent paste without intervening Copy/Cut offsets +1,+1 from previous paste origin (clamp to keep bbox intersecting canvas).
4. Do **not** push undo until `commitFloat`.
5. User may move/scale/rotate ([`06`](./06-floating-transform.md)).
6. Enter / click outside / tool switch → stamp → one undo → HasMask (mask = pasted shape).
7. Esc → cancelFloat: restore layer snapshot from paste-start (no stamp); restore mask that existed after step-1 commit (often previous mask or null).

### Delete

Preconditions: HasMask or Floating; layer unlocked.

**HasMask:**

1. Clear pixels under mask → transparent.
2. `pushLayerUndo`.
3. Clear mask → Idle (**PRODUCT**, план).

**Floating:**

1. Keep punched hole (do **not** restore `baseLayerSnapshot`).
2. Discard float pixels (do not stamp).
3. `pushLayerUndo` from base-with-hole baseline.
4. Clear float + mask → Idle.

## Edge cases

| Case | Expected |
|------|----------|
| Copy with no selection | no-op |
| Paste with empty clipboard | no-op |
| Paste on locked layer | no-op |
| Paste larger than canvas | float may extend; stamp clips |
| Cut on locked | no-op |
| Delete on locked | no-op |
| System paste (OS image) | Ignored in v1 (only internal) |
| Copy then deselect then paste | Works (clipboard persists) |
| Copy Merged shortcut | Unbound / no-op |
| Undo after Delete | Restores pixels; **mask stays cleared** (mask not in undo) |
| Undo after Paste commit | Removes pasted pixels |
| Float + Copy | Copies float content; float continues |
| Rapid paste spam | +1,+1 offsets |
| Cut with no selection | no-op |
| Delete while Drafting | Cancel? **PRODUCT:** ignore Delete mid-draft or cancel draft then no-op — prefer **no-op while Drafting** |
| Focus in text Input | Do not intercept hotkeys |

## Hotkeys placement

Добавить в `APP_HOTKEYS` / EditorPage handlers; не перехватывать когда focus в text Input (tolerance field и т.д.).

## Acceptance

- [ ] Internal clipboard only
- [ ] Delete clears mask after clearing pixels
- [ ] Paste → float → commit undo once
- [ ] Cut clears pixels + mask (no leftover float)
- [ ] Locked/anim guards
- [ ] Mask changes not restored by undo after Delete
