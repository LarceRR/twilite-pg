# 07 — Export tab & moderation

## Цель

Третий таб `editor-right-tools-sidebar` → **Экспорт**: локальные выгрузки + **отправка на модерацию** пакета, который после publish попадает в каталог и мобилку.

Канон delivery: **`twilite.pixelobject/v1`** — см. [`09-animation-catalog-mobile.md`](./09-animation-catalog-mobile.md).  
GIF/APNG — optional artist download, **не** source of truth.  
Mobile v1: один `default` loop while on-screen, unload off-screen; без spawn-эффектов.

Backend **в скоупе**: новый модуль `tpg-pixel-objects`, permissions, media kinds, validation.

## Текущее состояние UI

[`EditorRightToolsSidebar`](../../src/pages/new-project/ui/components/EditorRightToolsSidebar/EditorRightToolsSidebar.tsx):

1. Слои  
2. Эффекты  
3. «Слои» duplicate (`layers2`) — **заменить на Экспорт**

Клиентский PNG 1× уже есть (`exportPngBlob`). TPO / moderation API — **нет**.

## Паттерн модерации

Взять поток с `app-themes` (submit → pending → publish/reject+comment → resubmit), но **отдельный** модуль и RBAC (`tpg.pixelObjects.*`), не смешивать с themes.

Детали API, mobile DTO, validation sheet↔manifest — в [`09`](./09-animation-catalog-mobile.md).

## Export tab — содержимое

### A. Локальный download (артист)

| Action | Notes |
|--------|-------|
| PNG текущего кадра 1× / N× | nearest, transparent/flat bg |
| PNG spritesheet | все кадры |
| TPO zip (`manifest.json` + `sheet.png`) | полный пакет |
| GIF/APNG (optional) | warning про alpha/палитру; не для mobile catalog |

### B. Отправка на модерацию

1. Собрать composites всех frames → pack sheet  
2. Upload sheet через existing media presign flow  
3. `POST /v1/tpg/pixel-objects` с manifest  
4. Статус `pending`; UI показывает очередь «мои отправки»  
5. Reject → comment виден; Resubmit  

Обязательные checks до submit:

- есть ≥1 непрозрачный пиксель  
- frames ≤ `MAX_FRAMES`  
- title non-empty  
- permission `tpg.pixelObjects.submit` / create  

### C. После publish

- Объект в web-каталоге (`/my-objects` / discover)  
- Mobile `GET .../mobile` отдаёт sheetUrl + animations  
- Surface placement (`pixelObjectId` в metadata) — follow-up, не блокер каталога  

## Backend changes (краткий checklist)

- [ ] `permissionCatalog` + seed groups  
- [ ] table `pixel_objects` + migrations  
- [ ] media kind или convention для sheet  
- [ ] controllers + zod contracts  
- [ ] Sharp validation sheet geometry  
- [ ] moderation list + publish/reject  
- [ ] published catalog + mobile DTO  
- [ ] limits in `limits.ts` (max frames, max sheet bytes)  

## Edge cases

| Case | Handling |
|------|----------|
| Submit 1 frame (static) | Valid TPO; mobile plays single frame |
| Submit mid-stroke | endStroke / flush all frames |
| Soft pixels → optional GIF download | Warning only |
| Sheet too large | Client + server reject |
| 403 | Clear UI |
| Double submit | Disable button; idempotency key optional |
| Edit published | New revision → pending again |

## Тест-план

1. Tab UI: Export replaces layers2  
2. PNG N× nearest fixture  
3. Pack→manifest consistency unit tests  
4. Submit happy path (mock media + API)  
5. Backend validation rejects bad sheet  
6. Publish → mobile DTO shape contract test  

## Acceptance

- Таб «Экспорт» работает  
- Можно скачать PNG и TPO локально  
- Submit → moderate → publish делает объект доступным для мобилки с анимацией (или static)  
