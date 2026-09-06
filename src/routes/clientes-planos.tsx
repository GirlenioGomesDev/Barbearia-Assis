import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, LogOut, Plus, Scissors, UsersRound } from "lucide-react";
import { toast } from "sonner";

import logo from "@/assets/logo-assis.png";
import { useBarbershop } from "@/hooks/useBarbershop";
import { isoDate, maskPhone } from "@/lib/format";
import { membershipStatusLabel, type Membership, type MembershipStatus } from "@/lib/memberships";

export const Route = createFileRoute("/clientes-planos")({
  head: () => ({ meta: [{ title: "Clientes com plano - Barbearia Assis" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: MembershipsPage,
});

function MembershipsPage() {
  const { authenticated, csrfToken, barbershop, plans, loadAdmin, login, logout } = useBarbershop();
  const [password, setPassword] = useState("");
  const [items, setItems] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { loadAdmin().catch(() => undefined); }, [loadAdmin]);
  useEffect(() => { if (authenticated) void refresh(); }, [authenticated]);

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/memberships");
      const payload = await response.json() as { memberships?: Membership[]; message?: string };
      if (!response.ok) throw new Error(payload.message || "Nao foi possivel carregar os planos.");
      setItems(payload.memberships || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar planos.");
    } finally { setLoading(false); }
  }

  async function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    try { await login(password); setPassword(""); toast.success("Area liberada."); }
    catch { toast.error("Senha incorreta."); }
  }

  async function changeStatus(id: string, status: MembershipStatus) {
    if (!csrfToken) return;
    const response = await fetch("/api/admin/memberships", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ membershipId: id, status }),
    });
    if (!response.ok) return toast.error("Nao foi possivel atualizar o plano.");
    await refresh();
  }

  async function addUse(item: Membership) {
    if (!csrfToken) return;
    const response = await fetch("/api/admin/memberships", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ action: "use", membershipId: item.id, serviceName: "Atendimento do plano", usedAt: isoDate(new Date()) }),
    });
    const payload = await response.json().catch(() => ({})) as { message?: string };
    if (!response.ok) return toast.error(payload.message || "Nao foi possivel registrar o atendimento.");
    toast.success("Atendimento registrado no historico.");
    await refresh();
  }

  function copyAccess(item: Membership) {
    const url = `${window.location.origin}/meu-plano`;
    const text = `Acompanhe seu plano da ${barbershop.companyName}: ${url}\nWhatsApp: ${maskPhone(item.customerPhone)}`;
    navigator.clipboard.writeText(text).then(() => toast.success("Acesso do cliente copiado."));
  }

  if (!authenticated) return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submitLogin} className="surface-premium w-full max-w-md rounded-xl p-6">
        <div className="flex items-center gap-3"><img src={barbershop.logoUrl || logo} alt="" className="h-12 w-12 object-contain" /><div><p className="text-xs uppercase tracking-[0.2em] text-primary">{barbershop.companyName}</p><h1 className="font-display text-3xl">Clientes com plano</h1></div></div>
        <p className="mt-4 text-sm text-muted-foreground">Use a mesma senha da agenda e do painel.</p>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="mt-5 min-h-12 w-full rounded-md border border-border bg-background px-3" required />
        <button className="mt-4 w-full rounded-md bg-primary py-3 font-bold text-primary-foreground">Entrar</button>
      </form>
    </main>
  );

  return (
    <main className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3"><div><p className="text-[10px] uppercase tracking-[0.2em] text-primary">Area do barbeiro</p><h1 className="font-display text-2xl">Clientes com plano</h1></div><div className="flex gap-2"><a href="/agenda" className="rounded-md border border-border px-3 py-2 text-xs font-semibold">Agenda</a><a href="/admin" className="rounded-md border border-border px-3 py-2 text-xs font-semibold">Configurar</a><button onClick={() => void logout()} className="rounded-md border border-border p-2"><LogOut className="h-4 w-4" /></button></div></div></header>
      <div className="mx-auto max-w-5xl px-4 py-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-2xl">Planos ativos dos clientes</h2><p className="text-sm text-muted-foreground">Controle usos e envie ao cliente o acesso ao proprio historico.</p></div><button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" /> Novo cliente</button></div>
        <section className="mt-5 space-y-3">{loading ? <p className="rounded-md border border-border p-4">Carregando...</p> : items.length ? items.map((item) => <article key={item.id} className="surface-premium rounded-xl p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><h3 className="text-lg font-semibold">{item.customerName}</h3><span className="rounded-full border border-border px-2 py-1 text-[10px] uppercase text-muted-foreground">{membershipStatusLabel(item.status)}</span></div><p className="text-sm text-muted-foreground">{item.planName} · {maskPhone(item.customerPhone)}</p><p className="mt-2 text-sm"><strong>{item.remainingVisits}</strong> de {item.totalVisits} atendimentos restantes</p></div><button onClick={() => copyAccess(item)} className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm"><Copy className="h-4 w-4" /> Copiar acesso</button></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><button onClick={() => void addUse(item)} disabled={item.status !== "active" || item.remainingVisits <= 0} className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"><Scissors className="mr-1 inline h-3 w-3" /> Registrar corte</button><button onClick={() => void changeStatus(item.id, "active")} className="rounded-md border border-border px-3 py-2 text-xs">Ativar</button><button onClick={() => void changeStatus(item.id, "finished")} className="rounded-md border border-border px-3 py-2 text-xs">Finalizar</button><button onClick={() => void changeStatus(item.id, "cancelled")} className="rounded-md border border-border px-3 py-2 text-xs">Cancelar</button></div>{item.usages.length ? <div className="mt-4 border-t border-border pt-3"><p className="text-xs uppercase tracking-widest text-muted-foreground">Ultimos atendimentos</p>{item.usages.slice(0, 3).map((usage) => <p key={usage.id} className="mt-2 text-sm">{new Date(`${usage.usedAt}T12:00:00`).toLocaleDateString("pt-BR")} · {usage.serviceName}{usage.barberName ? ` · ${usage.barberName}` : ""}</p>)}</div> : null}</article>) : <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground"><UsersRound className="mx-auto h-8 w-8" /><p className="mt-3">Nenhum cliente com plano cadastrado.</p></div>}</section>
      </div>
      {open && csrfToken ? <NewMembershipModal onClose={() => setOpen(false)} onSaved={refresh} csrfToken={csrfToken} plans={plans.filter((p) => p.active)} /> : null}
    </main>
  );
}

