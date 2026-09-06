import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, LogOut, MessageCircle, Scissors, UserRound, X } from "lucide-react";
import { toast } from "sonner";

import logo from "@/assets/logo-assis.png";
import { useBarbershop } from "@/hooks/useBarbershop";
import { statusLabel, type Appointment, type AppointmentStatus, type BlockedSlot } from "@/lib/appointments";
import { isoDate, maskPhone, money, whatsappLink } from "@/lib/format";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agenda - Barbearia Assis" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AgendaPage,
});

function AgendaPage() {
  const { authenticated, csrfToken, barbershop, activeBarbers, activeServices, loadAdmin, login, logout } = useBarbershop();
  const [password, setPassword] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<BlockedSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => isoDate(new Date()));
  const [loading, setLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  useEffect(() => { loadAdmin().catch(() => undefined); }, [loadAdmin]);
  useEffect(() => { if (authenticated) void refresh(); }, [authenticated]);

  async function refresh() {
    setLoading(true);
    try {
      const [agendaResponse, blocksResponse] = await Promise.all([fetch("/api/admin/appointments"), fetch("/api/admin/blocks")]);
      if (!agendaResponse.ok || !blocksResponse.ok) throw new Error("Nao foi possivel carregar a agenda.");
      const agenda = await agendaResponse.json() as { appointments: Appointment[] };
      const blocked = await blocksResponse.json() as { blocks: BlockedSlot[] };
      setAppointments(agenda.appointments ?? []);
      setBlocks(blocked.blocks ?? []);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao carregar agenda."); }
    finally { setLoading(false); }
  }

  async function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    try { await login(password); setPassword(""); toast.success("Agenda liberada."); }
    catch { toast.error("Senha incorreta."); }
  }

  async function changeStatus(id: string, status: AppointmentStatus) {
    if (!csrfToken) return;
    const response = await fetch("/api/admin/appointments", { method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ id, status }) });
    const payload = await response.json().catch(() => ({})) as { message?: string };
    if (!response.ok) return toast.error(payload.message || "Nao foi possivel atualizar.");
    await refresh();
    toast.success(`Agendamento: ${statusLabel(status)}.`);
  }

  const dayAppointments = useMemo(() => appointments.filter((item) => item.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)), [appointments, selectedDate]);
  const activeToday = dayAppointments.filter((item) => item.status === "scheduled" || item.status === "confirmed");
  const nextClient = activeToday.find((item) => item.time >= new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));

  if (!authenticated) return <main className="flex min-h-screen items-center justify-center bg-background px-4"><form onSubmit={submitLogin} className="surface-premium w-full max-w-md rounded-xl p-6"><div className="flex items-center gap-3"><img src={barbershop.logoUrl || logo} alt="" className="h-12 w-12 object-contain" /><div><p className="text-xs uppercase tracking-[0.2em] text-primary">{barbershop.companyName}</p><h1 className="font-display text-3xl">Agenda</h1></div></div><p className="mt-4 text-sm text-muted-foreground">Entre com a mesma senha do painel administrativo.</p><label className="mt-5 block text-sm font-medium">Senha</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 min-h-12 w-full rounded-md border border-border bg-background px-3" required /><button className="mt-4 w-full rounded-md bg-primary py-3 font-bold text-primary-foreground">Entrar</button></form></main>;

  return <main className="min-h-screen bg-background pb-24"><header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3"><div className="flex items-center gap-3"><img src={barbershop.logoUrl || logo} alt="" className="h-10 w-10 object-contain" /><div><p className="text-[10px] uppercase tracking-[0.2em] text-primary">Barbearia Assis</p><h1 className="font-display text-2xl">Agenda</h1></div></div><div className="flex gap-2"><a href="/admin" className="rounded-md border border-border px-3 py-2 text-xs font-semibold">Configuracoes</a><button onClick={() => void logout()} className="rounded-md border border-border p-2" aria-label="Sair"><LogOut className="h-4 w-4" /></button></div></div></header><div className="mx-auto max-w-5xl px-4 py-5">
    <section className="grid gap-3 sm:grid-cols-3"><InfoCard title="Agendamentos" value={String(activeToday.length)} icon={<CalendarDays className="h-5 w-5" />} /><InfoCard title="Proximo cliente" value={nextClient ? `${nextClient.time} - ${nextClient.customerName}` : "Sem proximo"} icon={<Clock3 className="h-5 w-5" />} /><InfoCard title="Faturamento do dia" value={money(dayAppointments.filter((a) => a.status === "completed").reduce((sum, a) => sum + a.price, 0))} icon={<Scissors className="h-5 w-5" />} /></section>
    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><label className="text-xs uppercase tracking-widest text-muted-foreground">Dia da agenda</label><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="mt-1 block min-h-11 rounded-md border border-border bg-card px-3" /></div><div className="flex gap-2"><button onClick={() => setBlockOpen(true)} className="flex-1 rounded-md border border-border px-4 py-3 text-sm font-semibold">Bloquear horario</button><button onClick={() => setManualOpen(true)} className="flex-1 rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">Novo agendamento</button></div></div>
    <section className="mt-5 space-y-3">{loading ? <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">Carregando agenda...</p> : dayAppointments.length ? dayAppointments.map((item) => <article key={item.id} className="surface-premium rounded-xl p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="text-xl font-bold text-primary">{item.time}</span><StatusBadge status={item.status} /></div><h2 className="mt-2 text-lg font-semibold">{item.customerName}</h2><p className="text-sm text-muted-foreground">{item.serviceName} · {item.barberName}</p></div><a href={whatsappLink(item.customerPhone, `Ola ${item.customerName}, aqui e da ${barbershop.companyName}.`) || "#"} target="_blank" rel="noreferrer" className="rounded-md border border-border p-3"><MessageCircle className="h-5 w-5" /></a></div>{item.notes ? <p className="mt-3 rounded-md bg-background/50 p-3 text-sm text-muted-foreground">{item.notes}</p> : null}<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Action label="Confirmar" onClick={() => void changeStatus(item.id, "confirmed")} disabled={item.status === "confirmed" || item.status === "completed" || item.status === "cancelled"} /><Action label="Concluir" onClick={() => void changeStatus(item.id, "completed")} disabled={item.status === "completed" || item.status === "cancelled"} /><Action label="Nao veio" onClick={() => void changeStatus(item.id, "no_show")} disabled={item.status === "completed" || item.status === "cancelled"} /><Action label="Cancelar" onClick={() => void changeStatus(item.id, "cancelled")} disabled={item.status === "completed" || item.status === "cancelled"} /></div></article>) : <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground"><CalendarDays className="mx-auto h-8 w-8" /><p className="mt-3">Nenhum agendamento neste dia.</p></div>}</section>
    {blocks.filter((b) => b.date === selectedDate).length ? <section className="mt-6"><h2 className="font-display text-xl">Horarios bloqueados</h2><div className="mt-3 space-y-2">{blocks.filter((b) => b.date === selectedDate).map((block) => <div key={block.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm"><span>{block.startTime} - {block.endTime} · {block.reason || "Bloqueado"}</span><button onClick={() => void removeBlock(block.id)} className="p-2"><X className="h-4 w-4" /></button></div>)}</div></section> : null}
  </div>{manualOpen ? <ManualModal onClose={() => setManualOpen(false)} onSaved={refresh} csrfToken={csrfToken!} date={selectedDate} services={activeServices} barbers={activeBarbers} /> : null}{blockOpen ? <BlockModal onClose={() => setBlockOpen(false)} onSaved={refresh} csrfToken={csrfToken!} date={selectedDate} barbers={activeBarbers} /> : null}</main>;

  async function removeBlock(id: string) { if (!csrfToken) return; const response = await fetch("/api/admin/blocks", { method: "DELETE", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ id }) }); if (response.ok) { await refresh(); toast.success("Horario liberado."); } else toast.error("Nao foi possivel liberar o horario."); }
}

function InfoCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) { return <div className="surface-premium rounded-xl p-4"><div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs uppercase tracking-widest">{title}</span></div><p className="mt-2 font-semibold">{value}</p></div>; }
function StatusBadge({ status }: { status: AppointmentStatus }) { return <span className="rounded-full border border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{statusLabel(status)}</span>; }
function Action({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) { return <button type="button" onClick={onClick} disabled={disabled} className="min-h-10 rounded-md border border-border px-2 text-xs font-semibold disabled:opacity-40">{label}</button>; }

function ManualModal({ onClose, onSaved, csrfToken, date, services, barbers }: { onClose: () => void; onSaved: () => Promise<void>; csrfToken: string; date: string; services: { id: string; name: string }[]; barbers: { id: string; name: string; serviceIds: string[] }[] }) {
  const [form, setForm] = useState({ customerName: "", customerPhone: "", serviceId: services[0]?.id || "", barberId: "", date, time: "", notes: "Agendamento criado pelo barbeiro" });
  const compatible = barbers.filter((b) => !form.serviceId || b.serviceIds.includes(form.serviceId));
  async function submit(e: React.FormEvent) { e.preventDefault(); const response = await fetch("/api/admin/appointments", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(form) }); const payload = await response.json().catch(() => ({})) as { message?: string }; if (!response.ok) return toast.error(payload.message || "Nao foi possivel agendar."); await onSaved(); toast.success("Agendamento criado."); onClose(); }
  return <Modal title="Novo agendamento" onClose={onClose}><form onSubmit={submit} className="space-y-3"><Input label="Cliente" value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} /><Input label="WhatsApp" value={form.customerPhone} onChange={(v) => setForm({ ...form, customerPhone: maskPhone(v) })} /><Select label="Servico" value={form.serviceId} onChange={(v) => setForm({ ...form, serviceId: v, barberId: "" })} options={services} /><Select label="Barbeiro" value={form.barberId} onChange={(v) => setForm({ ...form, barberId: v })} options={compatible} /><Input label="Data" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} /><Input label="Horario" type="time" value={form.time} onChange={(v) => setForm({ ...form, time: v })} /><button className="w-full rounded-md bg-primary py-3 font-bold text-primary-foreground">Salvar agendamento</button></form></Modal>;
}
function BlockModal({ onClose, onSaved, csrfToken, date, barbers }: { onClose: () => void; onSaved: () => Promise<void>; csrfToken: string; date: string; barbers: { id: string; name: string }[] }) { const [form, setForm] = useState({ barberId: barbers[0]?.id || "", date, startTime: "", endTime: "", reason: "" }); async function submit(e: React.FormEvent) { e.preventDefault(); const response = await fetch("/api/admin/blocks", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(form) }); const payload = await response.json().catch(() => ({})) as { message?: string }; if (!response.ok) return toast.error(payload.message || "Nao foi possivel bloquear."); await onSaved(); toast.success("Horario bloqueado."); onClose(); } return <Modal title="Bloquear horario" onClose={onClose}><form onSubmit={submit} className="space-y-3"><Select label="Barbeiro" value={form.barberId} onChange={(v) => setForm({ ...form, barberId: v })} options={barbers} /><Input label="Data" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} /><Input label="Inicio" type="time" value={form.startTime} onChange={(v) => setForm({ ...form, startTime: v })} /><Input label="Fim" type="time" value={form.endTime} onChange={(v) => setForm({ ...form, endTime: v })} /><Input label="Motivo (opcional)" value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} /><button className="w-full rounded-md bg-primary py-3 font-bold text-primary-foreground">Bloquear</button></form></Modal>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center"><div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-border bg-background p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl">{title}</h2><button onClick={onClose} className="p-2"><X /></button></div>{children}</div></div>; }
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block text-sm font-medium">{label}<input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={label !== "Motivo (opcional)"} className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3" /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { id: string; name: string }[] }) { return <label className="block text-sm font-medium">{label}<select value={value} onChange={(e) => onChange(e.target.value)} required className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3"><option value="">Selecione</option>{options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>; }
