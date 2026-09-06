import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Clock3, Scissors } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PublicLayout } from "@/components/site/PublicLayout";
import type { Appointment } from "@/lib/appointments";
import { statusLabel } from "@/lib/appointments";
import { hhmm, maskPhone, money, shortDate } from "@/lib/format";

export const Route = createFileRoute("/meus-agendamentos")({
  head: () => ({
    meta: [
      { title: "Meus agendamentos - Barbearia Assis" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CustomerAppointmentsPage,
});

function CustomerAppointmentsPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/customer/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        appointments?: Appointment[];
        message?: string;
      };
      if (!response.ok) throw new Error(payload.message || "Nao foi possivel consultar.");
      setAppointments(payload.appointments ?? []);
      setSearched(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel consultar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Área do cliente</p>
        <h1 className="mt-2 font-display text-4xl">Meus agendamentos</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Use o WhatsApp informado no agendamento e o código de 6 dígitos recebido ao reservar.
        </p>

        <form onSubmit={submit} className="surface-premium mt-6 rounded-xl p-5">
          <label className="block text-sm font-medium">WhatsApp</label>
          <input
            value={phone}
            onChange={(event) => setPhone(maskPhone(event.target.value))}
            inputMode="tel"
            className="mt-1 min-h-12 w-full rounded-md border border-border bg-background px-3"
            required
          />
          <label className="mt-4 block text-sm font-medium">Código do agendamento</label>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
            className="mt-1 min-h-12 w-full rounded-md border border-border bg-background px-3 tracking-[0.3em]"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-md bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Consultando..." : "Consultar agendamento"}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          {appointments.map((item) => (
            <article key={item.id} className="surface-premium rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-primary">{statusLabel(item.status)}</p>
                  <h2 className="mt-1 text-xl font-semibold">{item.serviceName}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">com {item.barberName}</p>
                </div>
                <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                  {statusLabel(item.status)}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Info icon={<CalendarDays className="h-4 w-4" />} label="Data" value={shortDate(item.date)} />
                <Info icon={<Clock3 className="h-4 w-4" />} label="Horário" value={hhmm(item.time)} />
                <Info icon={<Scissors className="h-4 w-4" />} label="Valor" value={money(item.price)} />
              </div>
            </article>
          ))}

          {searched && !appointments.length ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum agendamento foi encontrado com esses dados.
            </div>
          ) : null}
        </div>

        <Link to="/agendamento" className="mt-6 inline-flex text-sm font-semibold text-primary">
          Fazer novo agendamento
        </Link>
      </div>
    </PublicLayout>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs uppercase">{label}</span></div>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}
