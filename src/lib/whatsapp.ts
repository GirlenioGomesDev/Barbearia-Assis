import type { Barber, Service } from "@/lib/schema";
import { hhmm, money, shortDate, whatsappLink } from "@/lib/format";

export function buildBookingMessage(input: {
  service: Service;
  barber: Barber;
  barbershopName: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  notes: string;
}) {
  const note = input.notes.trim() || "Nenhuma.";
  return [
    `Ola, ${input.barber.name}!`,
    "",
    `Gostaria de solicitar um agendamento na ${input.barbershopName}.`,
    "Se puder, confirme pelo WhatsApp se este horário está disponível.",
    "",
    `Servico: ${input.service.name}`,
    `Barbeiro: ${input.barber.name}`,
    `Data: ${shortDate(input.date)}`,
    `Horario: ${hhmm(input.time)}`,
    `Duracao: ${input.service.durationMinutes} min`,
    `Valor: ${money(input.service.price)}`,
    "",
    `Cliente: ${input.name.trim()}`,
    `WhatsApp: ${input.phone}`,
    "",
    "Observacao:",
    note,
  ].join("\n");
}

export function buildPlanLink(whatsapp: string, planName: string, message: string) {
  return whatsappLink(whatsapp, `${message}\n\nPlano: ${planName}`);
}

export function buildProductLink(
  whatsapp: string,
  productName: string,
  price: number,
  message: string,
) {
  return whatsappLink(
    whatsapp,
    [message, "", `Produto: ${productName}`, `Valor: ${money(price)}`].join("\n"),
  );
}
