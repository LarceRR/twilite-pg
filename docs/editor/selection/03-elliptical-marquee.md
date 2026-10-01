# 03 — Elliptical Marquee (`ellipse`)

## Цель

Эллиптическое / круговое выделение. UX зеркален rectangular marquee, отличается **rasterization** (ellipse fill) и constrain = circle.

## Источники

| Поведение | Источник |
|-----------|----------|
| Elliptical Marquee; Shift → circle; Alt/Option → from center | [Adobe: Select with the marquee tools](https://helpx.adobe.com/photoshop/using/selecting-marquee-tools.html) |
| Spacebar reposition while dragging | Same |
| Anti-alias option exists in Photoshop for elliptical | Same (мы **не** включаем anti-alias в v1 — план) |
| Click outside → deselect (Rect/Ellipse/Lasso) | [Adobe: Get started with selections](https://helpx.adobe.com/photoshop/using/making-selections.html) |
| Aseprite elliptical-like tools: Shift square/circle aspect; Space move origin; Ctrl from center | [Aseprite Keyboard Shortcuts](https://aseprite.com/docs/keyboard-shortcuts/) |
| Aseprite boolean Alt+Shift subtract (не Alt alone) | [Aseprite Selecting](https://aseprite.org/docs/selecting/) |

Tool cycling (M / Shift+M): в Aseprite tools могут делить одну клавишу и циклиться ([Keyboard Shortcuts — Tools](https://aseprite.com/docs/keyboard-shortcuts/)). Точный hotkey-cycle Photoshop Marquee в этой спеке **не** фиксируем как требование v1 (UI flyout достаточно).

## Продуктовый mapping

Те же modifier rules, что у [`02-rectangular-marquee.md`](./02-rectangular-marquee.md):

- Shift → circle **только** когда не используется как Add override.
- Alt → Subtract boolean (не from-center в v1).
- Space → reposition while dragging (**v1 REQUIRED** — same as rect; [`12`](./12-sources-and-product-decisions.md)).
- From-center → out of scope v1.
- Feather / Anti-alias → **off permanently** in v1 (hard binary mask).

UI label в коде: «Круг» (`SELECTION_TOOL_LABELS.ellipse`), но геометрия = ellipse; circle только с constrain.

## Happy path — от клика на тул до выхода

### A. Активация

1. User выбирает Select → flyout `ellipse` (`Circle` icon) → `setSelectionTool("ellipse")`.
2. Sticky `selectionOpMode` из flyout (default Replace).
3. Если был `floatSession` — не начинать draft до auto-commit при pointerDown (инвариант [`01`](./01-lifecycle-state-model.md)).

### B. Первое выделение (Replace)

1. Idle → `pointerDown` → draft `{ kind:"ellipse", x0,y0,x1,y1, constrainCircle:false }`.
2. Drag задаёт **bounding box** эллипса (как Photoshop: drag defines ellipse bounds).
3. Shift (per square/circle rules в [`02`](./02-rectangular-marquee.md)) → `constrainCircle`, bbox становится квадратом → вписанная окружность.
4. Space → nudge bbox (оба угла) — **REQUIRED** while pointer down.
5. Overlay: ellipse stroke по bbox (screen space); **не** ants.
6. `pointerUp` → normalize bbox → rasterize binary ellipse → boolean → `selectionMask`.
7. Empty result → Idle; иначе HasMask (ants по **mask contour**, не по bbox).

### C. Refine

1. Повторный ellipse/rect/lasso drag с Replace/Add/Subtract — [`05`](./05-boolean-modes.md).
2. Hit-test «inside» = mask bit, **не** bbox corner (см. ниже).
3. Esc mid-draft → discard draft, keep previous mask.

### D. Transform / clipboard

1. Click inside **mask** (not bbox-only corner) → float move ([`06`](./06-floating-transform.md)).
2. Handles: axis-aligned bbox **of mask** (стандарт transform box вокруг selected pixels).
3. Ctrl+C/X/V, Delete — [`07`](./07-clipboard-cut-copy-paste-delete.md).

### E. Exit

Идентично rect ([`08`](./08-select-all-deselect-exit.md)):

- Ctrl+D / click outside (Replace) → deselect.
- Esc → cancel draft/float only, **не** deselect.
- Tool switch → commit float, keep mask.
- Delete → clear pixels + clear mask.

## Rasterization (binary, no AA)

Photoshop с Anti-alias создаёт partial coverage на краях ([Marquee tools](https://helpx.adobe.com/photoshop/using/selecting-marquee-tools.html)). У нас план: **Nearest / binary coverage only**.

**Canonical algorithm** (`selectionMask.fillEllipse`) — **PRODUCT DECISION** locked in [`12`](./12-sources-and-product-decisions.md):

Для каждого pixel center `(px+0.5, py+0.5)` внутри bbox:

\[
\left(\frac{px+0.5-cx}{rx}\right)^2 + \left(\frac{py+0.5-cy}{ry}\right)^2 \le 1
\]

где `(cx,cy)` — центр bbox, `rx,ry` — полуоси в pixel units.

**Mid-point / integer Bresenham-style ellipse fill** — allowed **only** if golden mask tests prove **bit-identical** to this analytical formula. Otherwise implement analytical.

**Пустой эллипс:** если bbox width или height < 1 после normalize → discard.

**1×1 bbox:** один пиксель selected (circle/ellipse degenerate).

**Very flat ellipse** (1×N): заполнение должно давать непрерывную «линзу»/полосу без дыр на длинной оси (тест).

## Preview vs committed

- Draft overlay: SVG/CSS ellipse stroke по bbox (screen space).
- Committed ants: по **фактической** mask boundary (не по bbox), иначе UI врёт на диагоналях.

## Edge cases (ellipse-specific)

| Case | Expected |
|------|----------|
| Extreme aspect (2×100) | Binary fill continuous; no crash |
| Circle constrain with negative drag | Normalize then constrain |
| Subtract ellipse from rect | Boolean pixel-wise ([`05`](./05-boolean-modes.md)) |
| Hit-test «inside selection» | Test against mask bit, not bbox |
| Handles | AABB of mask around ellipse |
| Rotation later | Float rotation expands bounds ([`06`](./06-floating-transform.md)) |
| Zoom AA illusion | Stroke may look soft; mask remains binary |
| Click in bbox corner outside ellipse mask + Replace | Deselect (outside mask), not float |
| Click in bbox corner + Add sticky | Begin new ellipse draft (Add), not float |
| Space + Shift together | Space reposition; constrain still applied to relative size |
| Off-canvas ellipse | Clip fill to canvas |
| Locked / animating | Same as rect ([`02`](./02-rectangular-marquee.md)) |

## Конфликт hit-test inside

Клик в угол bbox эллипса, но **вне** ellipse mask:

- Не должен начинать float move.
- При Replace + outside mask → deselect.
- При начале нового ellipse draft (Add/Subtract или intentional new stroke) — OK.

Это критично отличается от rect, где bbox == mask.

## Тест-план

1. Circle Shift: width==height bbox; mask roughly circular.
2. Ellipse without Shift: rx≠ry.
3. Inside-hit uses mask not bbox (corner of bbox false).
4. Add ellipse ∪ rect.
5. Subtract ellipse hole.
6. Escape cancel draft.
7. Golden mask snapshot for 10×10 circle centered.
8. Click bbox-corner outside mask deselects.
9. Esc does not deselect committed ellipse.

## Acceptance

- [ ] Binary ellipse, no feather/AA
- [ ] Analytical pixel-center ≤1 fill (or golden-identical mid-point)
- [ ] Space reposition REQUIRED while dragging
- [ ] Same boolean / exit / float contracts as rect
- [ ] Hit-testing uses mask bits
