import { randomUUID } from "node:crypto";
import {
  ACTIVE_APPOINTMENT_STATUSES,
  intervalsOverlap,
  minutesFromTime,
  type Appointment,
  type AppointmentDraft,
  type AppointmentStatus,
  type BlockedSlot,
} from "../appointments";
import { readPublicConfig } from "./cloudflare-storage";
import { runtimeEnv } from "./runtime-env";

const APPOINTMENTS_KEY = "appointments:v1";
const BLOCKS_KEY = "appointment-blocks:v1";

async function readList<T>(key: string): Promise<T[]> {
  const storage = runtimeEnv().SITE_CONFIG;
  if (!storage) throw namedError("StorageUnavailable", "A agenda online nao esta configurada.");
  const value = await storage.get(key);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeList<T>(key: string, value: T[]) {
  const storage = runtimeEnv().SITE_CONFIG;
  if (!storage) throw namedError("StorageUnavailable", "A agenda online nao esta configurada.");
  await storage.put(key, JSON.stringify(value));
}

export async function listAppointments() {
  return readList<Appointment>(APPOINTMENTS_KEY);
}

export async function listBlockedSlots() {
  return readList<BlockedSlot>(BLOCKS_KEY);
}

export async function occupiedTimes(barberId: string, date: string) {
  const [appointments, blocks] = await Promise.all([listAppointments(), listBlockedSlots()]);
  return {
    appointments: appointments.filter(
      (item) =>
        item.barberId === barberId &&
        item.date === date &&
        ACTIVE_APPOINTMENT_STATUSES.includes(item.status),
    ),
    blocks: blocks.filter((item) => item.barberId === barberId && item.date === date),
  };
}

export async function createAppointment(draft: AppointmentDraft) {
  const { config } = await readPublicConfig();
  const service = config.services.find((item) => item.id === draft.serviceId && item.active);
  const barber = config.barbers.find((item) => item.id === draft.barberId && item.active);
  if (!service || !barber || !barber.serviceIds.includes(service.id)) {
    throw namedError("ValidationError", "Servico ou barbeiro indisponivel.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !/^\d{2}:\d{2}$/.test(draft.time)) {
    throw namedError("ValidationError", "Data ou horario invalido.");
  }
  if (draft.customerName.trim().length < 2 || draft.customerPhone.replace(/\D/g, "").length < 10) {
    throw namedError("ValidationError", "Informe nome e WhatsApp validos.");
  }

  const appointments = await listAppointments();
  const blocks = await listBlockedSlots();
  const conflict = appointments.some(
    (item) =>
      item.barberId === barber.id &&
      item.date === draft.date &&
      ACTIVE_APPOINTMENT_STATUSES.includes(item.status) &&
      intervalsOverlap(draft.time, service.durationMinutes, item.time, item.durationMinutes),
  );
  const blocked = blocks.some((item) => {
    if (item.barberId !== barber.id || item.date !== draft.date) return false;
    const start = minutesFromTime(item.startTime);
    const end = minutesFromTime(item.endTime);
    const requestedStart = minutesFromTime(draft.time);
    return requestedStart < end && start < requestedStart + service.durationMinutes;
  });
  if (conflict || blocked) {
    throw namedError("AppointmentConflict", "Esse horario acabou de ficar indisponivel. Escolha outro horario.");
  }

  const now = new Date().toISOString();
  const appointment: Appointment = {
    id: randomUUID(),
    customerName: draft.customerName.trim(),
    customerPhone: draft.customerPhone.replace(/\D/g, ""),
    serviceId: service.id,
    serviceName: service.name,
    barberId: barber.id,
    barberName: barber.name,
    date: draft.date,
    time: draft.time,
    durationMinutes: service.durationMinutes,
    price: service.price,
    notes: draft.notes.trim().slice(0, 500),
    status: "scheduled",
    createdAt: now,
    updatedAt: now,
  };
  await writeList(APPOINTMENTS_KEY, [...appointments, appointment]);
  return appointment;
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const allowed: AppointmentStatus[] = ["scheduled", "confirmed", "completed", "cancelled", "no_show"];
  if (!allowed.includes(status)) throw namedError("ValidationError", "Status invalido.");
  const appointments = await listAppointments();
  const index = appointments.findIndex((item) => item.id === id);
  if (index < 0) throw namedError("NotFound", "Agendamento nao encontrado.");
  appointments[index] = { ...appointments[index], status, updatedAt: new Date().toISOString() };
  await writeList(APPOINTMENTS_KEY, appointments);
  return appointments[index];
}

export async function createBlockedSlot(input: Omit<BlockedSlot, "id" | "createdAt">) {
  if (!input.barberId || !input.date || !input.startTime || !input.endTime) {
    throw namedError("ValidationError", "Preencha o periodo que deseja bloquear.");
  }
  if (minutesFromTime(input.startTime) >= minutesFromTime(input.endTime)) {
    throw namedError("ValidationError", "O fim do bloqueio precisa ser depois do inicio.");
  }
  const blocks = await listBlockedSlots();
  const block: BlockedSlot = {
    ...input,
    reason: input.reason.trim().slice(0, 120),
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await writeList(BLOCKS_KEY, [...blocks, block]);
  return block;
}

export async function deleteBlockedSlot(id: string) {
  const blocks = await listBlockedSlots();
  await writeList(
    BLOCKS_KEY,
    blocks.filter((item) => item.id !== id),
  );
}

function namedError(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}
