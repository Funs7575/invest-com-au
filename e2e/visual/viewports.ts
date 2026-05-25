export const VIEWPORTS = {
  mobile: { width: 375, height: 812, name: "mobile" },
  tablet: { width: 768, height: 1024, name: "tablet" },
  desktop: { width: 1440, height: 900, name: "desktop" },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

export const DEFAULT_VIEWPORTS: ViewportName[] = ["desktop", "tablet", "mobile"];
