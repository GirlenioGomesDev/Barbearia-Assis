import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { SmartImage } from "@/components/SmartImage";
import { PublicLayout } from "@/components/site/PublicLayout";
import { useBarbershop } from "@/hooks/useBarbershop";
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

function BookingPage() {
  const search = Route.useSearch();
  const { activeServices, activeBarbers, barbershop, config } = useBarbershop();
  const initialService = activeServices.some((service) => service.id === search.servico)
    ? search.servico!
    : null;
  const initialBarber = activeBarbers.some((barber) => barber.id === search.barbeiro)
    ? search.barbeiro!
    : null;
  const [step, setStep] = useState(() => (initialService ? 1 : 0));
  const [serviceId, setServiceId] = useState<string | null>(initialService);
  const [barberId, setBarberId] = useState<string | null>(initialBarber);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [prepared, setPrepared] = useState(false);

  const service = activeServices.find((item) => item.id === serviceId) ?? null;
  const barber = activeBarbers.find((item) => item.id === barberId) ?? null;
  const selectableServices = useMemo(
    () =>
      barberId && barber
        ? activeServices.filter((item) => barber.serviceIds.includes(item.id))
        : activeServices,
    [activeServices, barber, barberId],
  );
  const selectableBarbers = useMemo(
    () =>
      serviceId
        ? activeBarbers.filter((item) => item.serviceIds.includes(serviceId))
        : activeBarbers,
    [activeBarbers, serviceId],
  );
  const availableDates = useMemo(
    () =>
      getAvailableDates({
        barber,
        futureDays: config.booking.futureDays,
        blockedDates: config.booking.blockedDates,
      }),
    [barber, config.booking],
  );
  const availableTimes = useMemo(
    () =>
      barber && service && date
        ? getAvailableTimes({
            barber,
            service,
            date,
            minAdvanceMinutes: config.booking.minAdvanceMinutes,
          })
        : [],
    [barber, config.booking.minAdvanceMinutes, date, service],
  );
  const phoneDigits = digits(phone);

  function goBack() {
    setPrepared(false);
    setStep((current) => Math.max(0, current - 1));
  }

  function requireStepComplete() {
    if (step === 0 && !service) return "Escolha um servico para continuar.";
    if (step === 1 && !barber) return "Escolha um barbeiro para continuar.";
    if (step === 2 && !date) return "Escolha uma data para continuar.";
    if (step === 3 && !time) return "Escolha um horario para continuar.";
    if (step === 4) {
      if (name.trim().length < 2) return "Informe seu nome.";
      if (!isValidPhone(phoneDigits)) return "Informe um WhatsApp válido com DDD.";
    }
    return null;
  }

  function nextStep() {
    const error = requireStepComplete();
    if (error) {
      toast.error(error);
      return;
    }
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  }

  function openWhatsApp() {
    if (!service || !barber || !date || !time) {
      return;
    }
    if (
      !service.active ||
      !barber.active ||
      !barber.serviceIds.includes(service.id) ||
      !service.barberIds.includes(barber.id)
    ) {
      toast.error("O serviço e o barbeiro selecionados não são compatíveis.");
      return;
    }
    if (!availableDates.some((item) => isoDate(item) === date) || !availableTimes.includes(time)) {
      toast.error("A data ou o horário selecionado não está mais disponível.");
      return;
    }
    if (name.trim().length < 2 || !isValidPhone(phone)) {
      toast.error("Revise seu nome e WhatsApp com DDD.");
      return;
    }
    const link = whatsappLink(
      barber.whatsapp,
      buildBookingMessage({
        service,
        barber,
        barbershopName: barbershop.companyName,
        date,
        time,
        name,
        phone,
        notes,
      }),
    );
    if (!link) {
      toast.error("WhatsApp do barbeiro nao foi configurado.");
      return;
    }
    setPrepared(true);
    window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
        {!activeServices.length || !activeBarbers.length ? (
          <div className="mb-6 rounded-md border border-border bg-card p-4 text-muted-foreground">
            O agendamento está temporariamente indisponível porque os serviços ou a equipe ainda não
            foram cadastrados.{" "}
            <a href="/contato" className="text-primary underline">
              Ver contato
            </a>
          </div>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Solicitacao de agendamento
            </p>
            <h1 className="mt-2 font-display text-3xl tracking-wide sm:text-4xl">
              Agendar horario
            </h1>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Esta e uma solicitacao de agendamento. O horario sera confirmado pelo barbeiro no
            WhatsApp.
          </p>
        </div>
        <div className="gold-rule mt-4" />

        <ol
          className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6"
          aria-label="Etapas do agendamento"
        >
          {STEPS.map((label, index) => (
            <li
              key={label}
              className={cn(
                "flex min-h-10 items-center justify-center gap-1.5 rounded-md border px-2 text-center text-xs",
                index === step
                  ? "border-primary bg-primary text-primary-foreground"
                  : index < step
                    ? "border-primary/50 text-primary"
                    : "border-border text-muted-foreground",
              )}
            >
              {index < step ? <Check className="h-3 w-3" aria-hidden /> : <span>{index + 1}</span>}
              {label}
            </li>
          ))}
        </ol>

        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar
          </button>
        ) : null}

        <div className="mt-6">
          {step === 0 && (
            <StepPanel title="Escolha seu servico">
              <div className="grid gap-3 sm:grid-cols-2">
                {selectableServices.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setServiceId(item.id);
                      if (barberId && !barber?.serviceIds.includes(item.id)) setBarberId(null);
                      setTime(null);
                      setStep(1);
                    }}
                    className={cn(
                      "surface-premium flex items-center gap-3 rounded-xl p-4 text-left transition",
                      serviceId === item.id ? "ring-1 ring-primary" : "hover:border-primary/50",
                    )}
                  >
                    <SmartImage
                      value={item.imageUrl}
                      alt={item.name}
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold">{item.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {duration(item.durationMinutes)} - {money(item.price)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </StepPanel>
          )}

          {step === 1 && (
            <StepPanel title="Escolha seu barbeiro">
              <div className="grid gap-3 sm:grid-cols-2">
                {selectableBarbers.length ? (
                  selectableBarbers.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setBarberId(item.id);
                        setDate(null);
                        setTime(null);
                        setStep(2);
                      }}
                      className={cn(
                        "surface-premium flex items-center gap-3 rounded-xl p-4 text-left transition",
                        barberId === item.id ? "ring-1 ring-primary" : "hover:border-primary/50",
                      )}
                    >
                      <SmartImage
                        value={item.photoUrl}
                        alt={item.name}
                        className="h-16 w-16 shrink-0 rounded-full object-cover"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold">{item.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {item.specialties.join(" - ")}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="col-span-full rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
                    <p>Nenhum barbeiro está disponível para este serviço.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setServiceId(null);
                        setBarberId(null);
                        setDate(null);
                        setTime(null);
                        setStep(0);
                      }}
                      className="mt-3 rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
                    >
                      Escolher outro serviço
                    </button>
                  </div>
                )}
              </div>
            </StepPanel>
          )}

          {step === 2 && (
            <StepPanel title="Escolha a data">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {availableDates.map((item) => {
                  const value = isoDate(item);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setDate(value);
                        setTime(null);
                        setStep(3);
                      }}
                      className={cn(
                        "rounded-lg border p-3 text-center transition",
                        date === value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/60",
                      )}
                    >
                      <span className="block text-[11px] uppercase opacity-70">
                        {item.toLocaleDateString("pt-BR", { weekday: "short" })}
                      </span>
                      <span className="block text-lg font-bold">
                        {String(item.getDate()).padStart(2, "0")}
                      </span>
                      <span className="block text-[11px] uppercase opacity-70">
                        {item.toLocaleDateString("pt-BR", { month: "short" })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </StepPanel>
          )}

          {step === 3 && (
            <StepPanel title="Escolha o horario">
              <p className="mb-3 text-sm text-muted-foreground">
                {date ? longDate(date) : ""} - {barber?.name}
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {availableTimes.length ? (
                  availableTimes.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setTime(item);
                        setStep(4);
                      }}
                      className={cn(
                        "min-h-12 rounded-lg border py-3 text-sm font-semibold transition",
                        time === item
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/60",
                      )}
                    >
                      {hhmm(item)}
                    </button>
                  ))
                ) : (
                  <p className="col-span-full rounded-md border border-border p-4 text-sm text-muted-foreground">
                    Nenhum horario disponivel para esta data.
                  </p>
                )}
              </div>
            </StepPanel>
          )}

          {step === 4 && (
            <StepPanel title="Seus dados">
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  nextStep();
                }}
              >
                <FormInput id="nome" label="Nome" value={name} onChange={setName} />
                <FormInput
                  id="whats"
                  label="WhatsApp"
                  value={phone}
                  onChange={(value) => setPhone(maskPhone(value))}
                  inputMode="tel"
                />
                <div>
                  <label htmlFor="obs" className="text-sm font-medium">
                    Observacao opcional
                  </label>
                  <textarea
                    id="obs"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground"
                >
                  Conferir resumo
                </button>
              </form>
            </StepPanel>
          )}

          {step === 5 && service && barber && date && time ? (
            <StepPanel title="Confira sua solicitacao">
              <div className="surface-premium rounded-xl p-5">
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <SummaryItem label="Servico" value={service.name} />
                  <SummaryItem label="Barbeiro" value={barber.name} />
                  <SummaryItem label="Data" value={shortDate(date)} />
                  <SummaryItem label="Horario" value={hhmm(time)} />
                  <SummaryItem label="Duracao" value={duration(service.durationMinutes)} />
                  <SummaryItem label="Valor" value={money(service.price)} />
                  <SummaryItem label="Cliente" value={name.trim()} />
                  <SummaryItem label="WhatsApp" value={phone} />
                  <SummaryItem label="Observacao" value={notes.trim() || "Nenhuma."} />
                </dl>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={goBack}
                  className="rounded-md border border-border px-5 py-3 text-sm font-semibold"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={openWhatsApp}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground"
                >
                  <MessageCircle className="h-4 w-4" /> Solicitar pelo WhatsApp
                </button>
              </div>
              {prepared ? (
                <p className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
                  Solicitacao preparada. Envie a mensagem para o barbeiro confirmar.
                </p>
              ) : null}
            </StepPanel>
          ) : null}
        </div>
      </div>
    </PublicLayout>
  );
}

function StepPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-display text-2xl tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function FormInput({
  id,
  label,
  value,
  onChange,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "tel";
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label} *
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        required
        className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}
