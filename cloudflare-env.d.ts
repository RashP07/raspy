/* Ambient Cloudflare types for local typecheck without wrangler codegen. */

interface D1Database {
  prepare(query: string): unknown;
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
    ASSETS?: Fetcher;
  };
}
