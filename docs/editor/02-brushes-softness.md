# 02 — Brush shapes & Softness

## Цель

Кисть и ластик: набор **форм** + **Softness** (полупрозрачный falloff). Mock-кнопка «добавить кастомную 16×16 PNG».

## Текущее состояние

- `stampBrush` — только квадрат, hard opaque  
- Softness / Hardness в tool properties **игнорируются** paint-ом  

## Первые формы (built-in)

| Id | Название | Маска (дискретная сетка) |
|----|----------|---------------------------|
| `square` | Квадрат | Chebyshev: `max(|dx|,|dy|) <= r` |
| `circle` | Круг | Euclidean: `dx²+dy² <= r²` |
| `diamond` | Ромб | Manhattan: `|dx|+|dy| <= r` |

`size` = диаметр в пикселях (1…20+). Центр штампа — cursor cell; для чётного size смещение как сейчас (`half = floor((size-1)/2)`).

Кастом: UI-кнопка **«+ Brush»** (disabled / toast «Скоро») — слот под будущий upload 16×16 grayscale/PNG mask.

## Shapes tool

Геометрические фигуры — отдельный инструмент `Shapes`, не stamp кисти. Первая
фигура — `line`: первый клик задаёт начало, движение мыши показывает preview,
второй клик фиксирует; Shift привязывает направление к шагу 45°.

## Softness → полупрозрачность (гибрид)

Softness `S ∈ [0..100]`. Hardness-эквивалент: `H = 1 - S/100`.

Для каждого пикселя штампа вычислить нормализованную дистанцию `t ∈ [0..1]` **в метрике формы** (не всегда Euclidean!):

- square: `t = max(|dx|,|dy|) / r`  
- circle: `t = sqrt(dx²+dy²) / r`  
- diamond: `t = (|dx|+|dy|) / r`  

Alpha штампа:

```
if t > 1: skip
if H >= 1 or S == 0: a = 255
else:
  hardRadius = H          // доля радиуса с полной непрозрачностью
  if t <= hardRadius: a = 255
  else:
    u = (t - hardRadius) / (1 - hardRadius)  // 0..1
    a = round(255 * (1 - u)^2)               // quadratic falloff
```

Затем **source-over** на слой (не replace), иначе soft brush «выжигает» дыры:

```
outA = srcA + dstA * (1 - srcA)
outC = (srcC*srcA + dstC*dstA*(1-srcA)) / outA   // straight alpha
```

Eraser soft: уменьшать alpha dst пропорционально stamp alpha (`dstA' = dstA * (1 - stampA)`), RGB обнулять при a=0.

Источники: [ComfyUI brush hardness](https://github.com/Comfy-Org/ComfyUI_frontend/blob/8854fbde/src/composables/maskeditor/brushDrawingUtils.ts), [Brush stamp tutorial](https://shenciao.github.io/brush-rendering-tutorial/Basics/Stamp/).

## Критичные edge cases

| Проблема | Решение |
|----------|---------|
| Soft square становится кругом (типичный баг PS-клонов) | Falloff в **метрике формы**, не radial gradient для square |
| Spacing: soft stamps накладываются → грязь | Spacing ≈ 25–50% radius; или max-alpha accumulation в пределах одного stroke (stroke mask) |
| Один stroke + много overlapping stamps | **Stroke opacity buffer**: накапливать coverage в temp mask, влить в слой один раз на `endStroke` (лучшее качество) |
| Size=1 + Softness>0 | Softness игнор или минимальный 1px opaque |
| Performance 160² | Precompute stamp LUT `[shape][size][softness]` → `Uint8Array` alpha mask; invalidate cache при смене params |
| Premultiplied vs straight | Слой = straight; composite = premult |

## Рекомендуемая архитектура paint

```
beginStroke → clone layer pixels to undo; create coverageMask(zeros)
pointer samples → Bresenham + coalesced → for each cell stamp into coverageMask (max alpha)
endStroke → composite coverageMask×color onto layer via src-over; discard mask
```

Это чинит «грязный» soft brush и упрощает undo (один snapshot).

## UI

- Shape picker: square/circle/diamond для Brush/Eraser; line в инструменте Shapes  
- Softness slider уже есть — **подключить**  
- Eraser: переименовать Hardness/Softness → Softness (единообразие)  
- Mock: кнопка `+` «Custom 16×16» → disabled + tooltip  

## Тест-план

1. Mask generation: square/circle/diamond size 1,3,5 — snapshot alpha grids  
2. Softness 0 → binary mask; Softness 100 → center opaque, edge near 0  
3. Soft square corners remain square (not circular)  
4. Stroke coverage uses `max`, not additive overflow past 255  
5. Eraser soft reduces alpha without color fringing  
6. Spacing / Bresenham still gap-free  

## Acceptance

- Можно выбрать форму и видеть разный stamp  
- Shapes → Line рисуется от точки до точки с preview и Shift-snap  
- Softness даёт полупрозрачные края  
- Eraser зеркалит форму/softness  
- Custom brush кнопка видна, не ломает UX  
