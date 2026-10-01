# 09 — Magic Wand (`wand`) — deferred runtime

## Цель

UI prefs уже есть в `SelectionToolFlyout`; **runtime кликов нет** (план: out of scope v1). Этот документ фиксирует **целевое** поведение по официальным источникам, чтобы следующая сессия не выдумывала параметры.

## Источники

### Photoshop Magic Wand

[Select areas by color with the Magic Wand tool](https://helpx.adobe.com/photoshop/desktop/make-selections/automatic-color-based-selections/select-areas-by-color-with-the-magic-wand-tool.html):

- Tolerance 0..255 (narrow..broad).
- Contiguous: only adjacent similar colors when enabled.
- Sample All Layers: base selection on all visible layers when enabled.
- Anti-alias option (мы, вероятно, выключим для pixel art binary mask).
- Selection modes New/Add/Subtract/Intersect via options / modifiers.

Tutorial: [Select by color Magic Wand](https://helpx.adobe.com/ph_fil/photoshop/how-to/select-by-color-magic-wand.html) — Shift add, Alt/Option subtract; Contiguous off = nonadjacent.

### Aseprite

Официальные Selecting docs описывают selection tools в общем, без полного wand parameter reference. Вторичный обзор:

[Selection Tools wiki](https://mintlify.wiki/aseprite/aseprite/tools/selection) (secondary — не для boolean modifiers):

- Tolerance 0–255; 0 exact; 255 all colors.
- Click selects connected regions of similar color.
- Indexed mode compares palette indices (N/A — у нас RGBA).

Boolean modes для wand — те же Action Modifiers, что у других selection tools: официально [Selecting](https://aseprite.org/docs/selecting/) (Shift add / Alt+Shift subtract / Ctrl+Shift intersect). Wiki modifiers **игнорировать**.

Default tolerance in our code: `WAND_DEFAULT_TOLERANCE = 32`. Adobe Magic Wand docs document range 0–255 but **do not state a default value** on the official page above. Treat `32` as **PRODUCT / code default**, not a cited Adobe default.

## Current code (baseline)

`selection.ts`: tool catalog includes `wand`.  
Flyout fields:

- `wandTolerance` 0–255 (`Input` commitOnBlur)
- `wandContiguous` checkbox
- `wandSampleAllLayers` checkbox

Pointer: Select ignored entirely → wand click = no-op.

## Target happy path (future)

1. Select wand tool; set tolerance/contiguous/sampleAllLayers.
2. Click seed pixel.
3. Compute region:
   - Sample color from active layer **or** composite if sampleAllLayers.
   - Flood / scan similar colors within tolerance.
   - Contiguous on → 4-way flood from seed; off → all pixels matching tolerance globally.
4. Apply boolean with existing mask.
5. Show ants; further edit same as other selection tools.

## Tolerance definition (must cite algorithm when implementing)

Photoshop uses RGB distance style tolerance (exact formula version-dependent). При реализации — искать актуальный Adobe description / Aseprite source; **не** выдумывать. Placeholder: document chosen formula in PR with link.

## v1 behavior (now)

| Action | Result |
|--------|--------|
| Select wand in flyout | OK, prefs editable |
| Click canvas | no-op (maybe toast «скоро») |
| Ctrl+A/D etc. | Work if mask exists from other tools |
| Prefs persist in store | Yes |

## Edge cases (for future implementation doc expansion)

| Case | Note |
|------|------|
| Tolerance 0 | Exact RGBA match (define alpha policy) |
| Transparent seed | Select contiguous transparent |
| Sample all layers vs fill tool policy | Align with [`../04-fill-tools.md`](../04-fill-tools.md) active-layer vs composite debate |
| Anti-alias | Prefer off for pixel art |

## Acceptance (v1)

- [ ] Prefs UI only
- [ ] No false claim that wand selects
- [ ] This doc linked from index as deferred
