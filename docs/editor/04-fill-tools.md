# 04 — Flood fill (заливка)

## Цель

Инструмент заливки: клик по пикселю заливает **связную** (contiguous) область того же цвета на active layer.

## Уточнение продуктового вопроса

«Заливка должна определять границы… если замкнутое пространство — заливаем» = классический **contiguous flood fill** (не «replace all same color по всему холсту»).  
Опционально второй режим позже: *Fill all matching* (Piskel `A`).

## Алгоритм (best practice)

**Не** наивная рекурсия 4-way на 160×160 в худшем случае (глубина стека).

Рекомендация: **Scanline flood fill** (Heckbert / Lode Vandevenne):

1. Seed `(x,y)`, `target = getPixel(x,y)`  
2. Если `target` equals `fillColor` (включая alpha) → no-op  
3. Очередь сегментов; заливать горизонтальные spans; пушить spans выше/ниже  
4. Connectivity: **4-way** default (pixel art стандарт); 8-way опционально  

Источник: [Lode's Flood Fill Tutorial](https://lodev.org/cgtutor/floodfill.html).

### Сравнение цветов

```ts
function samePixel(a, b, tolerance = 0): boolean
```

Для MVP: `tolerance = 0` — точное RGBA совпадение.  
С soft brushes полупрозрачные края = **барьеры**, это ожидаемо.  
Tolerance > 0 — отдельная настройка позже.

Прозрачность: два пикселя с `a=0` считаются одинаковыми (оба «дырка»), заливка прозрачным = erase-region.

## Интеграция со слоями

- Fill только active layer  
- Locked → no-op + toast  
- Undo: один snapshot слоя **до** fill (`beginStroke`-like `commitLayerHistory`)  
- Не заливать через невидимые «дыры» других слоёв — только буфер active (visual preview можно показывать composite, hit-test — active)  

**Важный UX-choice:** клик «по тому что вижу» vs «по пикселю слоя».

| Режим | Поведение |
|-------|-----------|
| **A. Active-layer sample** (рекомендация MVP) | sample/fill только active pixels |
| B. Composite sample | sample цвет с composite, fill на active (сложнее, сюрпризы) |

Выбрать **A** для предсказуемости.

## Edge cases

| Case | Handling |
|------|----------|
| Fill entire empty layer | OK, O(W*H), snapshot once |
| Fill with same color | no-op, no undo push |
| Interrupted mid-fill | sync algorithm only — нет async cancel нужды на 160² |
| Right-click | secondary color fill |
| Selection (future) | clip fill to selection mask |

## Тест-план

1. Unit: open region, closed ring, single pixel, full canvas  
2. Unit: diagonal barrier with 4-way does **not** leak diagonally  
3. Unit: transparent seed fills all transparent contiguous  
4. Store: undo restores pre-fill  
5. Locked layer rejected  

## Acceptance

- Инструмент в тулбаре (Bucket), hotkey `G`  
- Замкнутая область заливается; диагональные щели 4-way не протекают (документировать)  
- Работает с primary/secondary  