function NewMembershipModal({ onClose, onSaved, csrfToken, plans }: { onClose: () => void; onSaved: () => Promise<void>; csrfToken: string; plans: { id: string; name: string }[] }) {
  const [form, setForm] = useState({ customerName: "", customerPhone: "", planId: plans[0]?.id || "", totalVisits: "4", startDate: isoDate(new Date()), expiresDate: "" });
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/memberships", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ ...form, totalVisits: Number(form.totalVisits) }) });
    const payload = await response.json().catch(() => ({})) as { message?: string };
    if (!response.ok) return toast.error(payload.message || "Nao foi possivel cadastrar o plano.");
    await onSaved(); toast.success("Cliente adicionado ao plano."); onClose();
  }
  return <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center"><form onSubmit={submit} className="w-full max-w-lg rounded-xl border border-border bg-background p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl">Novo cliente com plano</h2><button type="button" onClick={onClose}>Fechar</button></div><div className="space-y-3"><Input label="Nome do cliente" value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} /><Input label="WhatsApp" value={form.customerPhone} onChange={(v) => setForm({ ...form, customerPhone: maskPhone(v) })} /><label className="block text-sm">Plano<select value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3">{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label><Input label="Quantidade de cortes/atendimentos" type="number" value={form.totalVisits} onChange={(v) => setForm({ ...form, totalVisits: v })} /><Input label="Inicio do plano" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} /><Input label="Validade (opcional)" type="date" value={form.expiresDate} onChange={(v) => setForm({ ...form, expiresDate: v })} /><button className="w-full rounded-md bg-primary py-3 font-bold text-primary-foreground">Cadastrar cliente</button></div></form></div>;
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block text-sm">{label}<input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3" required={label !== "Validade (opcional)"} /></label>; }
