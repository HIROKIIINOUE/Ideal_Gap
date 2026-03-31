// カードの出現地点ロジックをここで管理

export type LandingRevealInput = {
  sectionTop: number | null;
  scrollOffsetY: number;
  viewportHeight: number;
  preloadOffset?: number;
  minimumScrollY?: number;
};

export const LANDING_SECTION_REVEAL_OFFSET = 120;
export const LANDING_SECTION_MIN_SCROLL_Y = 60; // 最初のカードフェードインをここで調整

export const shouldRevealLandingSection = ({
  sectionTop,
  scrollOffsetY,
  viewportHeight,
  preloadOffset = LANDING_SECTION_REVEAL_OFFSET,
  minimumScrollY = LANDING_SECTION_MIN_SCROLL_Y,
}: LandingRevealInput) => {
  if (sectionTop === null) return false;
  if (scrollOffsetY < minimumScrollY) return false;
  // scrollOffsetY + viewportHeight = 今端末で見えている画面の下端のY座標
  // sectionTop + preloadOffset = 要素の上端 + スクロール距離(大きくすると要素の上端からより深い位置が開始地点になる)
  return scrollOffsetY + viewportHeight >= sectionTop + preloadOffset;
};
