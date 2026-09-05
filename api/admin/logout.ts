import {
  clearHttpSessionHeaders,
  jsonResponse,
  methodNotAllowed,
  requireHttpCsrf,
} from "../../src/lib/server/http-auth";

export default async function handler(request: Request) {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  try {
    requireHttpCsrf(request);
    return jsonResponse({ ok: true }, { headers: clearHttpSessionHeaders() });
  } catch {
    return jsonResponse({ message: "Não autorizado." }, { status: 401 });
  }
}
