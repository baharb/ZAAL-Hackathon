import { useWindowDimensions } from '../layout/PortraitFallback';

export function useResponsive() {
  const { width, height, scale, fontScale } = useWindowDimensions();
  const shortest = Math.min(width, height);
  const longest = Math.max(width, height);
  const isLandscape = width > height;
  const isTablet = shortest >= 700;
  const isSmall = shortest < 380;
  const isWide = width >= 760;
  const sideRail = false;
  const horizontalPadding = isTablet ? 28 : isSmall ? 12 : 16;
  const contentWidth = sideRail ? width - 92 : width;
  const maxContentWidth = Math.min(contentWidth - horizontalPadding * 2, isTablet ? 1080 : 720);
  const columns = contentWidth >= 980 ? 4 : contentWidth >= 680 ? 3 : 2;

  return {
    width,
    height,
    scale,
    fontScale,
    shortest,
    longest,
    isLandscape,
    isTablet,
    isSmall,
    isWide,
    sideRail,
    horizontalPadding,
    contentWidth,
    maxContentWidth,
    columns,
  };
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
