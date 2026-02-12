// 指定のオファリング/パッケージを取得し、購入処理を起動する機能。「どのサブスク商品を表示・購入させるか」をここで集約。
// このファイルで設定したオファリングとパッケージIDは必ずRevenueCat側の設定と揃えること
import Purchases, { PurchasesPackage } from "react-native-purchases";

// ここで取得対象のオファリング/パッケージを指定する
export const TEST_STORE_OFFERING_ID = "standard_monthly";
export const TEST_STORE_PACKAGE_ID = "monthly";

type PackageIntroPrice = NonNullable<PurchasesPackage["product"]["introPrice"]>;

// 無料期間の単位の型
type TrialDuration = {
  unit: PackageIntroPrice["periodUnit"];
  value: number;
};

// フリートライアル用のラベルを生成
const formatTrialLabel = (duration: TrialDuration | null) => {
  if (!duration) return undefined;
  const unitLabel =
    duration.value === 1
      ? duration.unit.toLowerCase()
      : `${duration.unit.toLowerCase()}s`;
  return `Free for ${duration.value} ${unitLabel}`;
};

//  RevenueCatのintroPrice情報から無料期間があるかを判定し、期間をTrialDurationに整形。
const resolveTrialDuration = (
  introPrice?: PackageIntroPrice | null
): TrialDuration | null => {
  if (!introPrice || introPrice.price > 0) return null;
  if (introPrice.periodUnit && introPrice.periodNumberOfUnits) {
    return {
      unit: introPrice.periodUnit,
      value: introPrice.periodNumberOfUnits,
    };
  }
  return null;
};

// UI用のパッケージ情報の型
export type TestStorePlan = {
  package: PurchasesPackage;
  priceString: string;
  trialLabel?: string;
  trialDuration?: TrialDuration;
};

// RevenueCatから全オファリングを取得。該当パッケージ(今回はmonthly)が無ければNullを返す
// 同時にトライアル期間があればTestStorePlanの形式でそれも返す
export const fetchTestStorePackage =
  async (): Promise<TestStorePlan | null> => {
    const offerings = await Purchases.getOfferings();
    const offering =
      offerings.all?.[TEST_STORE_OFFERING_ID] ?? offerings.current ?? null;
    if (!offering) return null;

    const selectedPackage =
      offering.availablePackages.find(
        (pkg) => pkg.identifier === TEST_STORE_PACKAGE_ID
      ) ??
      offering.availablePackages[0] ??
      null;

    if (!selectedPackage) return null;

    const trialDuration = resolveTrialDuration(
      selectedPackage.product.introPrice
    );

    return {
      package: selectedPackage,
      priceString: selectedPackage.product.priceString,
      trialDuration: trialDuration ?? undefined,
      trialLabel: formatTrialLabel(trialDuration),
    };
  };

// ユーザーが購入ボタンを押したらpurchaseSelectedPackage(plan.package)が呼ばれる(purchases.tsx)
// 呼び出し時にRevenueCatがネイティブの購入フローを開始し、ユーザーが購入を完了するとサーバー検証済みの購入情報（CustomerInfo）が返ってくる。ユーザがキャンセルした場合は戻り値のuserCancelledがtrueになる。
export const purchaseSelectedPackage = (pkg: PurchasesPackage) =>
  Purchases.purchasePackage(pkg);
