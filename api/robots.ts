import { robots } from "../src/lib/seo";
import { readPublicConfig } from "../src/lib/server/cloudflare-storage";
import { methodNotAllowed } from "../src/lib/server/http-auth";

export default async function handler(request: Request) {
  if (request.method !== "GET") return methodNotAllowed(["GET"]);
  const { config } = await readPublicConfig();
  return new Response(robots(config), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
