import { readPublicConfig } from "../src/lib/server/cloudflare-storage";
import { jsonResponse, methodNotAllowed } from "../src/lib/server/http-auth";

export default async function handler(request: Request) {
  if (request.method !== "GET") return methodNotAllowed(["GET"]);
  return jsonResponse(await readPublicConfig());
}
