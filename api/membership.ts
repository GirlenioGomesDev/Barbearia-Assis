import { errorResponse, jsonResponse, methodNotAllowed } from "../src/lib/server/http-auth";
import { lookupMembership } from "../src/lib/server/membership-storage";

export default async function handler(request: Request) {
  try {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const membership = await lookupMembership(String(body.phone || ""));
    return jsonResponse({ membership });
  } catch (error) {
    return errorResponse(error, "Nao foi possivel consultar seu plano.");
  }
}
