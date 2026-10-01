# 08 — Sprints

Разбиение работ. Backend (`twilite-backend`) и frontend (`twilite-pg`) в одном roadmap.  
Каждый спринт = shippable вертикальный кусок + тесты.

Зависимости:

```
S1 Document/Layers ──► S2 Viewport ──► S3 Brushes
         │                  │
         ├──────────────────┼──► S4 Fill + Palette
         │                  │
         ├──────────────────┴──► S5 Import (+ optional backend targetNative)
         │
         └──► S6 Frames / Timeline (animation editor)
                    │
                    ├──► S7 Export tab + TPO pack (local)
                    │
                    └──► S8 Pixel-objects API + moderation + catalog + mobile DTO
```

---

## Sprint 1 — Document & Layers (P0)

**Docs:** [`01-document-layers.md`](./01-document-layers.md)

- `MAX_LAYERS = 16`, per-layer undo/redo  
- Real layers UI, composite, blend modes, opacity  
- Guards: lock, last layer, limit  

**Exit:** рисование на слоях, undo per active layer.

---

## Sprint 2 — Viewport zoom/pan/grid (P0)

**Docs:** [`03-viewport-zoom-grid.md`](./03-viewport-zoom-grid.md)

- Integer zoom to cursor, pan, pixel grid  

**Exit:** точное рисование на любом zoom.

---

## Sprint 3 — Brush shapes & Softness (P0/P1)

**Docs:** [`02-brushes-softness.md`](./02-brushes-softness.md)

- Forms + Softness semi-transparent + mock custom brush  

**Exit:** soft circle/square корректны.

---

## Sprint 4 — Fill + Palette (P1)

**Docs:** [`04-fill-tools.md`](./04-fill-tools.md), [`05-palette.md`](./05-palette.md)

- Bucket + working palette (+ eyedropper ideally)  

**Exit:** быстрый цвет/заливка workflow.

---

## Sprint 5 — Import pixelate modal (P1)

**Docs:** [`06-import-pixelate.md`](./06-import-pixelate.md)

- Modal + `pixelateFromFile` + native placement on 160×160  
- **Backend (optional in same sprint):** `targetNativeMaxEdge` / target size чтобы native ближе к 160  

**Exit:** импорт без рассинхрона плотности.

---

## Sprint 6 — Frames / Timeline (P0 для продукта с анимацией)

**Docs:** [`09-animation-catalog-mobile.md`](./09-animation-catalog-mobile.md)

- Frame CRUD, duration, play/pause preview  
- Onion skin (min)  
- Constants `MAX_FRAMES`  
- Paint targets activeFrame × activeLayer  

**Exit:** можно сделать короткую анимацию и крутить preview в редакторе.

---

## Sprint 7 — Export tab + TPO local pack (P1)

**Docs:** [`07-export-moderation.md`](./07-export-moderation.md), [`09`](./09-animation-catalog-mobile.md)

- 3-й таб → Экспорт  
- PNG frame / sheet / TPO zip download  
- Optional GIF/APNG as derivative only  

**Exit:** артист выгружает валидный TPO локально.

---

## Sprint 8 — Backend catalog + moderation + mobile (P0 продукта)

**Docs:** [`09-animation-catalog-mobile.md`](./09-animation-catalog-mobile.md), [`07`](./07-export-moderation.md)

- Module `tpg-pixel-objects`, RBAC, DB, media upload  
- Submit / mine / moderation / publish / reject  
- Catalog endpoints + **mobile DTO**  
- Editor: «Отправить на модерацию»  
- Moderator UI (web) play-from-sheet preview  
- Contract tests manifest↔sheet  

**Exit:** publish → объект в каталоге → мобилка получает URL sheet + frames и играет анимацию.

---

## Follow-ups (не блокируют mobile catalog)

- Surface placement: `kind: PixelArt` + `metadata.pixelObjectId`  
- Cel/shared-layer memory optimization  
- Custom brushes 16×16 real  
- Indexed palette lock mode  

---

## Quality bar (каждый спринт)

- [ ] Unit tests на алгоритмы домена  
- [ ] Store / API tests на инварианты  
- [ ] Ручной checklist edge cases из MD  
- [ ] Нет необработанных throw в UI-пути  
- [ ] Для S8: mobile fixture TPO проигрывается  

## Что не смешивать в одном спринте

- Layers + Frames (S1 vs S6) — frames после стабильного composite  
- Soft brushes + Import modal  
- Moderation API + Brush shapes  
