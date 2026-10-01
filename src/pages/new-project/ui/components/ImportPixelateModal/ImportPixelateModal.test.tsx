import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TPG_PERMISSIONS } from "@/shared/lib/rbac";
import {
  MAX_LAYERS,
  __resetEditorCanvasStoreForTests,
  useEditorCanvasStore,
} from "@/shared/store/editorCanvas";
import { createLayer, resetLayerIdSequence } from "@/shared/store/editorCanvas/model/layerFactory";
import { __resetEditorPaletteStoreForTests } from "@/shared/store/editorPalette";
import { useSessionStore } from "@/shared/store/session";
import type { PixelateResult } from "@/shared/api/tpg";
import { pixelateFromFile } from "@/shared/api/tpg";
import { decodeNativePng } from "./decodeNativePng";
import { loadImagePreview } from "./importFile";
import { ImportPixelateModal } from "./ImportPixelateModal";
import { PIXELATE_PREVIEW_DEBOUNCE_MS } from "./usePixelateImportPipeline";

vi.mock("@/shared/api/tpg", async () => {
  const actual = await vi.importActual<typeof import("@/shared/api/tpg")>("@/shared/api/tpg");
  return { ...actual, pixelateFromFile: vi.fn() };
});

vi.mock("./importFile", async () => {
  const actual = await vi.importActual<typeof import("./importFile")>("./importFile");
  return { ...actual, loadImagePreview: vi.fn() };
});

vi.mock("./decodeNativePng", () => ({
  decodeNativePng: vi.fn(),
}));

const preview = {
  url: "blob:preview",
  width: 800,
  height: 600,
  mimeType: "image/png",
  name: "cat.png",
  size: 2048,
};

const pixelateResult: PixelateResult = {
  mimeType: "image/png",
  width: 400,
  height: 300,
  imageBase64: "preview-b64",
  nativeWidth: 2,
  nativeHeight: 2,
  nativeBase64: "native-b64",
  pixelSize: 8,
  paletteSize: 24,
  algorithm: "quantize",
};

function grantPixelate(): void {
  useSessionStore.getState().setUser({
    id: "user",
    email: "a@b.c",
    displayName: "Maku",
    avatarUrl: null,
    permissions: [TPG_PERMISSIONS.PIXELATE_USE],
  });
}

function pngFile(): File {
  return new File(["x"], "cat.png", { type: "image/png" });
}

async function goToSettingsWithPreview(): Promise<void> {
  fireEvent.click(await screen.findByRole("button", { name: "Далее" }));
  expect(screen.getByText(/Прогноз сетки ≈ 50×37/)).toBeInTheDocument();
  await vi.advanceTimersByTimeAsync(PIXELATE_PREVIEW_DEBOUNCE_MS);
  await waitFor(() => {
    expect(pixelateFromFile).toHaveBeenCalled();
  });
  await waitFor(() => {
    expect(screen.getByText(/Native \d+×\d+/)).toBeInTheDocument();
  });
}

