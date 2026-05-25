// 画面のスクリーンサイズに応じてUIを修正するためのビューポイント設定値
// Platform.OS分岐ではなく、useWindowDimensions()由来のwidthとfontScaleで判定しiOSとAndroid双方に対応
// 本アプリは「普通画面」「Compact画面」「Narrow画面」の３種類のスクリーンサイズに対応

// iPhone 12/13/14系の390、Pro系の393
export const COMPACT_SCREEN_MAX_WIDTH = 393;
export const COMPACT_FONT_SCALE = 1.1;
// Androidで最も一般的な小さめ幅クラス（360dp）
export const NARROW_SCREEN_MAX_WIDTH = 360;
export const TABLET_SCREEN_MIN_WIDTH = 600;

// Compact画面・・・画面幅が小さいorユーザが端末で文字スケールを1.1以上に設定している場合
export const isCompactScreen = (width: number, fontScale: number) =>
  width <= COMPACT_SCREEN_MAX_WIDTH || fontScale >= COMPACT_FONT_SCALE;

// Narrow画面・・・画面幅がかなり小さい場合
export const isNarrowScreen = (width: number) =>
  width <= NARROW_SCREEN_MAX_WIDTH;

// タブレット相当・・・短辺が600dp以上の画面をタブレット向けレイアウト対象として扱う
export const isTabletScreen = (width: number, height: number) =>
  Math.min(width, height) >= TABLET_SCREEN_MIN_WIDTH;
