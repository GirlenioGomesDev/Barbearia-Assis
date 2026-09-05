import { readPublicConfig } from "../../src/lib/server/cloudflare-storage";
import {
  assertAuthConfigured,
  createHttpSessionHeaders,
  devCsrfToken,
  isAdminAuthDisabled,
  jsonResponse,
  methodNotAllowed,
  verifyHttpPassword,
} from "../../src/lib/server/http-auth";

export default async function handler(request: Request) {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  try {
    if (isAdminAuthDisabled()) {
      const { config, source } = await readPublicConfig();
      return jsonResponse({ csrfToken: devCsrfToken(), config, source });
    }
    assertAuthConfigured();
    const body = (await request.json().catch(() => ({}))) as { password?: string };
    const ok = Boolean(body.password && verifyHttpPassword(body.password));
    if (!ok) return jsonResponse({ message: "Senha incorreta." }, { status: 401 });
    const { headers, csrf } = createHttpSessionHeaders();
    const { config, source } = await readPublicConfig();
    return jsonResponse({ csrfToken: csrf, config, source }, { headers });
  } catch (error) {
    const status = error instanceof Error && error.name === "EnvironmentError" ? 503 : 500;
    const message =
      status === 503 && error instanceof Error
        ? error.message
        : "Não foi possível entrar. Tente novamente.";
    return jsonResponse({ message }, { status });
  }
}
