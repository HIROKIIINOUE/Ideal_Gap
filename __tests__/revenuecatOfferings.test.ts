import Purchases from "react-native-purchases";
import {
  fetchRevenueCatPackage,
  getRevenueCatEntitlementAccessState,
  hasActiveEntitlement,
  PREMIUM_ENTITLEMENT_ID,
  REVENUECAT_OFFERING_ID,
  REVENUECAT_PACKAGE_ID,
} from "../lib/revenuecatOfferings";

jest.mock("react-native-purchases", () => ({
  getCustomerInfo: jest.fn(),
  getOfferings: jest.fn(),
  isConfigured: jest.fn(),
  purchasePackage: jest.fn(),
}));

const mockGetOfferings = Purchases.getOfferings as jest.Mock;
const mockGetCustomerInfo = Purchases.getCustomerInfo as jest.Mock;
const mockIsConfigured = Purchases.isConfigured as jest.Mock;

describe("fetchRevenueCatPackage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockResolvedValue(true);
  });

  it("returns the RevenueCat package with trial info from intro price", async () => {
    const mockPackage = {
      identifier: REVENUECAT_PACKAGE_ID,
      product: {
        price: 8.5,
        priceString: "$8.50",
        currencyCode: "CAD",
        introPrice: {
          price: 0,
          periodUnit: "MONTH",
          periodNumberOfUnits: 1,
        },
      },
    };

    mockGetOfferings.mockResolvedValue({
      all: {
        [REVENUECAT_OFFERING_ID]: {
          availablePackages: [mockPackage],
        },
      },
      current: null,
    });

    const plan = await fetchRevenueCatPackage();

    expect(mockGetOfferings).toHaveBeenCalled();
    expect(plan?.package).toBe(mockPackage);
    expect(plan?.price).toBe(8.5);
    expect(plan?.priceString).toBe("$8.50");
    expect(plan?.currencyCode).toBe("CAD");
    expect(plan?.trialDuration).toEqual({ unit: "MONTH", value: 1 });
    expect(plan?.trialLabel).toBe("Free for 1 month");
  });

  it("returns null when the RevenueCat offering is missing", async () => {
    mockGetOfferings.mockResolvedValue({
      all: {},
      current: null,
    });

    const plan = await fetchRevenueCatPackage();
    expect(plan).toBeNull();
  });
});

describe("hasActiveEntitlement", () => {
  it("returns true when premium entitlement is active", () => {
    const customerInfo = {
      entitlements: {
        active: {
          [PREMIUM_ENTITLEMENT_ID]: {
            identifier: PREMIUM_ENTITLEMENT_ID,
            isActive: true,
          },
        },
      },
    } as any;

    expect(hasActiveEntitlement(customerInfo)).toBe(true);
  });

  it("returns false when premium entitlement is missing", () => {
    const customerInfo = {
      entitlements: {
        active: {},
      },
    } as any;

    expect(hasActiveEntitlement(customerInfo)).toBe(false);
  });
});

describe("getRevenueCatEntitlementAccessState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockResolvedValue(true);
  });

  it("returns entitled when cached customer info has premium entitlement", async () => {
    mockGetCustomerInfo.mockResolvedValue({
      entitlements: {
        active: {
          [PREMIUM_ENTITLEMENT_ID]: { identifier: PREMIUM_ENTITLEMENT_ID },
        },
      },
    });

    await expect(getRevenueCatEntitlementAccessState()).resolves.toEqual(
      expect.objectContaining({ state: "entitled" }),
    );
  });

  it("returns unknown when Purchases is not configured yet", async () => {
    mockIsConfigured.mockResolvedValue(false);

    await expect(getRevenueCatEntitlementAccessState()).resolves.toEqual(
      expect.objectContaining({ state: "unknown" }),
    );
    expect(mockGetCustomerInfo).not.toHaveBeenCalled();
  });
});
