import { randomInt, randomUUID } from "node:crypto";
import type { Appointment } from "../appointments";
import type { Membership, MembershipStatus, MembershipUsage } from "../memberships";
import { readPublicConfig } from "./cloudflare-storage";
import { runtimeEnv } from "./runtime-env";

type MembershipRow = {
  id: string;
  customer_name: string;
  customer_phone: string;
  plan_id: string;
  plan_name: string;
  total_visits: number;
  access_code: string;
  start_date: string;
  expires_date: string | null;
  status: MembershipStatus;
  created_at: string;
  updated_at: string;
};

type UsageRow = {
  id: string;
  membership_id: string;
  appointment_id: string | null;
  service_name: string;
  barber_name: string;
  used_at: string;
  note: string;
  created_at: string;
};

function db() {
  const value = runtimeEnv().APPOINTMENTS_DB;
  if (!value) throw namedError("StorageUnavailable", "O banco dos planos ainda nao esta configurado.");
  return value;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function usageFromRow(row: UsageRow): MembershipUsage {
  return {
    id: row.id,
    membershipId: row.membership_id,
    appointmentId: row.appointment_id,
    serviceName: row.service_name,
    barberName: row.barber_name,
    usedAt: row.used_at,
    note: row.note || "",
    createdAt: row.created_at,
  };
}

async function membershipFromRow(row: MembershipRow): Promise<Membership> {
  const result = await db()
    .prepare("SELECT * FROM membership_usages WHERE membership_id = ? ORDER BY used_at DESC, created_at DESC")
    .bind(row.id)
    .all<UsageRow>();
  const usages = (result.results || []).map(usageFromRow);
  const usedVisits = usages.length;
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    planId: row.plan_id,
    planName: row.plan_name,
    totalVisits: Number(row.total_visits),
    usedVisits,
    remainingVisits: Math.max(0, Number(row.total_visits) - usedVisits),
    accessCode: row.access_code,
    startDate: row.start_date,
    expiresDate: row.expires_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    usages,
  };
}

export async function listMemberships() {
  const result = await db().prepare("SELECT * FROM memberships ORDER BY created_at DESC").all<MembershipRow>();
  return Promise.all((result.results || []).map(membershipFromRow));
}

