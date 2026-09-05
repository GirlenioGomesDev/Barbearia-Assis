import { sitemap } from "../src/lib/seo";
import { readPublicConfig } from "../src/lib/server/cloudflare-storage";
import { methodNotAllowed } from "../src/lib/server/http-auth";

export default async function handler(request: Request) {
  if (request.method !== "GET") return methodNotAllowed(["GET"]);
  const { config } = await readPublicConfig();
  return new Response(sitemap(config), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
