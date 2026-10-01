/** Mobile v1 accepts only major version 1 of `twilite.pixelobject`. */
export function isSupportedTpoMajor(format: string): boolean {
  const match = /^twilite\.pixelobject\/v(\d+)/.exec(format);
  return match?.[1] === "1";
}

export function sheetFrameOrigin(
  frame: number,
  columns: number,
  frameWidth: number,
  frameHeight: number,
): { sx: number; sy: number } {
  const safeColumns = Math.max(1, columns);
  const column = ((frame % safeColumns) + safeColumns) % safeColumns;
  const row = Math.floor(frame / safeColumns);
  return { sx: column * frameWidth, sy: row * frameHeight };
}

export function nextLoopIndex(index: number, count: number): number {
  if (count <= 1) {
    return 0;
  }
  return (index + 1) % count;
}

export type DecodedSheet = {
  close: () => void;
};

/**
 * On-screen: decode once and keep the sheet.
 * Off-screen, or a newer mount: close the decoded sheet.
 * Unknown major never calls `load`.
 */
export function createMobileSurface() {
  let current: DecodedSheet | null = null;
  let generation = 0;

  return {
    async mount(format: string, load: () => Promise<DecodedSheet>): Promise<DecodedSheet | null> {
      const token = ++generation;
      if (!isSupportedTpoMajor(format)) {
        return null;
      }
      const decoded = await load();
      if (token !== generation) {
        decoded.close();
        return null;
      }
      current?.close();
      current = decoded;
      return decoded;
    },
    unmount(): void {
      generation += 1;
      current?.close();
      current = null;
    },
  };
}
