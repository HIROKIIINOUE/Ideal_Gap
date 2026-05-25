// 〇〇〇〇秒から「〇時間〇分〇秒」の表示用フォーマットに変換する
export const formatTaskTimerDigital = (seconds: number, forceHours = false) => {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (forceHours || hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
};

// モバイルの場合はカウントダウンタイマーのドーナッツ内の残り時間表示を1行にする
export const getTaskTimerDurationLabel = ({
  inputSeconds,
  remainingSeconds,
  tabletScreen,
}: {
  inputSeconds: number;
  remainingSeconds: number;
  tabletScreen: boolean;
}) => {
  const useStableTabletHourLabel = tabletScreen && inputSeconds >= 3600;

  return `${formatTaskTimerDigital(remainingSeconds, useStableTabletHourLabel)} / ${formatTaskTimerDigital(inputSeconds, useStableTabletHourLabel)}`;
};

// タブレットの場合はカウントダウンタイマーのドーナッツ内の残り時間表示を2行にする
export const getTaskTimerDurationMultilineLabel = ({
  inputSeconds,
  remainingSeconds,
  tabletScreen,
}: {
  inputSeconds: number;
  remainingSeconds: number;
  tabletScreen: boolean;
}) => {
  if (!tabletScreen) {
    return getTaskTimerDurationLabel({
      inputSeconds,
      remainingSeconds,
      tabletScreen,
    });
  }

  const useStableTabletHourLabel = inputSeconds >= 3600;

  return `${formatTaskTimerDigital(remainingSeconds, useStableTabletHourLabel)}\n/ ${formatTaskTimerDigital(inputSeconds, useStableTabletHourLabel)}`;
};
