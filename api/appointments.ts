import { createAppointment, occupiedTimes } from "../src/lib/server/appointment-storage";
import { errorResponse, jsonResponse, methodNotAllowed } from "../src/lib/server/http-auth";

export default async function handler(request: Request) {
  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const barberId = url.searchParams.get("barberId") || "";
      const date = url.searchParams.get("date") || "";
      if (!barberId || !date) return jsonResponse({ appointments: [], blocks: [] });
      const occupied = await occupiedTimes(barberId, date);
      return jsonResponse(occupied);
    }
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
    return methodNotAllowed(["GET", "POST"]);
  } catch (error) {
    return errorResponse(error, "Nao foi possivel registrar o agendamento.");
  }
}
