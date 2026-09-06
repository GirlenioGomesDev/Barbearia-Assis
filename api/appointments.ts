import { createAppointment, occupiedTimes } from "../src/lib/server/appointment-storage";
import { assertCustomerCanBook } from "../src/lib/server/customer-appointment-policy";
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
      const serviceIds = Array.isArray(body.serviceIds)
        ? body.serviceIds.map((value) => String(value)).filter(Boolean)
        : [];
      const customerPhone = String(body.customerPhone || "");
      const date = String(body.date || "");
      await assertCustomerCanBook(customerPhone, date);
      const appointment = await createAppointment({
        customerName: String(body.customerName || ""),
        customerPhone,
        serviceId: String(body.serviceId || ""),
        serviceIds,
        barberId: String(body.barberId || ""),
        date,
        time: String(body.time || ""),
        notes: String(body.notes || ""),
      });
      const { accessCode: _accessCode, ...publicAppointment } = appointment;
      return jsonResponse({ appointment: publicAppointment }, { status: 201 });
    }
    return methodNotAllowed(["GET", "POST"]);
  } catch (error) {
    return errorResponse(error, "Nao foi possivel registrar o agendamento.");
  }
}
