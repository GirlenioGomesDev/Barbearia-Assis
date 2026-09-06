import {
  addMembershipUsage,
  createMembership,
  listMemberships,
  setMembershipStatus,
} from "../../src/lib/server/membership-storage";
import {
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  requireHttpAdmin,
  requireHttpCsrf,
} from "../../src/lib/server/http-auth";
import type { MembershipStatus } from "../../src/lib/memberships";

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      requireHttpAdmin(request);
      return jsonResponse({ memberships: await listMemberships() });
    }

    requireHttpCsrf(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (request.method === "POST") {
      const membership = await createMembership({
        customerName: String(body.customerName || ""),
        customerPhone: String(body.customerPhone || ""),
        planId: String(body.planId || ""),
        totalVisits: Number(body.totalVisits || 0),
        startDate: String(body.startDate || ""),
        expiresDate: String(body.expiresDate || ""),
      });
      return jsonResponse({ membership }, { status: 201 });
    }

    if (request.method === "PATCH") {
      const action = String(body.action || "status");
      if (action === "use") {
        const membership = await addMembershipUsage({
          membershipId: String(body.membershipId || ""),
          serviceName: String(body.serviceName || "Atendimento do plano"),
          barberName: String(body.barberName || ""),
          usedAt: String(body.usedAt || ""),
          note: String(body.note || ""),
        });
        return jsonResponse({ membership });
      }
      const membership = await setMembershipStatus(
        String(body.membershipId || ""),
        String(body.status || "") as MembershipStatus,
      );
      return jsonResponse({ membership });
    }

    return methodNotAllowed(["GET", "POST", "PATCH"]);
  } catch (error) {
    return errorResponse(error, "Nao foi possivel atualizar os planos dos clientes.");
  }
}
