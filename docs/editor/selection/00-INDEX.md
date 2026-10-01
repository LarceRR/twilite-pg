# Selection tools — documentation index

Документы в этой папке — **спецификация поведения** для runtime выделения (и связанных операций). Реализация кода идёт **после** стабилизации этих MD.

Ориентиры платформ (только проверенные источники, см. [`12-sources-and-product-decisions.md`](./12-sources-and-product-decisions.md)):

- **Aseprite** — mask + ADD/SUBTRACT/INTERSECT (офиц. Alt+Shift = subtract), floating transform, cel-scoped edits
- **Adobe Photoshop** — marquee/lasso modifiers (Alt = subtract), Free Transform commit/cancel, clipboard

Продуктовый scope v1 зафиксирован в плане `selection_transform_feature` и продублирован в [`12`](./12-sources-and-product-decisions.md): Subtract = **Alt**; Delete clears mask; Esc ≠ deselect; Intersect/wand runtime/system clipboard out.

**Статус:** спецификация **approved for implementation** — см. [`13-review-consensus.md`](./13-review-consensus.md).

Термины (`selectionMask`, `selectionDraft`, `floatSession`, `selectionOpMode`, sticky vs effective) — [`01-lifecycle-state-model.md`](./01-lifecycle-state-model.md). Сводная матрица edge cases — [`11-edge-cases-matrix.md`](./11-edge-cases-matrix.md).

## Порядок чтения

1. [`01-lifecycle-state-model.md`](./01-lifecycle-state-model.md) — состояния, маска, float, clipboard
2. [`02-rectangular-marquee.md`](./02-rectangular-marquee.md)
3. [`03-elliptical-marquee.md`](./03-elliptical-marquee.md)
4. [`04-lasso.md`](./04-lasso.md)
5. [`05-boolean-modes.md`](./05-boolean-modes.md) — Replace / Add / Subtract
6. [`06-floating-transform.md`](./06-floating-transform.md) — move / scale / rotate
7. [`07-clipboard-cut-copy-paste-delete.md`](./07-clipboard-cut-copy-paste-delete.md)
8. [`08-select-all-deselect-exit.md`](./08-select-all-deselect-exit.md)
9. [`09-magic-wand-deferred.md`](./09-magic-wand-deferred.md) — UI prefs есть, runtime later
10. [`10-overlay-hit-testing.md`](./10-overlay-hit-testing.md)
11. [`11-edge-cases-matrix.md`](./11-edge-cases-matrix.md)
12. [`12-sources-and-product-decisions.md`](./12-sources-and-product-decisions.md)
13. [`13-review-consensus.md`](./13-review-consensus.md) — locked decisions + implementation gate

## Карта инструментов UI → документы

| UI (`SELECTION_TOOLS`) | Label | Runtime v1 | Doc |
|------------------------|-------|------------|-----|
| `rect` | Прямоугольник | Да | [`02`](./02-rectangular-marquee.md) |
| `ellipse` | Круг | Да | [`03`](./03-elliptical-marquee.md) |
| `lasso` | Лассо | Да | [`04`](./04-lasso.md) |
| `wand` | Палочка | Нет (prefs only) | [`09`](./09-magic-wand-deferred.md) |

Связанные операции (не отдельные кнопки тулбара, но обязательны):

| Операция | Doc |
|----------|-----|
| Boolean modes + sticky flyout | [`05`](./05-boolean-modes.md) |
| Free transform / float session | [`06`](./06-floating-transform.md) |
| Copy / Cut / Paste / Delete | [`07`](./07-clipboard-cut-copy-paste-delete.md) |
| Select All / Deselect / Escape / Enter / tool exit | [`08`](./08-select-all-deselect-exit.md) |

## Связь с общим editor index

Корневой [`../00-INDEX.md`](../00-INDEX.md) должен ссылать на эту папку как на домен Selection & Transform.