export async function createMembership(input: {
  customerName: string;
  customerPhone: string;
  planId: string;
  totalVisits: number;
  startDate: string;
  expiresDate?: string;
}) {
  const { config } = await readPublicConfig();
  const plan = config.plans.find((item) => item.id === input.planId && item.active);
  if (!plan) throw namedError("ValidationError", "Selecione um plano ativo.");
  const phone = normalizePhone(input.customerPhone);
  if (input.customerName.trim().length < 2 || phone.length < 10) {
    throw namedError("ValidationError", "Informe nome e WhatsApp validos.");
  }
  if (!Number.isInteger(input.totalVisits) || input.totalVisits < 1 || input.totalVisits > 100) {
    throw namedError("ValidationError", "Informe uma quantidade de atendimentos entre 1 e 100.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) {
    throw namedError("ValidationError", "Data inicial invalida.");
  }
  if (input.expiresDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.expiresDate)) {
    throw namedError("ValidationError", "Validade invalida.");
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  let accessCode = String(randomInt(100000, 1000000));
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await db().prepare("SELECT id FROM memberships WHERE customer_phone = ? AND access_code = ?")
      .bind(phone, accessCode).first();
    if (!existing) break;
    accessCode = String(randomInt(100000, 1000000));
  }

  await db().prepare(
    `INSERT INTO memberships
    (id, customer_name, customer_phone, plan_id, plan_name, total_visits, access_code, start_date, expires_date, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
  ).bind(
    id,
    input.customerName.trim(),
    phone,
    plan.id,
    plan.name,
    input.totalVisits,
    accessCode,
    input.startDate,
    input.expiresDate || null,
    now,
    now,
  ).run();

  const row = await db().prepare("SELECT * FROM memberships WHERE id = ?").bind(id).first<MembershipRow>();
  if (!row) throw namedError("StorageUnavailable", "Nao foi possivel criar o plano do cliente.");
  return membershipFromRow(row);
}

export async function setMembershipStatus(id: string, status: MembershipStatus) {
  if (!["active", "finished", "cancelled"].includes(status)) {
    throw namedError("ValidationError", "Status do plano invalido.");
  }
  const now = new Date().toISOString();
  await db().prepare("UPDATE memberships SET status = ?, updated_at = ? WHERE id = ?").bind(status, now, id).run();
  const row = await db().prepare("SELECT * FROM memberships WHERE id = ?").bind(id).first<MembershipRow>();
  if (!row) throw namedError("NotFound", "Plano do cliente nao encontrado.");
  return membershipFromRow(row);
}

export async function addMembershipUsage(input: {
  membershipId: string;
  serviceName: string;
  barberName?: string;
  usedAt: string;
  note?: string;
  appointmentId?: string | null;
}) {
  const row = await db().prepare("SELECT * FROM memberships WHERE id = ?").bind(input.membershipId).first<MembershipRow>();
  if (!row) throw namedError("NotFound", "Plano do cliente nao encontrado.");
  const membership = await membershipFromRow(row);
  if (membership.status !== "active") throw namedError("ValidationError", "Esse plano nao esta ativo.");
  if (membership.remainingVisits <= 0) throw namedError("ValidationError", "Esse plano nao possui mais atendimentos disponiveis.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.usedAt)) throw namedError("ValidationError", "Data do atendimento invalida.");

  try {
    await db().prepare(
      `INSERT INTO membership_usages
      (id, membership_id, appointment_id, service_name, barber_name, used_at, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      randomUUID(),
      membership.id,
      input.appointmentId || null,
      input.serviceName.trim() || "Atendimento do plano",
      input.barberName?.trim() || "",
      input.usedAt,
      input.note?.trim().slice(0, 200) || "",
      new Date().toISOString(),
    ).run();
  } catch {
    if (input.appointmentId) return membership;
    throw namedError("ValidationError", "Esse atendimento ja foi registrado.");
  }

  const updated = await membershipFromRow(row);
  if (updated.remainingVisits === 0) {
    await db().prepare("UPDATE memberships SET status = 'finished', updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), membership.id).run();
    const finishedRow = await db().prepare("SELECT * FROM memberships WHERE id = ?").bind(membership.id).first<MembershipRow>();
    return finishedRow ? membershipFromRow(finishedRow) : updated;
  }
  return updated;
}

export async function lookupMembership(phoneInput: string, accessCodeInput: string) {
  const phone = normalizePhone(phoneInput);
  const accessCode = accessCodeInput.replace(/\D/g, "");
  if (phone.length < 10 || accessCode.length !== 6) {
    throw namedError("ValidationError", "Informe seu WhatsApp e o codigo de 6 digitos.");
  }
  const row = await db().prepare(
    "SELECT * FROM memberships WHERE customer_phone = ? AND access_code = ? ORDER BY created_at DESC LIMIT 1",
  ).bind(phone, accessCode).first<MembershipRow>();
  if (!row) throw namedError("NotFound", "Plano nao encontrado. Confira o WhatsApp e o codigo.");
  return membershipFromRow(row);
}

export async function recordUsageForCompletedAppointment(appointment: Appointment) {
  const phone = normalizePhone(appointment.customerPhone);
  const row = await db().prepare(
    `SELECT * FROM memberships
     WHERE customer_phone = ? AND status = 'active'
     AND start_date <= ? AND (expires_date IS NULL OR expires_date >= ?)
     ORDER BY created_at DESC LIMIT 1`,
  ).bind(phone, appointment.date, appointment.date).first<MembershipRow>();
  if (!row) return null;
  const membership = await membershipFromRow(row);
  if (membership.remainingVisits <= 0) return null;
  return addMembershipUsage({
    membershipId: membership.id,
    appointmentId: appointment.id,
    serviceName: appointment.serviceName,
    barberName: appointment.barberName,
    usedAt: appointment.date,
    note: "Registrado automaticamente ao concluir o agendamento.",
  });
}

function namedError(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}
