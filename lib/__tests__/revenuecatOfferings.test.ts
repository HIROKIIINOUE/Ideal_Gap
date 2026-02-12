import Purchases from "react-native-purchases";
import {
  fetchTestStorePackage,
  TEST_STORE_OFFERING_ID,
  TEST_STORE_PACKAGE_ID,
} from "../revenuecatOfferings";

jest.mock("react-native-purchases", () => ({
  getOfferings: jest.fn(),
  purchasePackage: jest.fn(),
}));

const mockGetOfferings = Purchases.getOfferings as jest.Mock;

describe("fetchTestStorePackage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
