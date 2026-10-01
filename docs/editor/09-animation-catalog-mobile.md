# 09 — Animation, catalog & mobile delivery

## Продуктовый инвариант

> Артист рисует → (опционально) анимирует → отправляет на модерацию → после **publish** объект в **каталоге** и в **мобильном приложении** крутится loop, пока объект на экране.

Backend (`twilite-backend`) в скоупе. Source of truth delivery = **TPO**, не GIF.

## Канон v1 (зафиксировано)

| Тема | Решение |
|------|---------|
| Формат | `twilite.pixelobject/v1` = PNG spritesheet + JSON manifest |
| Клипы | Один `default`, `loop: true` |
| Появление на surface | Резко, **без** reveal/эффектов |
| Mobile runtime | Decode sheet once → texture; loop по `durationMs`; off-screen → unload |
| CPU raw / `pixels.bin` | **Не делаем** в v1 |
| Spawn/shader effects | **Не делаем** в v1 |

## Почему sheet+JSON, не GIF

Полный alpha (soft brushes), nearest на клиенте, простой tick-player. GIF — только optional artist download.

## Manifest (сокращённо)

```json
{
  "format": "twilite.pixelobject/v1",
  "canvas": { "width": 160, "height": 160 },
  "sheet": { "mediaId": "...", "frameWidth": 160, "frameHeight": 160, "columns": 4, "rows": 2, "frameCount": 8 },
  "animations": [{
    "id": "default",
    "loop": true,
    "frames": [
      { "frame": 0, "durationMs": 100 },
      { "frame": 1, "durationMs": 100 }
    ]
  }],
  "staticPreviewFrame": 0
}
```

Правила: кадры = composite слоёв; static = 1 frame; unknown major format → mobile reject.

## Mobile lifecycle

```
onScreen  → fetch DTO → download sheet → decode once → loop default
offScreen → stop ticker → release texture / decoded data
```

## Editor frames (после layers)

- `MAX_FRAMES = 64`, per-frame `durationMs`
- Snapshot слоёв на кадр (MVP)
- Timeline: CRUD, play preview, onion skin
- Paint: `activeFrame × activeLayer`

## Backend: `tpg-pixel-objects`

Permissions: `tpg.pixelObjects.create|submit|moderate|readPublished|*`  
API: submit / mine / moderation / publish / reject / catalog / `:id/mobile`  
Хранение sheet через existing media (R2). Validation: geometry sheet↔manifest, limits.

`surface_objects` ≠ каталог; placement через `metadata.pixelObjectId` — follow-up.

## Acceptance

- Editor: кадры + preview loop  
- Publish TPO → catalog + mobile DTO  
- Mobile: infinite loop while visible, unload off-screen  
- Reject + comment автору  
