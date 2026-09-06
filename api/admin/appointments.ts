import {
  createAppointment,
  listAppointments,
  updateAppointmentStatus,
} from "../../src/lib/server/appointment-storage";
import {
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  requireHttpAdmin,
  requireHttpCsrf,
} from "../../src/lib/server/http-auth";
import type { AppointmentStatus } from "../../src/lib/appointments";

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      requireHttpAdmin(request);
      return jsonResponse({ appointments: await listAppointments() });
    }
    requireHttpCsrf(request);
    if (request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const appointment = await createAppointment({
        customerName: String(body.customerName || ""),
        customerPhone: String(body.customerPhone || ""),
        serviceId: String(body.serviceId || ""),
        barberId: String(body.barberId || ""),
        date: String(body.date || ""),
        time: String(body.time || ""),
        notes: String(body.notes || ""),
      });
      return jsonResponse({ appointment }, { status: 201 });
    }
    if (request.method === "PATCH") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const appointment = await updateAppointmentStatus(
        String(body.id || ""),
        String(body.status || "") as AppointmentStatus,
      );
      return jsonResponse({ appointment });
    }
    return methodNotAllowed(["GET", "POST", "PATCH"]);
  } catch (error) {
    return errorResponse(error, "Nao foi possivel atualizar a agenda.");
  }
}
