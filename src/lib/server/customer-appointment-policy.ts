import type { Appointment } from "../appointments";
import { listAppointments } from "./appointment-storage";

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(-11);
}

function nextDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function shortDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export async function findCustomerAppointmentsByPhone(phone: string) {
  const digits = normalizePhone(phone);
  if (digits.length < 10) {
    throw namedError("ValidationError", "Informe um WhatsApp válido com DDD.");
  }

  const appointments = await listAppointments();
  return appointments
    .filter((item) => normalizePhone(item.customerPhone) === digits)
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}

export async function assertCustomerCanBook(phone: string, requestedDate: string) {
  const appointments = await findCustomerAppointmentsByPhone(phone);
  const relevant = appointments.filter((item) => item.status !== "cancelled");
  if (!relevant.length) return;

  const latest = relevant.reduce<Appointment>((current, item) =>
    item.date > current.date ? item : current,
  );
  const earliestAllowedDate = nextDate(latest.date);

  if (requestedDate < earliestAllowedDate) {
    throw namedError(
      "AppointmentConflict",
      `Você já possui um agendamento em ${shortDate(latest.date)}. Um novo agendamento só pode ser feito a partir de ${shortDate(earliestAllowedDate)}.`,
    );
  }
}

function namedError(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}
