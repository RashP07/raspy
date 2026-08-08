import { existsSync, readFileSync } from "node:fs";
import vinext from "vinext";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

/**
 * Deploy-time hosting config, kept out of the repo because it carries a
 * project id. Absent in a fresh clone, which just means no bindings.
 */
const HOSTING_CONFIG_PATH = "./.openai/hosting.json";

const { d1, r2 }: { d1: string | null; r2: string | null } = existsSync(
  HOSTING_CONFIG_PATH,
)
  ? JSON.parse(readFileSync(HOSTING_CONFIG_PATH, "utf8"))
  : { d1: null, r2: null };

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig({
  plugins: [
    vinext(),
    sites(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      config: localBindingConfig,
    }),
  ],
});
