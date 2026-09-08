import * as v from "valibot";

import { cmsEnv, currentAdmin, forbidden, stringValue } from "@/lib/cms";
import { validateJsonBody } from "@/lib/api-validation";

const settingsSchema = v.record(
  v.pipe(v.string(), v.regex(/^[a-z][a-z0-9_]{1,60}$/)),
  v.string(),
);

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const { results } = await cmsEnv().DB.prepare("SELECT key,value FROM settings ORDER BY key").all<{ key: string; value: string }>();
  return Response.json({ settings: Object.fromEntries(results.map((entry) => [entry.key, entry.value])) });
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const parsed = await validateJsonBody(request, settingsSchema);
  if (!parsed.success) return parsed.response;
  const entries = Object.entries(parsed.data);
  if (entries.length) await cmsEnv().DB.batch(entries.map(([key, value]) => cmsEnv().DB.prepare("INSERT INTO settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key, stringValue(value), new Date().toISOString())));
  return Response.json({ success: true });
}
