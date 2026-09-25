import { useWindowDimensions } from '../layout/PortraitFallback';

export function useLandscapeDimensions() {
  const { width, height, scale, fontScale } = useWindowDimensions();
  const landscapeWidth = Math.max(width, height);
  const landscapeHeight = Math.min(width, height);

  return {
    width: landscapeWidth,
    height: landscapeHeight,
    scale,
    fontScale,
    isLandscape: true,
    isPortrait: false,
  };
}
