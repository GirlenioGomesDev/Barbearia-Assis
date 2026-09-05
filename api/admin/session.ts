import { readPublicConfig } from "../../src/lib/server/cloudflare-storage";
import {
  getHttpSession,
  isAdminAuthDisabled,
  jsonResponse,
  methodNotAllowed,
} from "../../src/lib/server/http-auth";

export default async function handler(request: Request) {
  if (request.method !== "GET") return methodNotAllowed(["GET"]);
  const session = getHttpSession(request);
  if (!session) return jsonResponse({ authenticated: false }, { status: 401 });
  const { config, source } = await readPublicConfig();
  return jsonResponse({
    authenticated: true,
    csrfToken: session.csrf,
    authDisabled: isAdminAuthDisabled(),
    config,
    source,
  });
}
