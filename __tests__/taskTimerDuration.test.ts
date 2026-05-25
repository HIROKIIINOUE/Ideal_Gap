import {
  getTaskTimerDurationLabel,
  getTaskTimerDurationMultilineLabel,
} from "../lib/ui/taskTimerDuration";

describe("getTaskTimerDurationLabel", () => {
  test("keeps hour-based labels fixed on tablet once a timer starts above one hour", () => {
    expect(
      getTaskTimerDurationLabel({
        inputSeconds: 3600,
        remainingSeconds: 3599,
        tabletScreen: true,
      }),
    ).toBe("0:59:59 / 1:00:00");
  });

  test("keeps mobile labels unchanged once a timer drops below one hour", () => {
    expect(
      getTaskTimerDurationLabel({
        inputSeconds: 3600,
        remainingSeconds: 3599,
        tabletScreen: false,
      }),
    ).toBe("59:59 / 1:00:00");
  });
});

describe("getTaskTimerDurationMultilineLabel", () => {
  test("renders tablet timer labels as two lines after dropping below one hour", () => {
    expect(
      getTaskTimerDurationMultilineLabel({
        inputSeconds: 3600,
        remainingSeconds: 3599,
        tabletScreen: true,
      }),
    ).toBe("0:59:59\n/ 1:00:00");
  });

  test("keeps mobile timer labels on one line", () => {
    expect(
      getTaskTimerDurationMultilineLabel({
        inputSeconds: 3600,
        remainingSeconds: 3599,
        tabletScreen: false,
      }),
    ).toBe("59:59 / 1:00:00");
  });
});
