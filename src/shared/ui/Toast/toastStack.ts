import { TOAST_GAP_PX, TOAST_STACK_OFFSET_PX, TOAST_STACK_SCALE_STEP } from "./toastTypes";

export type ToastStackLayout = {
  offsetY: number;
  scale: number;
  clippedHeight: number | null;
};

/**
 * Sonner-style stack: front toast at 0; behind toasts lift and shrink while collapsed.
 * When expanded, offset is the sum of prior heights + gaps.
 */
export function computeToastStackLayout(options: {
  index: number;
  expanded: boolean;
  frontHeight: number;
  heightsBefore: number;
  gap?: number;
  stackOffset?: number;
  scaleStep?: number;
}): ToastStackLayout {
  const gap = options.gap ?? TOAST_GAP_PX;
  const stackOffset = options.stackOffset ?? TOAST_STACK_OFFSET_PX;
  const scaleStep = options.scaleStep ?? TOAST_STACK_SCALE_STEP;
  const { index, expanded, frontHeight, heightsBefore } = options;

  if (expanded) {
    return {
      offsetY: heightsBefore + index * gap,
      scale: 1,
      clippedHeight: null,
    };
  }

  return {
    offsetY: index * stackOffset,
    scale: Math.max(0.7, 1 - index * scaleStep),
    clippedHeight: index === 0 ? null : frontHeight,
  };
}

export function sumHeightsBefore(
  heights: readonly { id: string; height: number }[],
  orderedIds: readonly string[],
  index: number,
): number {
  let sum = 0;
  for (let i = 0; i < index; i += 1) {
    const id = orderedIds[i];
    if (!id) continue;
    const entry = heights.find((item) => item.id === id);
    sum += entry?.height ?? 0;
  }
  return sum;
}
