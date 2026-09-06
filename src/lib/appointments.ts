export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type Appointment = {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  barberId: string;
  barberName: string;
  date: string;
  time: string;
  durationMinutes: number;
  price: number;
  notes: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentDraft = Pick<
  Appointment,
  | "customerName"
  | "customerPhone"
  | "serviceId"
  | "barberId"
  | "date"
  | "time"
  | "notes"
>;

export type BlockedSlot = {
  id: string;
  barberId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  createdAt: string;
};

export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ["scheduled", "confirmed"];

export function statusLabel(status: AppointmentStatus) {
  return {
    scheduled: "Agendado",
    confirmed: "Confirmado",
    completed: "Concluido",
    cancelled: "Cancelado",
    no_show: "Nao compareceu",
  }[status];
}

export function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function timeFromMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function intervalsOverlap(
  startA: string,
  durationA: number,
  startB: string,
  durationB: number,
) {
  const a = minutesFromTime(startA);
  const b = minutesFromTime(startB);
  return a < b + durationB && b < a + durationA;
}
