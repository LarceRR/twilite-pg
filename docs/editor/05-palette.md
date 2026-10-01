# 05 — Working palette (used colors)

## Цель

Палитра как **быстрый доступ** к цветам проекта: всё, что юзер выбрал в color picker или реально положил на холст.

## Продуктовое поведение

1. Пикер меняет только активный цвет и **не** пишет палитру на каждый промежуточный оттенок  
2. Цвет появляется после успешного штриха или заливки. Новый свотч — если хотя бы один канал отличается от всех существующих больше чем на 16; иначе обновляется ближайший свотч  
3. Клик по swatch палитры → primary (LMB) / secondary (RMB)  
4. Не indexed-lock: рисовать любым цветом можно всегда; палитра не ограничивает  

## Модель

```ts
type PaletteColor = {
  hex: string;        // canonical #rrggbb (или #rrggbbaa если храним alpha)
  lastUsedAt: number;
  source: 'picker' | 'canvas' | 'import';
};

type PaletteState = {
  colors: PaletteColor[];
  maxColors: number; // e.g. 64
};
```

Canonicalize: lowercase `#rrggbb`. Для semi-transparent brush stamps — решать: палитра хранит **base RGB** кисти (primary), не каждый получившийся blended rgba.

## Дедуп и лимиты

- Dedup по hex  
- LRU eviction при `maxColors` (или FIFO)  
- Import pixelate: после размещения native — просканировать уникальные opaque цвета (cap scan) и merge в палитру с `source:'import'`  

## UI

- Горизонтальная лента / grid под tool settings или в Palette tool panel  
- Empty state: «Нарисуйте цветом»  
- Clear palette (с confirm)  
- Не путать с вкладкой «Эффекты»  

## Edge cases

| Case | Handling |
|------|----------|
| Soft brush создаёт сотни полутонов | В палитру только primary/secondary, не каждый alpha variant |
| Eraser | не добавляет цвет |
| Undo remove last pixel of color | цвет **остаётся** в палитре (проще UX) |
| Transparent | не в палитре как swatch |

## Тест-план

1. addColor dedup  
2. maxColors eviction order  
3. near shade stays on existing swatch; LMB/RMB assign  
4. import merge unique colors ≤ cap  

## Acceptance

- Цвет попадает в быстрый доступ после использования на холсте, без мусора от пикера  
- Палитра переживает смену инструментов  
- Не взрывается от soft alpha variants  
