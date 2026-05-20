import {
  APPLE_STANDARD_EULA_URL,
  ANDROID_TERMS_OF_USE_URL,
  PRIVACY_POLICY_URL,
  getStoreName,
  getTermsOfUseUrl,
} from "../subscriptionLegal";
import {
  getPlanBillingCopy,
  getPlanTrialCopy,
  getTrialLabel,
} from "../planCopy";

const createTranslator = () =>
  ((key: string, options?: Record<string, unknown>) => {
    switch (key) {
      case "trialLabelDay":
        return `${options?.count} days free`;
      case "planRenewalPrice":
        return `${options?.price}/month`;
      case "trialInfo":
        return `${options?.trial}, then renews at ${options?.price}/month`;
      case "planUnavailable":
        return "Plan unavailable";
      default:
        return key;
    }
  }) as any;

describe("subscriptionLegal", () => {
  it("uses the App Store label on iOS", () => {
    expect(getStoreName("ios")).toBe("App Store");
  });

  it("uses the Google Play label on Android", () => {
    expect(getStoreName("android")).toBe("Google Play");
  });

  it("exposes the production legal URLs", () => {
    expect(PRIVACY_POLICY_URL).toContain("notion.site");
    expect(APPLE_STANDARD_EULA_URL).toBe(
      "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
    );
    expect(ANDROID_TERMS_OF_USE_URL).toContain("Terms-of-Use");
  });

  it("uses Apple terms on iOS and custom terms on Android", () => {
    expect(getTermsOfUseUrl("ios")).toBe(APPLE_STANDARD_EULA_URL);
    expect(getTermsOfUseUrl("android")).toBe(ANDROID_TERMS_OF_USE_URL);
  });
});

describe("planCopy", () => {
  const t = createTranslator();

  it("builds the billed price as the primary copy", () => {
    expect(
      getPlanBillingCopy(
        {
          priceString: "$3.99",
          package: {} as any,
          trialDuration: { unit: "DAY", value: 14 },
        },
        t,
      ),
    ).toBe("$3.99/month");
  });

  it("builds the trial copy as subordinate copy", () => {
    expect(
      getPlanTrialCopy(
        {
          priceString: "$3.99",
          package: {} as any,
          trialDuration: { unit: "DAY", value: 14 },
        },
        t,
      ),
    ).toBe("14 days free, then renews at $3.99/month");
  });

  it("omits the trial copy when no trial exists", () => {
    expect(
      getPlanTrialCopy(
        {
          priceString: "$3.99",
          package: {} as any,
        },
        t,
      ),
    ).toBeNull();
  });

  it("keeps resolving a human-readable trial label", () => {
    expect(
      getTrialLabel(
        {
          priceString: "$3.99",
          package: {} as any,
          trialDuration: { unit: "DAY", value: 14 },
        },
        t,
      ),
    ).toBe("14 days free");
  });
});
