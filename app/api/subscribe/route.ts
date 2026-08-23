import { body, cmsEnv, stringValue } from "@/lib/cms";

export async function POST(request: Request) {
  try {
    const data = await body(request);
    const email = stringValue(data.email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Adresse courriel invalide." }, { status: 400 });
    if (data.consent !== true) return Response.json({ error: "Le consentement est obligatoire." }, { status: 400 });
    await cmsEnv().DB.prepare("INSERT INTO subscribers (id,email,language,consent,source,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET consent=excluded.consent,language=excluded.language")
      .bind(crypto.randomUUID(), email, stringValue(data.language, "fr"), 1, "promotion", new Date().toISOString()).run();
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Inscription momentanément indisponible." }, { status: 503 });
  }
}
