# 10 — Overlay, handles, hit-testing, zoom

## Цель

Визуализация selection (marching ants, draft, float, handles) и корректный hit-test при целочисленном zoom.

## Источники

| Topic | Source |
|-------|--------|
| Marching ants visual language | [Aseprite Selecting](https://aseprite.org/docs/selecting/) + [Wikipedia Marching ants](https://en.wikipedia.org/wiki/Marching_ants) (linked from Aseprite docs) |
| Transform handles / rotate outside border | [Photoshop Free Transform](https://helpx.adobe.com/photoshop/using/free-transformations-images-shapes-paths.html) |
| Selection/transform context in Aseprite | [Keyboard Shortcuts — Scaling/Rotating Selection](https://aseprite.com/docs/keyboard-shortcuts/) |
| Reposition marquee while selecting | [Adobe Marquee tools](https://helpx.adobe.com/photoshop/using/selecting-marquee-tools.html) |

## Components (plan)

- `SelectionOverlay.tsx` — ants, draft preview, handles.
- Pointer logic in `usePixelCanvasPointer.ts`.
- Reuse hit patterns from storyboard crop handles where possible.

## Coordinate spaces

| Space | Use |
|-------|-----|
| Document pixels | Mask, draft points, transform math |
| Screen / CSS | Overlay SVG/CSS drawing, handle size in CSS px |
| Hit-test | screen → document via inverse viewport (zoom+pan) |

Zoom rule проекта: только целый scale, zoom to cursor ([`../03-viewport-zoom-grid.md`](../03-viewport-zoom-grid.md)).

## Marching ants

- Animate dash offset along selection outline.
- Outline from mask edges (pixel boundary), not only AABB — critical for ellipse/lasso/multi-island.
- Performance on 160×160: extract contours once per mask change; animate CSS/SVG cheaply.

## Draft preview

| Tool | Preview |
|------|---------|
| Rect | Rectangle stroke |
| Ellipse | Ellipse stroke in bbox |
| Lasso | Polyline + closing segment |

Draft не анимирует ants.

## Handles

- Draw in screen space with constant ~8–12 CSS px hit size regardless of zoom (Photoshop-like usability at high zoom).
- Document-space handle anchors = float/mask bbox corners/edges.
- Rotate zones: annular wedges outside corners; priority over scale when both could hit.

### Hit priority (top → bottom)

1. Rotate zone
2. Scale handles
3. Inside float/mask (move)
4. Outside (deselect / new draft / commit float)

## Cursor feedback

| Hover | Cursor |
|-------|--------|
| Inside move | move / grab |
| Edge scale | ew/ns-resize |
| Corner scale | nwse/nesw-resize |
| Rotate | alias / custom rotate |
| Add mode | copy/plus |
| Subtract mode | not-allowed/minus custom |

## Edge cases

| Case | Expected |
|------|----------|
| Zoom 1× tiny handles | Min CSS hit target ≥ 8px |
| Zoom 32× | Handles don't become huge document-sized |
| Multi-island | One AABB for handles; ants per island |
| Mask 1px | Still show handles around that pixel |
| Overlay vs pixel grid | Ants above grid, below UI chrome |
| Pointer capture lost | End drag gracefully |
| Touch (future) | Larger hit slop — out of scope v1 unless mobile editor needs |

## Acceptance

- [ ] Ants follow mask topology
- [ ] Hit-test zoom-correct
- [ ] Handle priority order fixed in tests/fixtures
