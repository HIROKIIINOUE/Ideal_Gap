import Purchases from "react-native-purchases";
import {
  fetchTestStorePackage,
  getRevenueCatEntitlementAccessState,
  hasActiveEntitlement,
  PREMIUM_ENTITLEMENT_ID,
  TEST_STORE_OFFERING_ID,
  TEST_STORE_PACKAGE_ID,
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

describe("fetchTestStorePackage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockResolvedValue(true);
  });

  it("returns the Test Store package with trial info from intro price", async () => {
    const mockPackage = {
      identifier: TEST_STORE_PACKAGE_ID,
      product: {
        priceString: "$8.50",
        introPrice: {
          price: 0,
          periodUnit: "MONTH",
          periodNumberOfUnits: 1,
        },
      },
    };

    mockGetOfferings.mockResolvedValue({
      all: {
        [TEST_STORE_OFFERING_ID]: {
          availablePackages: [mockPackage],
        },
      },
      current: null,
    });

    const plan = await fetchTestStorePackage();

    expect(mockGetOfferings).toHaveBeenCalled();
    expect(plan?.package).toBe(mockPackage);
    expect(plan?.priceString).toBe("$8.50");
    expect(plan?.trialDuration).toEqual({ unit: "MONTH", value: 1 });
    expect(plan?.trialLabel).toBe("Free for 1 month");
  });

  it("returns null when the Test Store offering is missing", async () => {
    mockGetOfferings.mockResolvedValue({
      all: {},
      current: null,
    });

    const plan = await fetchTestStorePackage();
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
