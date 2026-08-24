import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

register(`data:text/javascript,${encodeURIComponent(`export async function resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") return { url: "data:text/javascript,export const env = {}", shortCircuit: true };
  return nextResolve(specifier, context);
}`)}`, import.meta.url);

test("renders the storefront with Québec and Conakry market controls", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /<title>Envol des Enfants<\/title>/);
  assert.match(html, /class="market-switch"/);
  assert.match(html, />Québec<\/button>/);
  assert.match(html, />Conakry<\/button>/);
  assert.match(html, /Mon monde de poupées/);
});
