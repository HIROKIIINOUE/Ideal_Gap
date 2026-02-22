// denoとはNode.jsと同じくJS/TSを実行するランタイムで、
// Supabase Edge FunctionsはDeno上で動くのでDeno専用のAPI/URL importが出てくる。
// このファイルではNode側の方チェックやESLintがこのDeno由来のimportを理解できるようにしたもの。
// つまり「Edge Function は Deno 実行環境だけど、ローカルの TS/ESLint は Node 前提」をカバーするためのファイル

// Minimal shims so TypeScript/ESLint in Node tooling can understand Deno-style imports.
declare module "https://deno.land/std@0.223.0/http/server.ts" {
  export type Handler = (req: Request) => Response | Promise<Response>;
  export function serve(handler: Handler): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.45.4" {
  export * from "@supabase/supabase-js";
}

declare module "https://esm.sh/zod@4.1.13" {
  export * from "zod";
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
