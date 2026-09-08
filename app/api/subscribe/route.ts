import * as v from "valibot";

import { cmsEnv, stringValue } from "@/lib/cms";
import { validateJsonBody } from "@/lib/api-validation";

const subscribeSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email()),
  consent: v.literal(true),
  language: v.optional(v.picklist(["fr", "en"])),
  region: v.optional(v.picklist(["qc", "conakry"])),
});

export async function POST(request: Request) {
  try {
    const parsed = await validateJsonBody(request, subscribeSchema);
    if (!parsed.success) return parsed.response;

    const data = parsed.data;
    const email = data.email.toLowerCase();
    await cmsEnv().DB.prepare("INSERT INTO subscribers (id,email,language,consent,source,region,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET consent=excluded.consent,language=excluded.language,region=excluded.region")
      .bind(crypto.randomUUID(), email, stringValue(data.language, "fr"), 1, "promotion", data.region === "qc" ? "qc" : "conakry", new Date().toISOString()).run();
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Inscription momentanément indisponible." }, { status: 503 });
  }
}
