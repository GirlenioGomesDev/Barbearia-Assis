import {
  assertLoginAllowed,
  readPublicConfig,
  registerLoginAttempt,
} from "../lib/server/cloudflare-storage";
import {
  assertAuthConfigured,
  createHttpSessionHeaders,
  devCsrfToken,
  isAdminAuthDisabled,
  jsonResponse,
  methodNotAllowed,
  verifyHttpPassword,
} from "../lib/server/http-auth";

export default async function loginHandler(request: Request) {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  try {
    if (isAdminAuthDisabled()) {
      const { config, source } = await readPublicConfig();
      return jsonResponse({ csrfToken: devCsrfToken(), config, source });
    }
    assertAuthConfigured();
    const attemptKey = await assertLoginAllowed(request);
    const body = (await request.json().catch(() => ({}))) as { password?: string };
    const ok = Boolean(body.password && verifyHttpPassword(body.password));
    await registerLoginAttempt(attemptKey, ok);
    if (!ok) return jsonResponse({ message: "Senha incorreta." }, { status: 401 });
    const { headers, csrf } = createHttpSessionHeaders();
    const { config, source } = await readPublicConfig();
    return jsonResponse({ csrfToken: csrf, config, source }, { headers });
  } catch (error) {
    const status =
      error instanceof Error && error.name === "EnvironmentError"
        ? 503
        : error instanceof Error && error.name === "RateLimit"
          ? 429
          : 500;
    const message =
      (status === 503 || status === 429) && error instanceof Error
        ? error.message
        : "Não foi possível entrar. Tente novamente.";
    return jsonResponse({ message }, { status });
  }
}
