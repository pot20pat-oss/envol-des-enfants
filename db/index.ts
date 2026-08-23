import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "La base Cloudflare D1 `DB` n’est pas configurée. Vérifiez wrangler.jsonc et les liaisons Cloudflare."
    );
  }

  return drizzle(env.DB, { schema });
}
