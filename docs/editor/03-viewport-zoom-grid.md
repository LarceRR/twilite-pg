# 03 — Viewport: integer zoom, pan, pixel grid

## Цель

Целочисленный зум **к курсору**, pan, сетка пикселей при достаточном увеличении. Сетка не должна «плыть» и размываться.

## Текущее состояние

- CSS scale stage через `min(100cqw, 100cqh, 720px)` — fit в viewport  
- Bitmap 160×160 + `image-rendering: pixelated`  
- Нет zoom/pan state  

## Рекомендуемая модель viewport

```ts
type Viewport = {
  zoom: number;      // integer 1..32 (или 1..64)
  panX: number;      // CSS px offset of canvas top-left in viewport
  panY: number;
  showGrid: boolean; // auto or manual
};
```

**Не** умножать bitmap на `devicePixelRatio` для document pixels — иначе export/zoom math разъедется. DPR только для *overlay* grid линий при желании сверхчёткости (опционально).

## Zoom to cursor (integer)

Канонический алгоритм (избегает ломаного `transform-origin`):

```
// mouse in viewport coords
const worldX = (mouseX - panX) / zoom;
const worldY = (mouseY - panY) / zoom;

const nextZoom = clamp(zoom + delta, MIN_ZOOM, MAX_ZOOM); // delta = ±1

panX = mouseX - worldX * nextZoom;
panY = mouseY - worldY * nextZoom;
zoom = nextZoom;
```

Источники: [SO — zoom into point like Aseprite](https://stackoverflow.com/questions/78408025/applying-zoom-into-point-like-aseprite), [MDN crisp pixel art](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look).

### Правила crispness

1. `zoom` только integer  
2. `panX/panY` желательно **округлять до integer CSS px** после zoom (или до `zoom` multiple), иначе субпиксельный drift  
3. Canvas CSS size = `160 * zoom` px (не fractional)  
4. `image-rendering: pixelated` (+ `crisp-edges` fallback)  
5. Не использовать `ctx.scale(nonInteger)` для document buffer  

## Pixel grid overlay

Показывать когда `zoom >= GRID_MIN_ZOOM` (рекомендация: **8** или **6**).

Реализация (лучшая практика):

- Отдельный overlay `<canvas>` или SVG поверх bitmap  
- Линии по границам логических пикселей: каждые `zoom` CSS-пикселей  
- Рисовать в coords `0.5` offset чтобы 1px линии не размывались  
- Цвет: полупрозрачный, theme-aware; не писать в document buffer  

```
for x in 0..width:
  line at x * zoom + 0.5
```

При pan — overlay трансформируется **тем же** `translate(pan)`; либо grid рисуется в screen space из pan/zoom (один source of truth).

| Проблема | Решение |
|----------|---------|
| Grid blurry | integer zoom + line at `.5`; не scale bitmap для grid |
| Grid «съезжает» с пикселями | считать от pan%zoom remainder: `offset = panX % zoom` |
| Слишком плотная сетка на zoom=2 | порог `GRID_MIN_ZOOM` |
| Performance | один stroke path / batch lines; skip если zoom < threshold |

## Pan

- Space+drag или Move tool  
- Middle mouse drag  
- Clamp pan так, чтобы холст не улетал полностью (оставить ≥64px видимыми)  

## Input mapping (критично)

Pointer → document pixel:

```
x = floor((clientX - rect.left - panX) / zoom)
y = floor((clientY - rect.top - panY) / zoom)
```

Либо если canvas element сам имеет CSS size `160*zoom` и pan на wrapper:

```
x = floor((clientX - canvasRect.left) * (CANVAS_WIDTH / canvasRect.width))
```

Один путь — не смешивать.

Сохранить: `setPointerCapture`, `getCoalescedEvents`, `touch-action: none`, `preventDefault` на wheel при zoom.

## Hotkeys

- `=` / `+` zoom in (к центру viewport или last cursor)  
- `-` zoom out  
- `0` / `Mod+0` reset zoom=fit или zoom=1 + center  
- Wheel + Ctrl/Mod → zoom to cursor (стандарт web)  
- Wheel alone → pan vertical (optional) / или zoom (как Aseprite — решить в UI)  

**Рекомендация продукта:** wheel = zoom to cursor (pixel art editors), Shift+wheel = pan.

## Тест-план

1. Pure function `zoomAtPoint(state, mouse, nextZoom)` — world point under cursor invariant (±0.5px)  
2. Integer-only transitions 1→2→3…  
3. Grid line positions match `i * zoom + panOffset`  
4. Pointer mapping round-trip: paint cell under cursor  
5. Clamp pan bounds  

## Acceptance

- Зум целый, к курсору, без мыла  
- Сетка появляется на крупном zoom и совпадает с пикселями  
- Рисование остаётся точным на любом zoom  
