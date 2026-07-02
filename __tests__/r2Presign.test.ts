import { createR2PresignedGetUrl } from "../supabase/functions/_shared/r2Presign";

describe("createR2PresignedGetUrl", () => {
  it("builds a virtual-hosted R2 presigned GET url", async () => {
    const url = await createR2PresignedGetUrl({
      accountEndpoint: "https://1234567890abcdef.r2.cloudflarestorage.com",
      bucket: "focus-music",
      objectKey: "tracks/deep focus.mp3",
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
      expiresInSeconds: 1800,
      now: new Date("2026-06-18T12:34:56Z"),
    });

    const parsed = new URL(url);

    expect(parsed.origin).toBe(
      "https://focus-music.1234567890abcdef.r2.cloudflarestorage.com",
    );
    expect(parsed.pathname).toBe("/tracks/deep%20focus.mp3");
    expect(parsed.searchParams.get("X-Amz-Algorithm")).toBe(
      "AWS4-HMAC-SHA256",
    );
    expect(parsed.searchParams.get("X-Amz-Date")).toBe("20260618T123456Z");
    expect(parsed.searchParams.get("X-Amz-Expires")).toBe("1800");
    expect(parsed.searchParams.get("X-Amz-SignedHeaders")).toBe("host");
    expect(parsed.searchParams.get("X-Amz-Credential")).toContain(
      "/20260618/auto/s3/aws4_request",
    );
    expect(parsed.searchParams.get("X-Amz-Signature")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects expiration longer than seven days", async () => {
    await expect(
      createR2PresignedGetUrl({
        accountEndpoint: "https://1234567890abcdef.r2.cloudflarestorage.com",
        bucket: "focus-music",
        objectKey: "tracks/deep-focus.mp3",
        accessKeyId: "test-access-key",
        secretAccessKey: "test-secret-key",
        expiresInSeconds: 604801,
      }),
    ).rejects.toThrow("expiresInSeconds must be between 1 and 604800");
  });
});
