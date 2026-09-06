import {
  createBlockedSlot,
  deleteBlockedSlot,
  listBlockedSlots,
} from "../../src/lib/server/appointment-storage";
import {
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  requireHttpAdmin,
  requireHttpCsrf,
} from "../../src/lib/server/http-auth";

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      requireHttpAdmin(request);
      return jsonResponse({ blocks: await listBlockedSlots() });
    }
    requireHttpCsrf(request);
    if (request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const block = await createBlockedSlot({
        barberId: String(body.barberId || ""),
        date: String(body.date || ""),
        startTime: String(body.startTime || ""),
        endTime: String(body.endTime || ""),
        reason: String(body.reason || ""),
      });
      return jsonResponse({ block }, { status: 201 });
    }
    if (request.method === "DELETE") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      await deleteBlockedSlot(String(body.id || ""));
      return jsonResponse({ ok: true });
    }
    return methodNotAllowed(["GET", "POST", "DELETE"]);
  } catch (error) {
    return errorResponse(error, "Nao foi possivel atualizar os bloqueios.");
  }
}
