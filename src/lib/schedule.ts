import type { Barber, Service } from "@/lib/schema";
import { isoDate } from "@/lib/format";
import { timeToMinutes } from "@/lib/schema";

export function getAvailableDates(input: {
  barber: Barber | null;
  futureDays: number;
  blockedDates?: { date: string }[];
  from?: Date;
}) {
  if (!input.barber) return [];
  const dates: Date[] = [];
  const cursor = new Date(input.from ?? new Date());
  cursor.setHours(0, 0, 0, 0);
  const globalBlocked = new Set((input.blockedDates ?? []).map((item) => item.date));
  const barberBlocked = new Set(input.barber.blockedDates.map((item) => item.date));

  for (let i = 0; i < input.futureDays; i += 1) {
    const value = isoDate(cursor);
    if (
      input.barber.workingDays.includes(cursor.getDay()) &&
      !globalBlocked.has(value) &&
      !barberBlocked.has(value)
    ) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function getAvailableTimes(input: {
  barber: Barber;
  service: Service;
  date: string;
  minAdvanceMinutes: number;
  now?: Date;
}) {
  const start = timeToMinutes(input.barber.startTime);
  const end = timeToMinutes(input.barber.endTime);
  const latestStart = end - input.service.durationMinutes;
  const selectedIsToday = input.date === isoDate(input.now ?? new Date());
  const now = input.now ?? new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes() + input.minAdvanceMinutes;
  const slots: string[] = [];

  if (!input.barber.workingDays.includes(new Date(`${input.date}T12:00:00`).getDay())) return [];
  if (input.barber.blockedDates.some((blocked) => blocked.date === input.date)) return [];

  for (let minute = start; minute <= latestStart; minute += input.barber.slotIntervalMinutes) {
    if (selectedIsToday && minute < currentMinutes) continue;
    if (crossesBreak(input.barber, minute, minute + input.service.durationMinutes)) continue;
    slots.push(fromMinutes(minute));
  }

  return slots;
}

export function crossesBreak(barber: Barber, slotStart: number, slotEnd: number) {
  if (!barber.breakStartTime || !barber.breakEndTime) return false;
  const breakStart = timeToMinutes(barber.breakStartTime);
  const breakEnd = timeToMinutes(barber.breakEndTime);
  return slotStart < breakEnd && slotEnd > breakStart;
}

export function fromMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
