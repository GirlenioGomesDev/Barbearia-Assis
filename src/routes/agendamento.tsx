import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { SmartImage } from "@/components/SmartImage";
import { PublicLayout } from "@/components/site/PublicLayout";
import { useBarbershop } from "@/hooks/useBarbershop";
import type { Appointment, BlockedSlot } from "@/lib/appointments";
import { intervalsOverlap, minutesFromTime } from "@/lib/appointments";
import {
  digits,
  duration,
  hhmm,
  isoDate,
  longDate,
  maskPhone,
  money,
  shortDate,
  whatsappLink,
} from "@/lib/format";
import { getAvailableDates, getAvailableTimes } from "@/lib/schedule";
import { pageSeo } from "@/lib/seo";
import { loadPublicConfig } from "@/lib/public-config-server";
import { defaultConfig, isValidPhone } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { buildBookingMessage } from "@/lib/whatsapp";

export const Route = createFileRoute("/agendamento")({
  validateSearch: (search: Record<string, unknown>): { servico?: string; barbeiro?: string } => {
    const out: { servico?: string; barbeiro?: string } = {};
    if (typeof search["servico"] === "string") out.servico = search["servico"];
    if (typeof search["barbeiro"] === "string") out.barbeiro = search["barbeiro"];
    return out;
  },
  loader: () => loadPublicConfig(),
  head: ({ loaderData }) => pageSeo(loaderData?.config ?? defaultConfig, "agendamento"),
  component: BookingPage,
});

const STEPS = ["Servico", "Barbeiro", "Data", "Horario", "Dados", "Resumo"] as const;

type OccupiedResponse = { appointments: Appointment[]; blocks: BlockedSlot[] };