describe("ImportPixelateModal", () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
    resetLayerIdSequence(1);
    __resetEditorCanvasStoreForTests();
    __resetEditorPaletteStoreForTests();
    useSessionStore.getState().clear();
    vi.mocked(loadImagePreview).mockReset();
    vi.mocked(loadImagePreview).mockResolvedValue(preview);
    vi.mocked(pixelateFromFile).mockReset();
    vi.mocked(decodeNativePng).mockReset();
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    cleanup();
    useSessionStore.getState().clear();
    vi.useRealTimers();
  });

  it("shows a permission error and does not call pixelate", async () => {
    render(<ImportPixelateModal request={{ kind: "file", file: pngFile() }} onClose={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Недостаточно прав для пикселизации");
    expect(screen.queryByRole("button", { name: "Добавить на слой" })).not.toBeInTheDocument();
    expect(pixelateFromFile).not.toHaveBeenCalled();
  });

  it("rejects a non-image before any request", () => {
    render(
      <ImportPixelateModal
        request={{ kind: "rejected", reason: "Поддерживаются PNG, JPEG, WebP и GIF" }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Поддерживаются PNG, JPEG, WebP и GIF");
    expect(pixelateFromFile).not.toHaveBeenCalled();
    expect(loadImagePreview).not.toHaveBeenCalled();
  });

  it("places decoded native pixels on a new layer after live preview", async () => {
    grantPixelate();
    const native = new Uint8ClampedArray(2 * 2 * 4);
    native[0] = 9;
    native[3] = 255;
    vi.mocked(pixelateFromFile).mockResolvedValue(pixelateResult);
    vi.mocked(decodeNativePng).mockResolvedValue(native);
    const onClose = vi.fn();

    render(<ImportPixelateModal request={{ kind: "file", file: pngFile() }} onClose={onClose} />);

    await goToSettingsWithPreview();
    fireEvent.click(screen.getByRole("button", { name: "Добавить на слой" }));

    expect(decodeNativePng).toHaveBeenCalledWith("native-b64", 2, 2);
    expect(onClose).toHaveBeenCalledOnce();
    expect(useEditorCanvasStore.getState().width).toBe(2);
    expect(useEditorCanvasStore.getState().height).toBe(2);
    const layer = useEditorCanvasStore.getState().getActiveLayer()!;
    expect(layer.name).toBe("Import 1");
    expect(layer.pixels[0]).toBe(9);
    expect(layer.pixels[3]).toBe(255);
    expect(useEditorCanvasStore.getState().layers).toHaveLength(2);
  });

  it("aborts an in-flight preview when settings change", async () => {
    grantPixelate();
    let abortCount = 0;
    vi.mocked(pixelateFromFile).mockImplementation(
      (_file, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            abortCount += 1;
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    render(<ImportPixelateModal request={{ kind: "file", file: pngFile() }} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Далее" }));
    await vi.advanceTimersByTimeAsync(PIXELATE_PREVIEW_DEBOUNCE_MS);
    await waitFor(() => expect(pixelateFromFile).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("Размер пикселя"), { target: { value: "12" } });
    await vi.advanceTimersByTimeAsync(PIXELATE_PREVIEW_DEBOUNCE_MS);

    expect(abortCount).toBeGreaterThanOrEqual(1);
    expect(useEditorCanvasStore.getState().layers).toHaveLength(1);
  });

  it("blocks a new import layer at MAX_LAYERS until the active layer is chosen", async () => {
    grantPixelate();
    const layers = Array.from({ length: MAX_LAYERS }, (_, index) => createLayer({ name: `Слой ${index + 1}` }));
    __resetEditorCanvasStoreForTests({ layers, activeLayerId: layers[0]!.id });
    const native = new Uint8ClampedArray(1 * 1 * 4);
    native[0] = 4;
    native[3] = 255;
    vi.mocked(pixelateFromFile).mockResolvedValue({
      ...pixelateResult,
      nativeWidth: 1,
      nativeHeight: 1,
    });
    vi.mocked(decodeNativePng).mockResolvedValue(native);

    render(<ImportPixelateModal request={{ kind: "file", file: pngFile() }} onClose={vi.fn()} />);
    await goToSettingsWithPreview();

    const add = screen.getByRole("button", { name: "Добавить на слой" });
    expect(add).toBeDisabled();
    expect(screen.getByText(/Максимум 16 слоёв/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "На активный слой" }));
    expect(add).toBeEnabled();
    fireEvent.click(add);

    expect(useEditorCanvasStore.getState().width).toBe(1);
    expect(useEditorCanvasStore.getState().height).toBe(1);
    expect(useEditorCanvasStore.getState().layers).toHaveLength(MAX_LAYERS);
    expect(useEditorCanvasStore.getState().getActiveLayer()!.id).toBe(layers[0]!.id);
    expect(useEditorCanvasStore.getState().getActiveLayer()!.pixels).toHaveLength(4);
    expect(useEditorCanvasStore.getState().getActiveLayer()!.pixels[0]).toBe(4);
  });
});
