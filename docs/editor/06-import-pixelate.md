# 06 — Import + pixelate modal

## Цель

Drag-and-drop / paste изображения в редактор → **модалка с этапами и настройками** → вызов backend pixelate → размещение **native** сетки на canvas так, чтобы 1 pixel art cell = 1 editor cell на холсте **160×160**.

## Backend (факт из `D:/twilite-backend`)

Pipeline (`SharpPixelArtProcessor`):

1. `fitInsideMaxEdge` — вписать в `MAX_EDGE = 400`, preserve aspect, ensure alpha  
2. `gridW = floor(fittedW / pixelSize)`, `gridH = floor(fittedH / pixelSize)`  
3. Downsample to grid (`nearest`|`average` по алгоритму)  
4. Colour algorithm + `hardenAlpha` (cutoff 128 → binary alpha!)  
5. Response:

| Field | Meaning |
|-------|---------|
| `nativeWidth/Height` + `nativeBase64` | **1:1** pixel grid — это нужно редактору |
| `width/height` + `imageBase64` | Upscaled preview (fitted size), для превью в модалке |
| `pixelSize`, `paletteSize`, `algorithm` | Echo settings |

API уже на фронте: [`pixelateFromFile` / `pixelateFromUrl`](../../src/shared/api/tpg.ts).  
Permission: `tpg.pixelate.use`.

Контракт: [`tpg.contract.ts`](../../../../twilite-backend/src/shared/contracts/tpg.contract.ts) — `pixelSize` 2..100, `paletteSize` 2..64, algorithms: nearest, quantize, center, bayer, floyd-steinberg, atkinson.

### Важно: `hardenAlpha`

Backend делает alpha бинарной. Soft edges исходника **не** сохранятся как полутон — это OK для game sprites, но пользователь должен понимать в UI («жёсткая прозрачность»).

## Проблема «плотность = 160×160»

Native размер **не гарантированно 160×160**:

```
native ≈ floor(fittedEdge / pixelSize)
```

При `fitted=400`, `pixelSize=2` → ~200; `pixelSize=3` → ~133. Ровно 160 не всегда достижимо без доп. шага.

### Рекомендуемая стратегия (клиент)

1. Пользователь в модалке видит **прогноз** `≈ floor(previewW/pixelSize) × floor(previewH/pixelSize)`  
2. После ответа API берём **только `native*`**  
3. Placement modes на canvas 160×160:

| Mode | Поведение |
|------|-----------|
| `center` (default) | 1:1 blit, обрезать/паддить прозрачным |
| `fit` | nearest-neighbor scale so max edge ≤ 160, center |
| `stretch` | nearest scale to exactly 160×160 (искажает) |
| `top-left` | 1:1 from (0,0) |

**Синхронизация плотности** = режим `center`/`top-left` без scale: один native pixel → один canvas pixel. Если native > 160 — crop с UI warning; если < 160 — letterbox.

### Backend change (в скоупе)

Backend **можно менять**. Рекомендуемое расширение `GeneratePixelArtInput` / contract:

- `targetNativeMaxEdge?: number` (например 160) — подобрать downsample так, чтобы `max(nativeW, nativeH) ≤ target`
- или `targetNativeWidth` + `targetNativeHeight` с режимом `fit` | `fill`

Клиентский placement (`center`/`fit`) остаётся fallback. Идеал: native уже близок к 160×160.

## UX модалки (этапы)

```
1. Source     — preview файла, размер, MIME
2. Settings   — algorithm, pixelSize, paletteSize, live hint native≈W×H
3. Processing — spinner, cancel (AbortController)
4. Result     — preview upscaled + native size badge; placement mode; «Добавить на слой»
5. Error      — 403 / validation / network / not image
```

Drag на canvas или пустую зону редактора открывает модалку **до** вызова API (не молчаливый upload).

## Куда класть пиксели

- На **новый слой** «Import N» (если `layers < MAX_LAYERS`)  
- Или на active (checkbox)  
- Undo: layer snapshot / addLayer as doc-op  
- Палитра: merge opaque unique colors  

## Ошибки

| Case | UX |
|------|-----|
| Нет `PIXELATE_USE` | Модалка: нет прав |
| File too large | До upload — client max + server limits |
| Cancel mid-request | AbortController |
| native больше 160×160 | Warning + crop preview |
| Drop non-image | Reject early |

## Тест-план

1. Placement `center`/`fit`/`stretch` pure functions on fake buffers  
2. Mock API response → layer pixels match native region  
3. Permission gate  
4. Abort cancels without partial layer  
5. MAX_LAYERS block new import layer  

## Acceptance

- Drag image → modal → settings → pixelate → pixels on canvas 1:1 density (center)  
- Используется `nativeBase64`, не upscaled preview  
- Ошибки не роняют редактор  