function BookingPage() {
  const search = Route.useSearch();
  const { activeServices, activeBarbers, barbershop, config } = useBarbershop();
  const initialService = activeServices.some((service) => service.id === search.servico) ? search.servico! : null;
  const initialBarber = activeBarbers.some((barber) => barber.id === search.barbeiro) ? search.barbeiro! : null;
  const [step, setStep] = useState(() => (initialService ? 1 : 0));
  const [serviceId, setServiceId] = useState<string | null>(initialService);
  const [barberId, setBarberId] = useState<string | null>(initialBarber);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [occupied, setOccupied] = useState<OccupiedResponse>({ appointments: [], blocks: [] });
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);

  const service = activeServices.find((item) => item.id === serviceId) ?? null;
  const barber = activeBarbers.find((item) => item.id === barberId) ?? null;
  const selectableServices = useMemo(() => barberId && barber ? activeServices.filter((item) => barber.serviceIds.includes(item.id)) : activeServices, [activeServices, barber, barberId]);
  const selectableBarbers = useMemo(() => serviceId ? activeBarbers.filter((item) => item.serviceIds.includes(serviceId)) : activeBarbers, [activeBarbers, serviceId]);
  const availableDates = useMemo(() => getAvailableDates({ barber, futureDays: config.booking.futureDays, blockedDates: config.booking.blockedDates }), [barber, config.booking]);
  const baseTimes = useMemo(() => barber && service && date ? getAvailableTimes({ barber, service, date, minAdvanceMinutes: config.booking.minAdvanceMinutes }) : [], [barber, config.booking.minAdvanceMinutes, date, service]);
  const availableTimes = useMemo(() => {
    if (!service) return [];
    return baseTimes.filter((slot) => {
      const appointmentConflict = occupied.appointments.some((item) => intervalsOverlap(slot, service.durationMinutes, item.time, item.durationMinutes));
      const blockConflict = occupied.blocks.some((item) => {
        const start = minutesFromTime(item.startTime);
        const end = minutesFromTime(item.endTime);
        const requested = minutesFromTime(slot);
        return requested < end && start < requested + service.durationMinutes;
      });
      return !appointmentConflict && !blockConflict;
    });
  }, [baseTimes, occupied, service]);
  const phoneDigits = digits(phone);

  useEffect(() => {
    if (!barberId || !date) {
      setOccupied({ appointments: [], blocks: [] });
      return;
    }
    let cancelled = false;
    setLoadingTimes(true);
    fetch(`/api/appointments?barberId=${encodeURIComponent(barberId)}&date=${encodeURIComponent(date)}`)
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as Partial<OccupiedResponse> & { message?: string };
        if (!response.ok) throw new Error(payload.message || "Nao foi possivel consultar a agenda.");
        if (!cancelled) setOccupied({ appointments: payload.appointments ?? [], blocks: payload.blocks ?? [] });
      })
      .catch((error) => !cancelled && toast.error(error instanceof Error ? error.message : "Nao foi possivel consultar a agenda."))
      .finally(() => !cancelled && setLoadingTimes(false));
    return () => { cancelled = true; };
  }, [barberId, date]);

  function goBack() {
    setStep((current) => Math.max(0, current - 1));
  }

  function nextStep() {
    if (step === 4 && (name.trim().length < 2 || !isValidPhone(phoneDigits))) {
      toast.error("Informe seu nome e um WhatsApp valido com DDD.");
      return;
    }
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  }

  async function confirmAppointment() {
    if (!service || !barber || !date || !time || submitting) return;
    if (!availableTimes.includes(time)) {
      toast.error("Esse horario nao esta mais disponivel. Escolha outro.");
      setStep(3);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ customerName: name, customerPhone: phone, serviceId: service.id, barberId: barber.id, date, time, notes }),
      });
      const payload = (await response.json().catch(() => ({}))) as { appointment?: Appointment; message?: string };
      if (!response.ok || !payload.appointment) throw new Error(payload.message || "Nao foi possivel confirmar o horario.");
      setConfirmed(payload.appointment);
      toast.success("Horario reservado com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel confirmar o horario.");
    } finally {
      setSubmitting(false);
    }
  }

  function talkOnWhatsApp() {
    if (!service || !barber || !date || !time) return;
    const link = whatsappLink(barber.whatsapp || barbershop.whatsapp, buildBookingMessage({ service, barber, barbershopName: barbershop.companyName, date, time, name, phone, notes }));
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  }

  if (confirmed) {
    return <PublicLayout><div className="mx-auto w-full max-w-xl px-4 py-10"><div className="surface-premium rounded-xl p-6 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary text-primary"><Check className="h-7 w-7" /></div><p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Agendamento realizado</p><h1 className="mt-2 font-display text-3xl tracking-wide">Horario reservado</h1><p className="mt-3 text-sm text-muted-foreground">Seu horario ja esta registrado na agenda da barbearia.</p><dl className="mt-6 grid gap-4 rounded-lg border border-border p-4 text-left text-sm sm:grid-cols-2"><SummaryItem label="Servico" value={confirmed.serviceName} /><SummaryItem label="Barbeiro" value={confirmed.barberName} /><SummaryItem label="Data" value={shortDate(confirmed.date)} /><SummaryItem label="Horario" value={hhmm(confirmed.time)} /><SummaryItem label="Valor" value={money(confirmed.price)} /><SummaryItem label="Status" value="Agendado" /></dl><button type="button" onClick={talkOnWhatsApp} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground"><MessageCircle className="h-4 w-4" /> Falar com a barbearia</button></div></div></PublicLayout>;
  }

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
        {!activeServices.length || !activeBarbers.length ? <div className="mb-6 rounded-md border border-border bg-card p-4 text-muted-foreground">O agendamento esta temporariamente indisponivel porque os servicos ou a equipe ainda nao foram cadastrados. <a href="/contato" className="text-primary underline">Ver contato</a></div> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Agendamento online</p><h1 className="mt-2 font-display text-3xl tracking-wide sm:text-4xl">Agendar horario</h1></div><p className="max-w-sm text-sm text-muted-foreground">Escolha o servico, profissional, data e horario. Sua reserva sera registrada na agenda.</p></div>
        <div className="gold-rule mt-4" />
        <ol className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Etapas do agendamento">{STEPS.map((label, index) => <li key={label} className={cn("flex min-h-10 items-center justify-center gap-1.5 rounded-md border px-2 text-center text-xs", index === step ? "border-primary bg-primary text-primary-foreground" : index < step ? "border-primary/50 text-primary" : "border-border text-muted-foreground")}>{index < step ? <Check className="h-3 w-3" /> : <span>{index + 1}</span>}{label}</li>)}</ol>
        {step > 0 ? <button type="button" onClick={goBack} className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ChevronLeft className="h-4 w-4" /> Voltar</button> : null}
        <div className="mt-6">
          {step === 0 && <StepPanel title="Escolha seu servico"><div className="grid gap-3 sm:grid-cols-2">{selectableServices.map((item) => <button key={item.id} type="button" onClick={() => { setServiceId(item.id); if (barberId && !barber?.serviceIds.includes(item.id)) setBarberId(null); setDate(null); setTime(null); setStep(1); }} className={cn("surface-premium flex items-center gap-3 rounded-xl p-4 text-left transition", serviceId === item.id ? "ring-1 ring-primary" : "hover:border-primary/50")}><SmartImage value={item.imageUrl} alt={item.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" /><span className="min-w-0"><span className="block font-semibold">{item.name}</span><span className="mt-1 block text-xs text-muted-foreground">{duration(item.durationMinutes)} - {money(item.price)}</span></span></button>)}</div></StepPanel>}
          {step === 1 && <StepPanel title="Escolha seu barbeiro"><div className="grid gap-3 sm:grid-cols-2">{selectableBarbers.length ? selectableBarbers.map((item) => <button key={item.id} type="button" onClick={() => { setBarberId(item.id); setDate(null); setTime(null); setStep(2); }} className={cn("surface-premium flex items-center gap-3 rounded-xl p-4 text-left transition", barberId === item.id ? "ring-1 ring-primary" : "hover:border-primary/50")}><SmartImage value={item.photoUrl} alt={item.name} className="h-16 w-16 shrink-0 rounded-full object-cover" /><span><span className="block font-semibold">{item.name}</span><span className="mt-1 block text-xs text-muted-foreground">{item.specialties.join(" - ")}</span></span></button>) : <p className="text-sm text-muted-foreground">Nenhum barbeiro disponivel para este servico.</p>}</div></StepPanel>}
          {step === 2 && <StepPanel title="Escolha a data"><div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{availableDates.map((item) => { const value = isoDate(item); return <button key={value} type="button" onClick={() => { setDate(value); setTime(null); setStep(3); }} className={cn("rounded-lg border p-3 text-center transition", date === value ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60")}><span className="block text-[11px] uppercase opacity-70">{item.toLocaleDateString("pt-BR", { weekday: "short" })}</span><span className="block text-lg font-bold">{String(item.getDate()).padStart(2, "0")}</span><span className="block text-[11px] uppercase opacity-70">{item.toLocaleDateString("pt-BR", { month: "short" })}</span></button>; })}</div></StepPanel>}
          {step === 3 && <StepPanel title="Escolha o horario"><p className="mb-3 text-sm text-muted-foreground">{date ? longDate(date) : ""} - {barber?.name}</p>{loadingTimes ? <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">Consultando agenda...</p> : <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{availableTimes.length ? availableTimes.map((item) => <button key={item} type="button" onClick={() => { setTime(item); setStep(4); }} className={cn("min-h-12 rounded-lg border py-3 text-sm font-semibold transition", time === item ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60")}>{hhmm(item)}</button>) : <p className="col-span-full rounded-md border border-border p-4 text-sm text-muted-foreground">Nenhum horario disponivel para esta data.</p>}</div>}</StepPanel>}
          {step === 4 && <StepPanel title="Seus dados"><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); nextStep(); }}><FormInput id="nome" label="Nome" value={name} onChange={setName} /><FormInput id="whats" label="WhatsApp" value={phone} onChange={(value) => setPhone(maskPhone(value))} inputMode="tel" /><div><label htmlFor="obs" className="text-sm font-medium">Observacao opcional</label><textarea id="obs" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" /></div><button type="submit" className="w-full rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground">Conferir resumo</button></form></StepPanel>}
          {step === 5 && service && barber && date && time ? <StepPanel title="Confira seu agendamento"><div className="surface-premium rounded-xl p-5"><dl className="grid gap-4 text-sm sm:grid-cols-2"><SummaryItem label="Servico" value={service.name} /><SummaryItem label="Barbeiro" value={barber.name} /><SummaryItem label="Data" value={shortDate(date)} /><SummaryItem label="Horario" value={hhmm(time)} /><SummaryItem label="Duracao" value={duration(service.durationMinutes)} /><SummaryItem label="Valor" value={money(service.price)} /><SummaryItem label="Cliente" value={name.trim()} /><SummaryItem label="WhatsApp" value={phone} /><SummaryItem label="Observacao" value={notes.trim() || "Nenhuma."} /></dl></div><div className="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={goBack} className="rounded-md border border-border px-5 py-3 text-sm font-semibold">Voltar</button><button type="button" disabled={submitting} onClick={() => void confirmAppointment()} className="flex-1 rounded-md bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-50">{submitting ? "Reservando..." : "Confirmar agendamento"}</button></div></StepPanel> : null}
        </div>
      </div>
    </PublicLayout>
  );
}

function StepPanel({ title, children }: { title: string; children: React.ReactNode }) { return <section><h2 className="mb-4 font-display text-2xl tracking-wide">{title}</h2>{children}</section>; }
function SummaryItem({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt><dd className="mt-1 font-medium text-foreground">{value}</dd></div>; }
function FormInput({ id, label, value, onChange, inputMode }: { id: string; label: string; value: string; onChange: (value: string) => void; inputMode?: "tel" }) { return <div><label htmlFor={id} className="text-sm font-medium">{label} *</label><input id={id} value={value} onChange={(event) => onChange(event.target.value)} inputMode={inputMode} required className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" /></div>; }
