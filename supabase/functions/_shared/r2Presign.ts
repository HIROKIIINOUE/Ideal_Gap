// Cloudflare R2 上の音源ファイルを一定時間だけダウンロード可能にする「署名付きURL」を自前で生成する共通関数ファイル
// (現段階では音楽のダウンロードでしか使用されていない)
// ↓↓↓流れ↓↓↓
// 1. objectKey や bucket をもとに、R2 の取得URLの元になるパスを組み立てる
// 2. AWS Signature V4 方式で、R2_ACCESS_KEY_ID と R2_SECRET_ACCESS_KEY を使って署名を作る
// 3. X-Amz-* パラメータ付きのURLを返す
//    このURLは期限付きなので、誰でも永久に使える公開URLにはなりません。

const encoder = new TextEncoder();
const MAX_PRESIGN_EXPIRES_IN = 604_800;
const DEFAULT_REGION = "auto";
const DEFAULT_SERVICE = "s3";

const toBufferBytes = (value: ArrayBuffer | Uint8Array) =>
  value instanceof Uint8Array ? new Uint8Array(value) : new Uint8Array(value);

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const digestSha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toHex(new Uint8Array(digest));
};

const signHmacSha256 = async (
  key: Uint8Array | ArrayBuffer | string,
  value: string,
) => {
  const normalizedKey =
    typeof key === "string"
      ? encoder.encode(key)
      : key instanceof Uint8Array
        ? key
        : new Uint8Array(key);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toBufferBytes(normalizedKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value));
};

const awsPercentEncode = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

const normalizeObjectKey = (value: string) => value.replace(/^(\.\/|\/)+/, "");

const toDateStamp = (date: Date) =>
  [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");

const toAmzDate = (date: Date) =>
  `${toDateStamp(date)}T${String(date.getUTCHours()).padStart(2, "0")}${String(
    date.getUTCMinutes(),
  ).padStart(2, "0")}${String(date.getUTCSeconds()).padStart(2, "0")}Z`;

const buildCanonicalUri = (objectKey: string) =>
  `/${normalizeObjectKey(objectKey)
    .split("/")
    .filter(Boolean)
    .map(awsPercentEncode)
    .join("/")}`;

const buildCanonicalQueryString = (params: Record<string, string>) =>
  Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, value]) => `${awsPercentEncode(key)}=${awsPercentEncode(value)}`,
    )
    .join("&");

const deriveSigningKey = async ({
  secretAccessKey,
  dateStamp,
  region,
  service,
}: {
  secretAccessKey: string;
  dateStamp: string;
  region: string;
  service: string;
}) => {
  const kDate = await signHmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await signHmacSha256(kDate, region);
  const kService = await signHmacSha256(kRegion, service);
  return signHmacSha256(kService, "aws4_request");
};

export const createR2PresignedGetUrl = async ({
  accountEndpoint,
  bucket,
  objectKey,
  accessKeyId,
  secretAccessKey,
  expiresInSeconds = 60 * 30,
  now = new Date(),
  region = DEFAULT_REGION,
  service = DEFAULT_SERVICE,
}: {
  accountEndpoint: string;
  bucket: string;
  objectKey: string;
  accessKeyId: string;
  secretAccessKey: string;
  expiresInSeconds?: number;
  now?: Date;
  region?: string;
  service?: string;
}) => {
  if (expiresInSeconds < 1 || expiresInSeconds > MAX_PRESIGN_EXPIRES_IN) {
    throw new Error(
      `expiresInSeconds must be between 1 and ${MAX_PRESIGN_EXPIRES_IN}`,
    );
  }

  const endpoint = new URL(accountEndpoint);
  const host = `${bucket}.${endpoint.host}`;
  const canonicalUri = buildCanonicalUri(objectKey);
  const amzDate = toAmzDate(now);
  const dateStamp = toDateStamp(now);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const queryParams = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresInSeconds),
    "X-Amz-SignedHeaders": "host",
  };

  const canonicalQueryString = buildCanonicalQueryString(queryParams);
  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQueryString,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await digestSha256Hex(canonicalRequest),
  ].join("\n");

  const signatureBytes = toBufferBytes(
    await deriveSigningKey({
      secretAccessKey,
      dateStamp,
      region,
      service,
    }).then((signingKey) => signHmacSha256(signingKey, stringToSign)),
  );
  const signature = toHex(signatureBytes);

  return `${endpoint.protocol}//${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
};
