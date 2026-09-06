import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarCheck, Scissors } from "lucide-react";

import { PublicLayout } from "@/components/site/PublicLayout";
import { maskPhone } from "@/lib/format";
import { membershipStatusLabel, type Membership } from "@/lib/memberships";

export const Route = createFileRoute("/meu-plano")({
  head: () => ({ meta: [{ title: "Meu plano - Barbearia Assis" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: MeuPlanoPage,
});

function MeuPlanoPage() {
  const [phone, setPhone] = useState("");
  const [membership, setMembership] = useState<Membership | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setMembership(null);
    try {
      const response = await fetch("/api/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const payload = await response.json().catch(() => ({})) as { membership?: Membership; message?: string };
      if (!response.ok || !payload.membership) throw new Error(payload.message || "Plano nao encontrado.");
      setMembership(payload.membership);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel consultar seu plano.");
    } finally { setLoading(false); }
  }

  return (
    <PublicLayout>
      <section className="mx-auto w-full max-w-3xl px-4 py-12">
        <div className="surface-premium rounded-2xl p-5 sm:p-7">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Acompanhamento do cliente</p>
          <h1 className="mt-2 font-display text-4xl">Meu plano</h1>
          <p className="mt-2 text-sm text-muted-foreground">Consulte quantos atendimentos ja utilizou, quantos ainda restam e veja seu historico de cortes.</p>

          <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="text-sm">Seu WhatsApp<input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} className="mt-1 min-h-12 w-full rounded-md border border-border bg-background px-3" placeholder="(81) 99999-9999" required /></label>
            <button disabled={loading} className="min-h-12 rounded-md bg-primary px-5 font-bold text-primary-foreground disabled:opacity-50">{loading ? "Consultando..." : "Consultar"}</button>
          </form>
          {message ? <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{message}</p> : null}
        </div>

        {membership ? <section className="mt-5 space-y-4">
          <div className="surface-premium rounded-2xl p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs uppercase tracking-widest text-primary">{membership.planName}</p><h2 className="mt-1 text-2xl font-semibold">{membership.customerName}</h2><p className="mt-1 text-sm text-muted-foreground">Plano {membershipStatusLabel(membership.status).toLowerCase()}</p></div><div className="rounded-xl border border-primary/30 bg-primary/10 px-5 py-4 text-center"><p className="text-3xl font-bold text-primary">{membership.remainingVisits}</p><p className="text-xs uppercase tracking-widest text-muted-foreground">restantes de {membership.totalVisits}</p></div></div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.round((membership.usedVisits / membership.totalVisits) * 100))}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{membership.usedVisits} atendimento(s) utilizado(s).</p></div>

          <div className="surface-premium rounded-2xl p-5"><div className="flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-primary" /><h2 className="font-display text-2xl">Historico de cortes</h2></div>{membership.usages.length ? <div className="mt-4 space-y-3">{membership.usages.map((usage, index) => <article key={usage.id} className="flex gap-3 rounded-xl border border-border p-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Scissors className="h-4 w-4" /></div><div><p className="font-semibold">{usage.serviceName}</p><p className="text-sm text-muted-foreground">{new Date(`${usage.usedAt}T12:00:00`).toLocaleDateString("pt-BR")}{usage.barberName ? ` · ${usage.barberName}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">Atendimento {membership.usedVisits - index} de {membership.totalVisits}</p></div></article>)}</div> : <p className="mt-4 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhum atendimento utilizado ainda.</p>}</div>
        </section> : null}
      </section>
    </PublicLayout>
  );
}
