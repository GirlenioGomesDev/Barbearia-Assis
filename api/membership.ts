import { errorResponse, jsonResponse, methodNotAllowed } from "../src/lib/server/http-auth";
import { listMemberships } from "../src/lib/server/membership-storage";

function namedError(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}

export default async function handler(request: Request) {
  try {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const phone = String(body.phone || "").replace(/\D/g, "");
    if (phone.length < 10) throw namedError("ValidationError", "Informe um WhatsApp valido.");

    const memberships = await listMemberships();
    const membership = memberships.find((item) => item.customerPhone.replace(/\D/g, "") === phone);
    if (!membership) throw namedError("NotFound", "Plano nao encontrado para esse WhatsApp.");

    const { accessCode: _accessCode, ...publicMembership } = membership;
    return jsonResponse({ membership: publicMembership });
  } catch (error) {
    return errorResponse(error, "Nao foi possivel consultar seu plano.");
  }
}
