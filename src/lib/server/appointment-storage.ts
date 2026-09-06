import { randomUUID } from "node:crypto";
import {
  ACTIVE_APPOINTMENT_STATUSES,
  intervalsOverlap,
  minutesFromTime,
  timeFromMinutes,
  type Appointment,
  type AppointmentDraft,
  type AppointmentStatus,
  type BlockedSlot,
} from "../appointments";
import { getAvailableDates, getAvailableTimes } from "../schedule";
import { isoDate } from "../format";
import { readPublicConfig } from "./cloudflare-storage";
import { runtimeEnv, type SiteD1 } from "./runtime-env";

const APPOINTMENTS_KEY = "appointments:v1";
const BLOCKS_KEY = "appointment-blocks:v1";
const KV_MIGRATION_KEY = "kv_migrated_v1";
const SLOT_STEP_MINUTES = 5;

type AppointmentRow = {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_id: string;
  service_name: string;
  barber_id: string;
  barber_name: string;
  date: string;
  time: string;
  duration_minutes: number;
  price: number;
  notes: string;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
};

type BlockRow = {
  id: string;
  barber_id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
  created_at: string;
};

function appointmentFromRow(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    serviceId: row.service_id,
    serviceIds: row.service_id.split(",").filter(Boolean),
    serviceName: row.service_name,
    barberId: row.barber_id,
    barberName: row.barber_name,
    date: row.date,
    time: row.time,
    durationMinutes: Number(row.duration_minutes),
    price: Number(row.price),
    notes: row.notes || "",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function blockFromRow(row: BlockRow): BlockedSlot {
  return {
    id: row.id,
    barberId: row.barber_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    reason: row.reason || "",
    createdAt: row.created_at,
  };
}

function slotTimes(startTime: string, durationMinutes: number) {
  const start = minutesFromTime(startTime);
  const end = start + durationMinutes;
  const slots: string[] = [];
  for (let cursor = start; cursor < end; cursor += SLOT_STEP_MINUTES) {
    slots.push(timeFromMinutes(cursor));
  }
  return slots;
}

function blockSlotTimes(startTime: string, endTime: string) {
  return slotTimes(startTime, minutesFromTime(endTime) - minutesFromTime(startTime));
}

function accessCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function readKvList<T>(key: string): Promise<T[]> {
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

async function writeKvList<T>(key: string, value: T[]) {
  const storage = runtimeEnv().SITE_CONFIG;
  if (!storage) throw namedError("StorageUnavailable", "A agenda online nao esta configurada.");
  await storage.put(key, JSON.stringify(value));
}

async function migrateLegacyKvIfNeeded(db: SiteD1) {
  const marker = await db.prepare("SELECT value FROM app_meta WHERE key = ?").bind(KV_MIGRATION_KEY).first();
  if (marker) return;

  const storage = runtimeEnv().SITE_CONFIG;
  if (storage) {
    const [appointments, blocks] = await Promise.all([
      readKvList<Appointment>(APPOINTMENTS_KEY),
      readKvList<BlockedSlot>(BLOCKS_KEY),
    ]);

    for (const item of appointments) {
      await db.prepare(
        `INSERT OR IGNORE INTO appointments
        (id, customer_name, customer_phone, service_id, service_name, barber_id, barber_name, date, time, duration_minutes, price, notes, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        item.id,
        item.customerName,
        item.customerPhone,
        item.serviceId,
        item.serviceName,
        item.barberId,
        item.barberName,
        item.date,
        item.time,
        item.durationMinutes,
        item.price,
        item.notes,
        item.status,
        item.createdAt,
        item.updatedAt,
      ).run();

      if (ACTIVE_APPOINTMENT_STATUSES.includes(item.status)) {
        for (const slot of slotTimes(item.time, item.durationMinutes)) {
          await db.prepare(
            "INSERT OR IGNORE INTO booking_slots (barber_id, date, slot, owner_type, owner_id) VALUES (?, ?, ?, 'appointment', ?)",
          ).bind(item.barberId, item.date, slot, item.id).run();
        }
      }
    }

    for (const item of blocks) {
      await db.prepare(
        `INSERT OR IGNORE INTO blocked_slots
        (id, barber_id, date, start_time, end_time, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(item.id, item.barberId, item.date, item.startTime, item.endTime, item.reason, item.createdAt).run();

      for (const slot of blockSlotTimes(item.startTime, item.endTime)) {
        await db.prepare(
          "INSERT OR IGNORE INTO booking_slots (barber_id, date, slot, owner_type, owner_id) VALUES (?, ?, ?, 'block', ?)",
        ).bind(item.barberId, item.date, slot, item.id).run();
      }
    }
  }

  await db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)")
    .bind(KV_MIGRATION_KEY, new Date().toISOString())
    .run();
}

async function d1() {
  const db = runtimeEnv().APPOINTMENTS_DB;
  if (!db) return null;
  await migrateLegacyKvIfNeeded(db);
  return db;
}

export async function listAppointments() {
  const db = await d1();
  if (!db) return readKvList<Appointment>(APPOINTMENTS_KEY);
  const result = await db.prepare("SELECT * FROM appointments ORDER BY date DESC, time DESC").all<AppointmentRow>();
  return (result.results || []).map(appointmentFromRow);
}

export async function findCustomerAppointments(phone: string, code: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || !/^\d{6}$/.test(code)) {
    throw namedError("ValidationError", "Informe WhatsApp e codigo de 6 digitos.");
  }

  const db = await d1();
  if (!db) {
    const appointments = await listAppointments();
    return appointments.filter(
      (item) => item.customerPhone.replace(/\D/g, "").endsWith(digits.slice(-11)) && item.accessCode === code,
    );
  }

  const result = await db.prepare(
    `SELECT a.* FROM appointments a
     INNER JOIN appointment_access x ON x.appointment_id = a.id
     WHERE a.customer_phone LIKE ? AND x.access_code = ?
     ORDER BY a.date DESC, a.time DESC`,
  ).bind(`%${digits.slice(-11)}`, code).all<AppointmentRow>();
  return (result.results || []).map(appointmentFromRow);
}

export async function listBlockedSlots() {
  const db = await d1();
  if (!db) return readKvList<BlockedSlot>(BLOCKS_KEY);
  const result = await db.prepare("SELECT * FROM blocked_slots ORDER BY date DESC, start_time DESC").all<BlockRow>();
  return (result.results || []).map(blockFromRow);
}

export async function occupiedTimes(barberId: string, date: string) {
  const db = await d1();
  if (!db) {
    const [appointments, blocks] = await Promise.all([listAppointments(), listBlockedSlots()]);
    return {
      appointments: appointments.filter(
        (item) => item.barberId === barberId && item.date === date && ACTIVE_APPOINTMENT_STATUSES.includes(item.status),
      ),
      blocks: blocks.filter((item) => item.barberId === barberId && item.date === date),
    };
  }

  const [appointmentsResult, blocksResult] = await Promise.all([
    db.prepare(
      "SELECT * FROM appointments WHERE barber_id = ? AND date = ? AND status IN ('scheduled','confirmed') ORDER BY time",
    ).bind(barberId, date).all<AppointmentRow>(),
    db.prepare("SELECT * FROM blocked_slots WHERE barber_id = ? AND date = ? ORDER BY start_time")
      .bind(barberId, date).all<BlockRow>(),
  ]);

  return {
    appointments: (appointmentsResult.results || []).map(appointmentFromRow),
    blocks: (blocksResult.results || []).map(blockFromRow),
  };
}

export async function createAppointment(draft: AppointmentDraft) {
  const { config } = await readPublicConfig();
  const requestedIds = [...new Set((draft.serviceIds?.length ? draft.serviceIds : [draft.serviceId || ""]).filter(Boolean))];
  const services = requestedIds
    .map((id) => config.services.find((item) => item.id === id && item.active))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const barber = config.barbers.find((item) => item.id === draft.barberId && item.active);

  if (!requestedIds.length || services.length !== requestedIds.length || !barber || services.some((service) => !barber.serviceIds.includes(service.id))) {
    throw namedError("ValidationError", "Servico ou barbeiro indisponivel.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !/^\d{2}:\d{2}$/.test(draft.time)) {
    throw namedError("ValidationError", "Data ou horario invalido.");
  }
  if (draft.customerName.trim().length < 2 || draft.customerPhone.replace(/\D/g, "").length < 10) {
    throw namedError("ValidationError", "Informe nome e WhatsApp validos.");
  }

  const totalDuration = services.reduce((sum, item) => sum + item.durationMinutes, 0);
  const totalPrice = services.reduce((sum, item) => sum + item.price, 0);
  const aggregateService = { ...services[0]!, durationMinutes: totalDuration };

  const validDates = getAvailableDates({
    barber,
    futureDays: config.booking.futureDays,
    blockedDates: config.booking.blockedDates,
  }).map(isoDate);
  if (!validDates.includes(draft.date)) {
    throw namedError("AppointmentConflict", "Essa data nao esta mais disponivel.");
  }
  const validTimes = getAvailableTimes({
    barber,
    service: aggregateService,
    date: draft.date,
    minAdvanceMinutes: config.booking.minAdvanceMinutes,
  });
  if (!validTimes.includes(draft.time)) {
    throw namedError("AppointmentConflict", "Esse horario nao esta mais disponivel.");
  }

  const now = new Date().toISOString();
  const code = accessCode();
  const appointment: Appointment = {
    id: randomUUID(),
    customerName: draft.customerName.trim(),
    customerPhone: draft.customerPhone.replace(/\D/g, ""),
    serviceId: requestedIds.join(","),
    serviceIds: requestedIds,
    serviceName: services.map((item) => item.name).join(" + "),
    barberId: barber.id,
    barberName: barber.name,
    date: draft.date,
    time: draft.time,
    durationMinutes: totalDuration,
    price: totalPrice,
    notes: draft.notes.trim().slice(0, 500),
    status: "scheduled",
    accessCode: code,
    createdAt: now,
    updatedAt: now,
  };

  const db = await d1();
  if (!db) {
    const appointments = await listAppointments();
    const blocks = await listBlockedSlots();
    const conflict = appointments.some(
      (item) => item.barberId === barber.id && item.date === draft.date && ACTIVE_APPOINTMENT_STATUSES.includes(item.status) && intervalsOverlap(draft.time, totalDuration, item.time, item.durationMinutes),
    );
    const blocked = blocks.some((item) => {
      if (item.barberId !== barber.id || item.date !== draft.date) return false;
      const start = minutesFromTime(item.startTime);
      const end = minutesFromTime(item.endTime);
      const requestedStart = minutesFromTime(draft.time);
      return requestedStart < end && start < requestedStart + totalDuration;
    });
    if (conflict || blocked) throw namedError("AppointmentConflict", "Esse horario acabou de ficar indisponivel. Escolha outro horario.");
    await writeKvList(APPOINTMENTS_KEY, [...appointments, appointment]);
    return appointment;
  }

  const statements = [
    db.prepare(
      `INSERT INTO appointments
      (id, customer_name, customer_phone, service_id, service_name, barber_id, barber_name, date, time, duration_minutes, price, notes, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      appointment.id,
      appointment.customerName,
      appointment.customerPhone,
      appointment.serviceId,
      appointment.serviceName,
      appointment.barberId,
      appointment.barberName,
      appointment.date,
      appointment.time,
      appointment.durationMinutes,
      appointment.price,
      appointment.notes,
      appointment.status,
      appointment.createdAt,
      appointment.updatedAt,
    ),
    db.prepare("INSERT INTO appointment_access (appointment_id, access_code, created_at) VALUES (?, ?, ?)")
      .bind(appointment.id, code, now),
    ...slotTimes(appointment.time, appointment.durationMinutes).map((slot) =>
      db.prepare(
        "INSERT INTO booking_slots (barber_id, date, slot, owner_type, owner_id) VALUES (?, ?, ?, 'appointment', ?)",
      ).bind(appointment.barberId, appointment.date, slot, appointment.id),
    ),
  ];

  try {
    await db.batch(statements);
    return appointment;
  } catch {
    throw namedError("AppointmentConflict", "Esse horario acabou de ficar indisponivel. Escolha outro horario.");
  }
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const allowed: AppointmentStatus[] = ["scheduled", "confirmed", "completed", "cancelled", "no_show"];
  if (!allowed.includes(status)) throw namedError("ValidationError", "Status invalido.");

  const db = await d1();
  if (!db) {
    const appointments = await listAppointments();
    const index = appointments.findIndex((item) => item.id === id);
    if (index < 0) throw namedError("NotFound", "Agendamento nao encontrado.");
    appointments[index] = { ...appointments[index], status, updatedAt: new Date().toISOString() };
    await writeKvList(APPOINTMENTS_KEY, appointments);
    return appointments[index];
  }

  const row = await db.prepare("SELECT * FROM appointments WHERE id = ?").bind(id).first<AppointmentRow>();
  if (!row) throw namedError("NotFound", "Agendamento nao encontrado.");
  const appointment = appointmentFromRow(row);
  const wasActive = ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status);
  const willBeActive = ACTIVE_APPOINTMENT_STATUSES.includes(status);
  const updatedAt = new Date().toISOString();

  const statements = [
    db.prepare("UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?").bind(status, updatedAt, id),
  ];

  if (wasActive && !willBeActive) {
    statements.push(db.prepare("DELETE FROM booking_slots WHERE owner_type = 'appointment' AND owner_id = ?").bind(id));
  } else if (!wasActive && willBeActive) {
    statements.push(
      ...slotTimes(appointment.time, appointment.durationMinutes).map((slot) =>
        db.prepare(
          "INSERT INTO booking_slots (barber_id, date, slot, owner_type, owner_id) VALUES (?, ?, ?, 'appointment', ?)",
        ).bind(appointment.barberId, appointment.date, slot, id),
      ),
    );
  }

  try {
    await db.batch(statements);
  } catch {
    throw namedError("AppointmentConflict", "Nao foi possivel reativar: o horario esta ocupado.");
  }

  return { ...appointment, status, updatedAt };
}

export async function createBlockedSlot(input: Omit<BlockedSlot, "id" | "createdAt">) {
  if (!input.barberId || !input.date || !input.startTime || !input.endTime) {
    throw namedError("ValidationError", "Preencha o periodo que deseja bloquear.");
  }
  if (minutesFromTime(input.startTime) >= minutesFromTime(input.endTime)) {
    throw namedError("ValidationError", "O fim do bloqueio precisa ser depois do inicio.");
  }

  const block: BlockedSlot = {
    ...input,
    reason: input.reason.trim().slice(0, 120),
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  const db = await d1();
  if (!db) {
    const blocks = await listBlockedSlots();
    await writeKvList(BLOCKS_KEY, [...blocks, block]);
    return block;
  }

  const statements = [
    db.prepare(
      "INSERT INTO blocked_slots (id, barber_id, date, start_time, end_time, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(block.id, block.barberId, block.date, block.startTime, block.endTime, block.reason, block.createdAt),
    ...blockSlotTimes(block.startTime, block.endTime).map((slot) =>
      db.prepare(
        "INSERT INTO booking_slots (barber_id, date, slot, owner_type, owner_id) VALUES (?, ?, ?, 'block', ?)",
      ).bind(block.barberId, block.date, slot, block.id),
    ),
  ];

  try {
    await db.batch(statements);
    return block;
  } catch {
    throw namedError("AppointmentConflict", "Esse periodo possui um agendamento ou bloqueio.");
  }
}

export async function deleteBlockedSlot(id: string) {
  const db = await d1();
  if (!db) {
    const blocks = await listBlockedSlots();
    await writeKvList(BLOCKS_KEY, blocks.filter((item) => item.id !== id));
    return;
  }

  await db.batch([
    db.prepare("DELETE FROM booking_slots WHERE owner_type = 'block' AND owner_id = ?").bind(id),
    db.prepare("DELETE FROM blocked_slots WHERE id = ?").bind(id),
  ]);
}

function namedError(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}
