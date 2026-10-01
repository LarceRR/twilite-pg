import {
  ALGORITHM_HINTS,
  ALGORITHM_LABELS,
  ALGORITHM_USES_PALETTE,
  PIXEL_ART_ALGORITHMS,
  PIXELATE_MAX_PALETTE_SIZE,
  PIXELATE_MAX_PIXEL_SIZE,
  PIXELATE_MIN_PALETTE_SIZE,
  PIXELATE_MIN_PIXEL_SIZE,
  type PixelArtAlgorithm,
} from "@/shared/api/tpg";
import type { PixelateSourceMode } from "./usePixelateImportPipeline";

export function ImportPixelateSettingsFields({
  sourceMode,
  pixelSize,
  paletteSize,
  algorithm,
  estimate,
  sourceWidth,
  sourceHeight,
  onSourceMode,
  onPixelSize,
  onPaletteSize,
  onAlgorithm,
}: {
  sourceMode: PixelateSourceMode;
  pixelSize: number;
  paletteSize: number;
  algorithm: PixelArtAlgorithm;
  estimate: { width: number; height: number };
  sourceWidth: number;
  sourceHeight: number;
  onSourceMode: (value: PixelateSourceMode) => void;
  onPixelSize: (value: number) => void;
  onPaletteSize: (value: number) => void;
  onAlgorithm: (value: PixelArtAlgorithm) => void;
}) {
  const paletteEnabled = ALGORITHM_USES_PALETTE[algorithm];

  return (
    <div className="import-pixelate__settings">
      <fieldset className="import-pixelate__source-modes">
        <legend>Исходник</legend>
        <label className="import-pixelate__algorithm">
          <input
            type="radio"
            name="pixelate-source-mode"
            checked={sourceMode === "pixelate"}
            onChange={() => onSourceMode("pixelate")}
          />
          <strong>Пикселизировать</strong>
          <small>Фото или картинка схлопывается в сетку. Справа видно, насколько грубыми станут блоки.</small>
        </label>
        <label className="import-pixelate__algorithm">
          <input
            type="radio"
            name="pixelate-source-mode"
            checked={sourceMode === "original"}
            onChange={() => onSourceMode("original")}
          />
          <strong>Уже пиксель-арт</strong>
          <small>
            Файл не пикселизируется. Если он собран из одинаковых клеток, холст станет сеткой этих клеток
            ({sourceWidth}×{sourceHeight} до поиска шага).
          </small>
        </label>
      </fieldset>

      {sourceMode === "original" ? (
        <p className="import-pixelate__hint">
          Пикселизация, палитра и алгоритмы не применяются. Одинаковые клетки схлопываются в один пиксель холста.
        </p>
      ) : (
        <>
          <fieldset className="import-pixelate__algorithms">
            <legend>Алгоритм</legend>
            {PIXEL_ART_ALGORITHMS.map((id) => (
              <label key={id} className="import-pixelate__algorithm">
                <input
                  type="radio"
                  name="pixelate-algorithm"
                  value={id}
                  checked={algorithm === id}
                  onChange={() => onAlgorithm(id)}
                />
                <strong>{ALGORITHM_LABELS[id]}</strong>
                <small>{ALGORITHM_HINTS[id]}</small>
              </label>
            ))}
          </fieldset>

          <label className="import-pixelate__field">
            <span>Крупность блока: {pixelSize}</span>
            <input
              type="range"
              min={PIXELATE_MIN_PIXEL_SIZE}
              max={PIXELATE_MAX_PIXEL_SIZE}
              value={pixelSize}
              aria-label="Размер пикселя"
              onChange={(event) =>
                onPixelSize(
                  clampInteger(Number(event.target.value), PIXELATE_MIN_PIXEL_SIZE, PIXELATE_MAX_PIXEL_SIZE),
                )
              }
            />
            <small>
              Сколько пикселей исходника схлопывается в один. Больше значение — крупнее блоки и меньше клеток.
              Прогноз сетки ≈ {estimate.width}×{estimate.height}. Размер картинки в превью от этого не растёт.
            </small>
          </label>

          <label className={`import-pixelate__field${paletteEnabled ? "" : " is-disabled"}`}>
            <span>Цветов в палитре: {paletteEnabled ? paletteSize : "все"}</span>
            <input
              type="range"
              min={PIXELATE_MIN_PALETTE_SIZE}
              max={PIXELATE_MAX_PALETTE_SIZE}
              value={paletteSize}
              aria-label="Размер палитры"
              disabled={!paletteEnabled}
              onChange={(event) =>
                onPaletteSize(
                  clampInteger(
                    Number(event.target.value),
                    PIXELATE_MIN_PALETTE_SIZE,
                    PIXELATE_MAX_PALETTE_SIZE,
                  ),
                )
              }
            />
            <small>
              {paletteEnabled
                ? "Меньше цветов — площе и контрастнее. Больше — ближе к исходнику."
                : "Nearest оставляет цвета как есть и палитру не режет."}
            </small>
          </label>
        </>
      )}
    </div>
  );
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}
