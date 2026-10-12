/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  BUCKET: R2Bucket;
  ADMIN_EMAILS?: string;
  ADMIN_BOOTSTRAP_PASSWORD?: string;
  SESSION_SECRET?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com",
    "frame-src 'self' https://www.google.com https://maps.google.com",
    "upgrade-insecure-requests",
  ].join("; "));
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  // OAuth callback redirects must not leak its single-use code via Referer.
  headers.set("Referrer-Policy", response.headers.get("Referrer-Policy") || "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}


const LOCK_TTL_MS = 60_000;
const LOCK_COOKIE = "envol_admin_session";
async function sessionDigest(request: Request): Promise<string | null> {
  const token = (request.headers.get("cookie") || "").split(";").map(x=>x.trim()).find(x=>x.startsWith(LOCK_COOKIE+"="))?.slice(LOCK_COOKIE.length+1);
  if (!token) return null;
  const hash = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
  return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,"0")).join("");
}
async function authenticatedLockSession(request: Request, db: D1Database) {
  const digest = await sessionDigest(request);
  if (!digest) return null;
  return db.prepare("SELECT sessions.id, admins.name FROM sessions JOIN admins ON sessions.admin_id = admins.id WHERE sessions.id = ? AND sessions.expires_at > ? AND admins.active = 1").bind(digest,new Date().toISOString()).first<{id:string;name:string}>();
}
async function handleEditLock(request:Request,db:D1Database):Promise<Response> {
  const session=await authenticatedLockSession(request,db);
  if (!session) return Response.json({error:"Session administrateur requise."},{status:401});
  const now=Date.now(), until=now+LOCK_TTL_MS;
  if(request.method==="DELETE"){
    await db.prepare("DELETE FROM cms_edit_lock WHERE id=1 AND session_id=?").bind(session.id).run();
    return Response.json({released:true});
  }
  if(request.method==="POST"){
    await db.prepare("INSERT INTO cms_edit_lock(id,session_id,holder_name,expires_at) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET session_id=excluded.session_id,holder_name=excluded.holder_name,expires_at=excluded.expires_at WHERE cms_edit_lock.session_id=excluded.session_id OR cms_edit_lock.expires_at < ?").bind(session.id,session.name,until,now).run();
  }
  const current=await db.prepare("SELECT session_id,holder_name,expires_at FROM cms_edit_lock WHERE id=1").first<{session_id:string;holder_name:string;expires_at:number}>();
  const owned=Boolean(current && current.session_id===session.id && current.expires_at>now);
  return Response.json({owned,holder:owned?null:current?.expires_at && current.expires_at>now ? current.holder_name : null,expires_at:current?.expires_at||null},{status:owned?200:423,headers:{"Cache-Control":"no-store"}});
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // An exclusive, renewable server-side lease protects every CMS mutation.
    if (url.pathname === "/api/admin/edit-lock") {
      try { return withSecurityHeaders(await handleEditLock(request,env.DB)); }
      catch { return Response.json({error:"Verrou CMS indisponible."},{status:503}); }
    }
    if (url.pathname.startsWith("/api/admin/") && !["GET","HEAD","OPTIONS"].includes(request.method)
        && !["/api/admin/session","/api/admin/password-reset"].includes(url.pathname)) {
      try {
        const session=await authenticatedLockSession(request,env.DB);
        if (!session) return Response.json({error:"Authentification administrateur requise."},{status:401});
        const lock=await env.DB.prepare("SELECT session_id,expires_at,holder_name FROM cms_edit_lock WHERE id=1").first<{session_id:string;expires_at:number;holder_name:string}>();
        if (!lock || lock.session_id!==session.id || lock.expires_at<=Date.now())
          return Response.json({error:"CMS verrouillé : une autre session détient l'accès en écriture. Aucune modification enregistrée.",holder:lock?.expires_at && lock.expires_at>Date.now()?lock.holder_name:null},{status:423});
      } catch { return Response.json({error:"Impossible de vérifier le verrou CMS. Modification refusée."},{status:503}); }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const imageResponse = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return withSecurityHeaders(imageResponse);
    }

    const response = await handler.fetch(request, env, ctx);

    // Le CMS/catalogue est piloté par D1 et peut changer sans changement d'URL.
    // Les documents HTML et les réponses API doivent donc être revalidés par le navigateur
    // afin qu'un client qui garde un onglet ouvert ne reste pas sur une ancienne version.
    const pathname = url.pathname;
    const isApi = pathname.startsWith("/api/");
    const isHtml = response.headers.get("content-type")?.includes("text/html") ?? false;
    if (isApi || isHtml) {
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      headers.set("CDN-Cache-Control", "no-store");
      return withSecurityHeaders(new Response(response.body, { status: response.status, statusText: response.statusText, headers }));
    }

    return withSecurityHeaders(response);
  },
};

export default worker;
