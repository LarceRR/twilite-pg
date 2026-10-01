# 05 — Boolean modes (Replace / Add / Subtract)

## Цель

Описать, как новый draft взаимодействует с существующей `selectionMask`. INTERSECT — out of scope v1, но источники документируем для ясности.

## Источники

### Photoshop

- Options bar: New, Add To, Subtract From, Intersect With ([Marquee tools](https://helpx.adobe.com/photoshop/using/selecting-marquee-tools.html)).
- Adjust manually: Shift-drag = add; Alt/Option-drag = subtract ([Adjust a selection manually](https://helpx.adobe.com/ie/photoshop/desktop/make-selections/refine-modify-selections/adjust-a-selection-manually.html)).
- Intersect: Options bar Intersect **or** Alt+Shift / Option+Shift drag ([Select only an area intersected by other selections](https://helpx.adobe.com/photoshop/desktop/make-selections/refine-modify-selections/select-area-intersected-by-other-selections.html)).
- Before adjusting, Feather/Anti-alias should match original (Adobe) — у нас feather/AA нет → N/A.

### Aseprite

Из [Selecting](https://aseprite.org/docs/selecting/):

| Mode | Default gesture |
|------|-----------------|
| Replace | Left drag |
| Union (Add) | Left drag + **Shift** |
| Subtract | Left drag + **Alt+Shift**, or right mouse drag |
| Intersect | Left drag + **Ctrl+Shift** |

Keys customizable under Action Modifiers ([Keyboard Shortcuts](https://aseprite.com/docs/keyboard-shortcuts/)).

### Product v1 (план)

| Mode | Sticky UI | Modifier override | In scope |
|------|-----------|-------------------|----------|
| Replace | Default | — | Yes |
| Add | Flyout button | Shift | Yes |
| Subtract | Flyout button | **Alt** (Photoshop-like) | Yes |
| Intersect | — | — | **No** (ignore Alt+Shift / Ctrl+Shift as intersect) |

Мы сознательно ближе к **Photoshop** по Alt=Subtract, не к Aseprite Alt+Shift. См. [`12`](./12-sources-and-product-decisions.md).

## Sticky UI

Flyout (или mode strip рядом с selection tools) показывает 3 кнопки: Replace / Add / Subtract.

- Sticky mode сохраняется между штрихами и между сменой rect/ellipse/lasso.
- Modifier на pointerDown **временно** overrides sticky только для текущего stroke.
- После stroke sticky **не** меняется от modifier (как options bar Photoshop / context bar Aseprite).

**Persistence — PRODUCT DECISION** ([`12`](./12-sources-and-product-decisions.md)):

- `selectionOpMode` lives for the **editor session / Zustand store lifetime**.
- Survives tool switches (Select ↔ Brush etc.) and page soft remounts that keep the same store instance.
- Resets to **`replace`** on full **document close** / **new document**.
- **Not** written to disk / localStorage unless the store later gains an explicit tool-prefs persist path (today `editorCanvasStore` keeps `selectionTool` in-memory only — no persist middleware).

## Алгебра масок

Маски бинарные `0|1`.

```
Replace:  result = new
Add:      result = old OR new
Subtract: result = old AND NOT new
Intersect (later): result = old AND new
```

После операции:

- Если `result` все нули → `selectionMask = null` (Idle).
- Иначе заменить buffer.
- Mask ops **не** в undo v1.

## Happy path — от выбора mode до выхода

### A. Выбор mode в UI

1. User открывает Selection flyout.
2. Нажимает Replace / Add / Subtract → `selectionOpMode` sticky.
3. Cursor badge обновляется (+ / − / default).
4. Mode не создаёт маску сам по себе.

### B. Первый stroke (маска null)

1. Effective Replace или Add → создаёт маску (Add∪∅ = Replace).
2. Effective Subtract → **no-op** (discard; Idle).
3. После успешного stroke → HasMask.

### C. Refine sequence (пример)

1. Rect A (Replace) → mask A.
2. Shift+Rect B **или** sticky Add + Rect B → A∪B.
3. Alt+Ellipse C **или** sticky Subtract + Ellipse C → (A∪B)∖C.
4. Replace Rect D → только D.
5. Subtract until empty → Idle.

### D. Во время float

1. Новый selection draft **не** стартует без `commitFloat` ([`01`](./01-lifecycle-state-model.md)).
2. После commit — boolean strokes как обычно.

### E. Exit / consumers

1. Ctrl+D / click outside → deselect ([`08`](./08-select-all-deselect-exit.md)).
2. Brush/Fill при HasMask → clip writes where mask==1 (план).
3. Empty mask null → no clip (full layer).
4. Esc не меняет sticky mode и не deselect.

## Effective mode resolution

**Sticky** = `selectionOpMode` (flyout). **Effective** = mode одного stroke, latch на `pointerDown`.

```
onPointerDown (Select shape tool):
  if Alt held:
    effective = subtract          // Alt wins even with Shift (Intersect out)
  else if Shift held AND (selectionMask != null OR sticky === "add"):
    effective = add               // Shift overrides sticky Subtract → Add
  else:
    effective = sticky

  // Geometry constraint (rect/ellipse only; never lasso):
  constrainSquareOrCircle =
    Shift held
    AND sticky === "replace"
    AND selectionMask == null
    AND effective === "replace"
```

**Intersect gesture:** Photoshop Alt+Shift = Intersect ([Intersect docs](https://helpx.adobe.com/photoshop/desktop/make-selections/refine-modify-selections/select-area-intersected-by-other-selections.html)). **PRODUCT DECISION:** Alt alone or Alt+Shift → **Subtract** (Intersect out). Ctrl+Shift (Aseprite intersect) → ignore as boolean intersect.

Точные square/circle vs Add rules — [`02`](./02-rectangular-marquee.md) / [`03`](./03-elliptical-marquee.md). Этот файл — source of truth для **boolean algebra** и sticky persistence.

## Cursor / affordance

Photoshop/Aseprite показывают +/- cursor (Adobe Intersect показывает «x» на pointer — [Intersect docs](https://helpx.adobe.com/photoshop/desktop/make-selections/refine-modify-selections/select-area-intersected-by-other-selections.html)). Рекомендация v1:

- Add → cursor plus badge
- Subtract → minus badge
- Replace → default crosshair/marquee

## Right mouse subtract

Aseprite: RMB drag = subtract ([Selecting](https://aseprite.org/docs/selecting/)).  
Продукт v1: **не обязателен** (Alt достаточно). Если позже — не конфликтовать с context menu (preventDefault).

## Edge cases

| Case | Expected |
|------|----------|
| Add when mask null | Equivalent to Replace |
| Subtract when mask null | No-op (empty drag result discarded) |
| Subtract equals full mask | → null / Idle |
| New fully inside old on Add | mask unchanged (still non-null) |
| New disjoint on Add | two islands; ants both; bbox = union bounds for handles |
| Multi-island transform | One AABB around all selected bits |
| Undo | Mask changes not undoable v1; pixel edits are |
| Mid-gesture mode change | Ignored; mode latched at pointerDown |
| Intersect hotkey accidental | Ignore as intersect; Alt+Shift → Subtract |
| Sticky Subtract + Shift (no Alt) | **Effective Add** (Shift override); sticky stays Subtract; no square |
| Sticky Add + Alt | Effective Subtract for that stroke; sticky stays Add |
| Tool switch mid sticky Add | Sticky Add persists until user changes flyout or new/close document resets to Replace (**PRODUCT DECISION**, [`12`](./12-sources-and-product-decisions.md)) |
| New document / document close | Sticky resets to **Replace** |

## Paint/Fill clipping (related)

План: clip fill/paint к маске когда HasMask. Это **не** boolean tool, но consumer маски:

- Brush/Fill sample mask bit; if 0 skip write.
- Empty mask null → no clip (full layer).

## Acceptance

- [ ] Three modes only
- [ ] Modifier override documented + tested
- [ ] Empty result clears mask
- [ ] Multi-island supported
- [ ] Alt = Subtract (not Aseprite Alt+Shift)
- [ ] Intersect gestures do not produce intersect
