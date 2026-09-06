import { findCustomerAppointmentsByPhone } from "../../src/lib/server/customer-appointment-policy";
import { errorResponse, jsonResponse, methodNotAllowed } from "../../src/lib/server/http-auth";

export default async function handler(request: Request) {
  try {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const appointments = await findCustomerAppointmentsByPhone(String(body.phone || ""));
    return jsonResponse({ appointments });
  } catch (error) {
    return errorResponse(error, "Nao foi possivel consultar seu agendamento.");
  }
}
