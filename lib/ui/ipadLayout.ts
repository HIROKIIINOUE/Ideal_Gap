// iPad用のUI構築のためのファイル。
// 現段階ではiPhoneのUIがメインで「ランディングページ」「タスクタイマー」「全ページ文字サイズ」のみiPad用にUIを修正している状態
// iPhoneのUIコードとは切り離して管理し、iPad用UIの変更がiPhoneのUIへ影響しないように管理。

// iPad用の全ての文字の大きさをここで指定(以下の場合は全ての文字がiPhone用の1.6倍になる)
export const IPAD_FONT_SCALE = 1.6;
type LandingSectionKey = "overview" | "membership" | "getStarted";

type TaskTimerLayout = {
  ringSize: number;
  ringStrokeWidth: number;
  ringBackgroundStrokeWidth: number;
  ringMaxWidth: number;
  presetsMarginTop: number;
  presetsJustifyContent: "flex-start" | "center";
  timerWrapperMarginBottom: number;
};

// ランディングページの各カードのフェードインのタイミングを調整
export const getLandingFadeTriggerY = (isIpad: boolean) =>
  isIpad ? 620 : 1080;

// ランディングページの各カードのフェードインのタイミングを調整
export const getLandingFadeRange = (
  section: LandingSectionKey,
  isIpad: boolean,
) => {
  if (!isIpad) {
    if (section === "overview") return { start: 60, end: 220 };
    if (section === "membership") return { start: 540, end: 700 };
    return { start: 920, end: 1080 };
  }
  if (section === "overview") return { start: 140, end: 280 };
  if (section === "membership") return { start: 600, end: 660 };
  return { start: 720, end: 850 };
};

// タスクタイマーページのUI、iPhoneとiPadで異なる値をここで管理
export const getTaskTimerIpadLayout = (isIpad: boolean): TaskTimerLayout =>
  isIpad
    ? {
        ringSize: 300,
        ringStrokeWidth: 28,
        ringBackgroundStrokeWidth: 24,
        ringMaxWidth: 300,
        presetsMarginTop: -20,
        presetsJustifyContent: "center",
        timerWrapperMarginBottom: -120,
      }
    : {
        ringSize: 260,
        ringStrokeWidth: 24,
        ringBackgroundStrokeWidth: 20,
        ringMaxWidth: 260,
        presetsMarginTop: -20,
        presetsJustifyContent: "center",
        timerWrapperMarginBottom: 0,
      };

// iPhone文字サイズをここでiPad用の文字サイズに変換(拡大している)
export const scaleFontSizeForIpad = (fontSize: number, isIpad: boolean) =>
  isIpad ? Math.round(fontSize * IPAD_FONT_SCALE) : fontSize;
