// Minimal shims so TypeScript/ESLint in Node tooling can understand Deno-style imports.
declare module "https://deno.land/std@0.223.0/http/server.ts" {
  export type Handler = (req: Request) => Response | Promise<Response>;
  export function serve(handler: Handler): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.45.4" {
  export * from "@supabase/supabase-js";
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
