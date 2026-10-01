# Editor roadmap — index

Документы в этой папке — **исследовательские планы**, не код. Реализация идёт по спринтам из [`08-sprints.md`](./08-sprints.md). Один MD = один домен, чтобы не смешивать контекст.

**Скоуп:** web editor (`twilite-pg`) **и** backend (`twilite-backend`) — оба можно менять. Delivery в мобильное приложение — часть продуктового контракта.

## Канонические решения (зафиксировано с продуктом)

| Тема | Решение |
|------|---------|
| Размер холста | **160×160** (`CANVAS_WIDTH` / `CANVAS_HEIGHT`) |
| Кисти | Гибрид: дискретные формы + Softness → **полупрозрачные** пиксели |
| Кастомные кисти | Пока **mock** «добавить 16×16 PNG» |
| Слои | Макс. **16** (`MAX_LAYERS`), undo **per layer**, blend modes в первой серьёзной волне |
| Zoom | Только **целый** scale, zoom **к курсору**, pixel grid при крупном zoom |
| Заливка | Contiguous flood fill (замкнутая область от seed) |
| Палитра | Из **использованных** цветов + цвета из color picker |
| Анимация | Кадры в редакторе; TPO sheet+JSON; mobile: **один loop `default`**, unload off-screen; **без** spawn-эффектов / raw pixels.bin |
| Импорт | Drag → модалка → pixelate (backend можно допилить под target 160) → canvas |
| Экспорт / модерация | 3-й таб; submit TPO → moderate → **publish в каталог объектов** → mobile DTO |
| Качество | Тесты, error handling, review — не «быстрый MVP-хак» |

## Порядок чтения

1. [`08-sprints.md`](./08-sprints.md) — что делать когда  
2. [`01-document-layers.md`](./01-document-layers.md) — фундамент  
3. [`03-viewport-zoom-grid.md`](./03-viewport-zoom-grid.md)  
4. [`02-brushes-softness.md`](./02-brushes-softness.md)  
5. [`04-fill-tools.md`](./04-fill-tools.md)  
6. [`05-palette.md`](./05-palette.md)  
7. [`06-import-pixelate.md`](./06-import-pixelate.md)  
8. [`09-animation-catalog-mobile.md`](./09-animation-catalog-mobile.md) — анимация + каталог + mobile  
9. [`07-export-moderation.md`](./07-export-moderation.md) — таб Экспорт + связь с publish  
10. [`selection/00-INDEX.md`](./selection/00-INDEX.md) — **Selection & Transform** (rect/ellipse/lasso, boolean, float, clipboard; спека **approved** — [`selection/13-review-consensus.md`](./selection/13-review-consensus.md)) 

## Текущее состояние кода (baseline)

- UI-шелл `/new-project`, инструменты в Zustand, canvas buffer **один слой**, hard square stamp  
- Softness в UI **не влияет** на paint  
- Layers UI = mock; timeline = stub  
- Pixelate API есть; **модуля pixel-objects / модерации артов нет**  
- `surface_objects` = объекты на карте мира (Fire/Cloud), не каталог пиксель-арта — связь через metadata later  
- Media uploads (presigned R2) уже есть — переиспользовать для sheet PNG  

## Принципы качества (на каждый блок)

- Unit-тесты на чистые алгоритмы (stamp, flood fill, composite, zoom math, palette, sheet pack)  
- Store / API tests на инварианты и RBAC  
- Явные error states в UI  
- Export/publish всегда из **composited frames**, не из CSS-scaled view  
- Mobile получает версионированный `format` и умеет отказать неизвестному major  
