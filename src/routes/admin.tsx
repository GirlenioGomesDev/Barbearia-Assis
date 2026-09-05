import { createFileRoute } from "@tanstack/react-router";
import {
  BriefcaseBusiness,
  CalendarOff,
  Download,
  Image,
  LogOut,
  Package,
  Save,
  Scissors,
  Search,
  Settings,
  Store,
  Upload,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { SmartImage } from "@/components/SmartImage";
import { useBarbershop } from "@/hooks/useBarbershop";
import type { Barber, GalleryItem, Plan, Product, Service } from "@/data/barbershop";
import { duration, maskPhone, money, WEEKDAYS } from "@/lib/format";
import {
  isValidPhone,
  makeId,
  normalizePhone,
  validateBarber,
  validatePlan,
  validateProduct,
  validateService,
} from "@/lib/storage";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-assis.png";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel - Barbearia Assis" },
      { name: "description", content: "Painel administrativo seguro da Barbearia Assis." },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: AdminPage,
});

const TABS = [
  { id: "painel", label: "Visao geral", icon: Store },
  { id: "barbearia", label: "Minha barbearia", icon: BriefcaseBusiness },
  { id: "barbeiros", label: "Barbeiros", icon: Users },
  { id: "servicos", label: "Servicos", icon: Scissors },
  { id: "horarios", label: "Horarios", icon: CalendarOff },
  { id: "planos", label: "Planos", icon: Package },
  { id: "produtos", label: "Produtos", icon: Package },
  { id: "galeria", label: "Galeria", icon: Image },
  { id: "seo", label: "SEO e Google", icon: Search },
  { id: "configuracoes", label: "Configuracoes", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AdminPage() {
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("painel");
  const checkedSession = useRef(false);
  const {
    authenticated,
    barbershop,
    dirty,
    saving,
    configSource,
    loadAdmin,
    login,
    logout,
    publishChanges,
  } = useBarbershop();

  useEffect(() => {
    if (checkedSession.current) return;
    checkedSession.current = true;
    loadAdmin().catch(() => undefined);
  }, [loadAdmin]);

  async function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    try {
      await login(password);
      setPassword("");
      toast.success("Painel liberado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel entrar.");
    }
  }

  async function saveAll() {
    try {
      await publishChanges();
      toast.success("Alteracoes salvas e publicadas com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar.");
    }
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <form onSubmit={submitLogin} className="surface-premium w-full max-w-md rounded-xl p-6">
          <div className="flex items-center gap-3">
            <img src={barbershop.logoUrl || logo} alt="" className="h-12 w-12 object-contain" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">
                {barbershop.companyName}
              </p>
              <h1 className="font-display text-3xl tracking-wide">Painel</h1>
            </div>
          </div>
          <p className="mt-4 rounded-md border border-border bg-background/50 p-3 text-sm text-muted-foreground">
            A senha e validada no servidor. Nenhum segredo e enviado para o navegador.
          </p>
          <Field label="Senha" type="password" value={password} onChange={setPassword} />
          <button
            type="submit"
            className="mt-5 w-full rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground"
          >
            Entrar
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <img src={barbershop.logoUrl || logo} alt="" className="h-10 w-10 object-contain" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">
                Painel {barbershop.companyName}
              </p>
              <h1 className="font-display text-2xl tracking-wide">Edicao do site</h1>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {dirty ? (
              <span
                role="status"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-amber-500/40 px-3 text-sm text-amber-300"
              >
                Alterações não salvas
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void saveAll()}
              disabled={!dirty || saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold uppercase tracking-wide text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar alteracoes"}
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-semibold"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </header>
      {configSource === "fallback" ? (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200">
          O armazenamento do Cloudflare não está configurado. Você pode editar, mas a publicação
          ficará indisponível.
        </div>
      ) : null}

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[250px_1fr]">
        <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold",
                activeTab === id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-primary",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        <section>
          {activeTab === "painel" && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === "barbearia" && <BarbershopForm />}
          {activeTab === "barbeiros" && <BarbersAdmin />}
          {activeTab === "servicos" && <ServicesAdmin />}
          {activeTab === "horarios" && <ScheduleAdmin />}
          {activeTab === "planos" && <PlansAdmin />}
          {activeTab === "produtos" && <ProductsAdmin />}
          {activeTab === "galeria" && <GalleryAdmin />}
          {activeTab === "seo" && <SeoAdmin />}
          {activeTab === "configuracoes" && <SettingsAdmin />}
        </section>
      </div>
    </main>
  );
}

function Dashboard({ setActiveTab }: { setActiveTab: (tab: TabId) => void }) {
  const { barbers, services, products, plans, gallery, config } = useBarbershop();
  const missing = [
    ["Telefone", config.barbershop.phone || config.barbershop.whatsapp],
    ["Endereco", config.barbershop.address.street],
    ["Bairro", config.barbershop.address.district],
    ["Cidade", config.barbershop.address.city],
    ["Dominio", config.seo.officialDomain],
  ].filter(([, value]) => !value);
  const cards = [
    ["barbearia", "Minha barbearia", "Nome, contatos, banner e endereco."],
    ["barbeiros", "Barbeiros", `${barbers.length} profissionais cadastrados.`],
    ["servicos", "Servicos", `${services.filter((item) => item.active).length} ativos.`],
    ["planos", "Planos", `${plans.filter((item) => item.active).length} ativos.`],
    ["produtos", "Produtos", `${products.filter((item) => item.active).length} ativos.`],
    ["galeria", "Galeria", `${gallery.filter((item) => item.active).length} imagens ativas.`],
    ["seo", "SEO e Google", "Titulo, descricao, dominio e Search Console."],
    ["configuracoes", "Configuracoes", "Backup, importacao e restauracao."],
  ] as const;

  return (
    <Panel title="Visão geral" subtitle="Acompanhe e edite as informações publicadas no site.">
      {missing.length ? (
        <div className="mb-5 rounded-md border border-primary/40 bg-primary/10 p-4 text-sm text-primary">
          Falta revisar: {missing.map(([label]) => label).join(", ")}.
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([tab, title, text]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="surface-premium rounded-xl p-5 text-left transition hover:border-primary/70"
          >
            <h2 className="font-display text-xl tracking-wide">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{text}</p>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function BarbershopForm() {
  const { barbershop, updateBarbershop } = useBarbershop();
  const [draft, setDraft] = useState(barbershop);

  useEffect(() => setDraft(barbershop), [barbershop]);

  function applyDraft() {
    if (!draft.companyName.trim()) {
      toast.error("Informe o nome da barbearia.");
      return;
    }
    if (!isValidPhone(draft.whatsapp)) {
      toast.error("Informe um WhatsApp valido.");
      return;
    }
    updateBarbershop({
      ...draft,
      whatsapp: normalizePhone(draft.whatsapp),
      phone: normalizePhone(draft.phone || draft.whatsapp),
    });
    toast.success("Alteracoes adicionadas. Clique em Salvar alteracoes para publicar.");
  }

  return (
    <Panel title="Minha barbearia" subtitle="Dados principais que aparecem no site publico.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nome da barbearia"
          value={draft.companyName}
          onChange={(value) => setDraft({ ...draft, companyName: value })}
        />
        <ImagePicker
          label="Logotipo"
          value={draft.logoUrl ?? ""}
          onChange={(value) => setDraft({ ...draft, logoUrl: value })}
        />
        <Field
          label="Telefone"
          value={draft.phone ?? ""}
          onChange={(value) => setDraft({ ...draft, phone: value })}
        />
        <Field
          label="WhatsApp principal"
          value={draft.whatsapp}
          onChange={(value) => setDraft({ ...draft, whatsapp: value })}
        />
        <Field
          label="Instagram"
          value={draft.instagram ?? ""}
          onChange={(value) => setDraft({ ...draft, instagram: value })}
        />
        <Field
          label="E-mail"
          value={draft.email}
          onChange={(value) => setDraft({ ...draft, email: value })}
        />
        <Field
          label="Rua"
          value={draft.address.street}
          onChange={(value) => setDraft({ ...draft, address: { ...draft.address, street: value } })}
        />
        <Field
          label="Numero"
          value={draft.address.number}
          onChange={(value) => setDraft({ ...draft, address: { ...draft.address, number: value } })}
        />
        <Field
          label="Bairro"
          value={draft.address.district}
          onChange={(value) =>
            setDraft({ ...draft, address: { ...draft.address, district: value } })
          }
        />
        <Field
          label="Cidade"
          value={draft.address.city}
          onChange={(value) => setDraft({ ...draft, address: { ...draft.address, city: value } })}
        />
        <Field
          label="Estado"
          value={draft.address.state}
          onChange={(value) => setDraft({ ...draft, address: { ...draft.address, state: value } })}
        />
        <Field
          label="CEP"
          value={draft.address.zip}
          onChange={(value) => setDraft({ ...draft, address: { ...draft.address, zip: value } })}
        />
        <Field
          label="Google Maps"
          value={draft.googleMapsUrl ?? ""}
          onChange={(value) => setDraft({ ...draft, googleMapsUrl: value })}
        />
        <Field
          label="Perfil da Empresa no Google"
          value={draft.googleBusinessProfileUrl ?? ""}
          onChange={(value) => setDraft({ ...draft, googleBusinessProfileUrl: value })}
        />
      </div>
      <TextField
        label="Descricao curta"
        value={draft.description}
        onChange={(value) => setDraft({ ...draft, description: value })}
      />
      <TextField
        label="Sobre"
        value={draft.about}
        onChange={(value) => setDraft({ ...draft, about: value })}
      />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field
          label="Titulo do banner"
          value={draft.hero.title}
          onChange={(value) => setDraft({ ...draft, hero: { ...draft.hero, title: value } })}
        />
        <Field
          label="Subtitulo do banner"
          value={draft.hero.subtitle}
          onChange={(value) => setDraft({ ...draft, hero: { ...draft.hero, subtitle: value } })}
        />
        <TextField
          label="Texto do banner"
          value={draft.hero.description}
          onChange={(value) => setDraft({ ...draft, hero: { ...draft.hero, description: value } })}
        />
        <ImagePicker
          label="Imagem do banner"
          value={draft.hero.imageUrl}
          onChange={(value) => setDraft({ ...draft, hero: { ...draft.hero, imageUrl: value } })}
        />
      </div>
      <FooterSave onSave={applyDraft} />
    </Panel>
  );
}

function BarbersAdmin() {
  const { barbers, services, saveBarber, addBarber, deleteBarber } = useBarbershop();
  const [editing, setEditing] = useState<Barber | null>(null);

  function startNew() {
    setEditing({
      id: makeId("barbeiro"),
      name: "",
      bio: "",
      photoUrl: "",
      specialties: [],
      instagram: "",
      whatsapp: "",
      active: true,
      order: barbers.length,
      workingDays: [1, 2, 3, 4, 5, 6],
      startTime: "08:00",
      endTime: "18:00",
      slotIntervalMinutes: 30,
      serviceIds: services.map((service) => service.id),
      breakStartTime: "12:00",
      breakEndTime: "13:00",
      blockedDates: [],
    });
  }

  function persist(barber: Barber) {
    const normalized = { ...barber, whatsapp: normalizePhone(barber.whatsapp) };
    const error = validateBarber(normalized);
    if (error) {
      toast.error(error);
      return;
    }
    if (barbers.some((item) => item.id === barber.id)) saveBarber(normalized);
    else addBarber(normalized);
    setEditing(null);
    toast.success("Barbeiro atualizado. Clique em Salvar alteracoes para publicar.");
  }

  if (editing) {
    return (
      <BarberEditor
        barber={editing}
        services={services}
        onCancel={() => setEditing(null)}
        onSave={persist}
      />
    );
  }

  return (
    <Panel title="Barbeiros" subtitle="Barbeiros inativos nao aparecem no site nem no agendamento.">
      <button type="button" onClick={startNew} className="admin-primary">
        <Users className="h-4 w-4" /> Novo barbeiro
      </button>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {barbers.map((barber) => (
          <article key={barber.id} className="surface-premium rounded-xl p-5">
            <SmartImage
              value={barber.photoUrl}
              alt={barber.name}
              className="h-32 w-full rounded-lg object-cover"
            />
            <h2 className="mt-4 font-display text-xl tracking-wide">{barber.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{barber.bio}</p>
            <p className="mt-3 text-sm text-primary">{barber.active ? "Ativo" : "Inativo"}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setEditing(barber)} className="admin-secondary">
                Editar
              </button>
              <button
                type="button"
                onClick={() => saveBarber({ ...barber, active: !barber.active })}
                className="admin-secondary"
              >
                {barber.active ? "Desativar" : "Ativar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Excluir ${barber.name}? Esta acao sera publicada ao salvar.`))
                    deleteBarber(barber.id);
                }}
                className="admin-danger"
              >
                Excluir
              </button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function BarberEditor({
  barber,
  services,
  onCancel,
  onSave,
}: {
  barber: Barber;
  services: Service[];
  onCancel: () => void;
  onSave: (barber: Barber) => void;
}) {
  const [draft, setDraft] = useState(barber);
  const specialtiesText = draft.specialties.join(", ");
  const toggle = (id: string) =>
    setDraft({
      ...draft,
      serviceIds: draft.serviceIds.includes(id)
        ? draft.serviceIds.filter((item) => item !== id)
        : [...draft.serviceIds, id],
    });

  return (
    <Panel
      title="Editar barbeiro"
      subtitle="Configure servicos, expediente, pausa e datas indisponiveis."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nome"
          value={draft.name}
          onChange={(value) => setDraft({ ...draft, name: value })}
        />
        <ImagePicker
          label="Foto do barbeiro"
          value={draft.photoUrl ?? ""}
          onChange={(value) => setDraft({ ...draft, photoUrl: value })}
        />
        <Field
          label="WhatsApp individual"
          value={draft.whatsapp}
          onChange={(value) =>
            setDraft({ ...draft, whatsapp: maskPhone(value).replace(/\D/g, "") })
          }
        />
        <Field
          label="Instagram"
          value={draft.instagram ?? ""}
          onChange={(value) => setDraft({ ...draft, instagram: value })}
        />
        <Field
          label="Ordem"
          type="number"
          value={String(draft.order)}
          onChange={(value) => setDraft({ ...draft, order: Number(value) })}
        />
        <SelectField
          label="Ativo"
          value={draft.active ? "sim" : "nao"}
          onChange={(value) => setDraft({ ...draft, active: value === "sim" })}
          options={["sim", "nao"]}
        />
        <Field
          label="Inicio do expediente"
          type="time"
          value={draft.startTime}
          onChange={(value) => setDraft({ ...draft, startTime: value })}
        />
        <Field
          label="Fim do expediente"
          type="time"
          value={draft.endTime}
          onChange={(value) => setDraft({ ...draft, endTime: value })}
        />
        <SelectField
          label="Intervalo entre horarios"
          value={String(draft.slotIntervalMinutes)}
          onChange={(value) => setDraft({ ...draft, slotIntervalMinutes: Number(value) })}
          options={["15", "30", "45", "60"]}
        />
        <Field
          label="Inicio da pausa"
          type="time"
          value={draft.breakStartTime ?? ""}
          onChange={(value) => setDraft({ ...draft, breakStartTime: value })}
        />
        <Field
          label="Fim da pausa"
          type="time"
          value={draft.breakEndTime ?? ""}
          onChange={(value) => setDraft({ ...draft, breakEndTime: value })}
        />
      </div>
      <TextField
        label="Biografia"
        value={draft.bio}
        onChange={(value) => setDraft({ ...draft, bio: value })}
      />
      <Field
        label="Especialidades separadas por virgula"
        value={specialtiesText}
        onChange={(value) =>
          setDraft({
            ...draft,
            specialties: value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          })
        }
      />
      <CheckboxGroup
        label="Dias trabalhados"
        items={WEEKDAYS.map((label, index) => ({ id: index, label }))}
        selected={draft.workingDays}
        onToggle={(day) =>
          setDraft({
            ...draft,
            workingDays: draft.workingDays.includes(day)
              ? draft.workingDays.filter((item) => item !== day)
              : [...draft.workingDays, day].sort(),
          })
        }
      />
      <CheckboxGroup
        label="Servicos realizados"
        items={services.map((service) => ({ id: service.id, label: service.name }))}
        selected={draft.serviceIds}
        onToggle={toggle}
      />
      <FooterSave onSave={() => onSave(draft)} onCancel={onCancel} />
    </Panel>
  );
}

function ServicesAdmin() {
  const { services, activeBarbers, saveService, addService, deleteService } = useBarbershop();
  return (
    <CrudAdmin<Service>
      title="Servicos"
      subtitle="Servicos inativos nao aparecem no site nem no agendamento."
      items={services}
      makeNew={() => ({
        id: makeId("servico"),
        name: "",
        description: "",
        price: 0,
        durationMinutes: 30,
        imageUrl: "",
        active: true,
        order: services.length,
        barberIds: [],
      })}
      validate={validateService}
      onSave={(item) =>
        services.some((service) => service.id === item.id) ? saveService(item) : addService(item)
      }
      onDelete={(item) => {
        if (window.confirm("Excluir este servico?")) deleteService(item.id);
      }}
      renderSummary={(item) =>
        `${money(item.price)} - ${duration(item.durationMinutes)} - ${item.active ? "Ativo" : "Inativo"}`
      }
      renderEditor={(draft, setDraft) => (
        <>
          <Field
            label="Nome"
            value={draft.name}
            onChange={(value) => setDraft({ ...draft, name: value })}
          />
          <TextField
            label="Descricao"
            value={draft.description}
            onChange={(value) => setDraft({ ...draft, description: value })}
          />
          <Field
            label="Preco"
            type="number"
            value={String(draft.price)}
            onChange={(value) => setDraft({ ...draft, price: Number(value) })}
          />
          <Field
            label="Duracao em minutos"
            type="number"
            value={String(draft.durationMinutes)}
            onChange={(value) => setDraft({ ...draft, durationMinutes: Number(value) })}
          />
          <Field
            label="Ordem"
            type="number"
            value={String(draft.order)}
            onChange={(value) => setDraft({ ...draft, order: Number(value) })}
          />
          <ImagePicker
            label="Foto do servico"
            value={draft.imageUrl ?? ""}
            onChange={(value) => setDraft({ ...draft, imageUrl: value })}
          />
          <ToggleActive
            active={draft.active}
            onChange={(active) => setDraft({ ...draft, active })}
          />
          <CheckboxGroup
            label="Barbeiros que realizam"
            items={activeBarbers.map((barber) => ({ id: barber.id, label: barber.name }))}
            selected={draft.barberIds}
            onToggle={(id) =>
              setDraft({
                ...draft,
                barberIds: draft.barberIds.includes(id)
                  ? draft.barberIds.filter((item) => item !== id)
                  : [...draft.barberIds, id],
              })
            }
          />
        </>
      )}
    />
  );
}

function PlansAdmin() {
  const { plans, savePlan, addPlan, deletePlan } = useBarbershop();
  return (
    <CrudAdmin<Plan>
      title="Planos"
      subtitle="Sem pagamento automatico. O botao abre o WhatsApp."
      items={plans}
      makeNew={() => ({
        id: makeId("plano"),
        name: "",
        description: "",
        price: 0,
        benefits: [],
        notes: "",
        imageUrl: "",
        buttonText: "Tenho interesse",
        whatsappMessage: "Tenho interesse neste plano.",
        active: true,
        order: plans.length,
      })}
      validate={validatePlan}
      onSave={(item) =>
        plans.some((plan) => plan.id === item.id) ? savePlan(item) : addPlan(item)
      }
      onDelete={(item) => {
        if (window.confirm("Excluir este plano?")) deletePlan(item.id);
      }}
      renderSummary={(item) => `${money(item.price)} - ${item.active ? "Ativo" : "Inativo"}`}
      renderEditor={(draft, setDraft) => (
        <>
          <Field
            label="Nome"
            value={draft.name}
            onChange={(value) => setDraft({ ...draft, name: value })}
          />
          <TextField
            label="Descricao"
            value={draft.description}
            onChange={(value) => setDraft({ ...draft, description: value })}
          />
          <Field
            label="Preco"
            type="number"
            value={String(draft.price)}
            onChange={(value) => setDraft({ ...draft, price: Number(value) })}
          />
          <Field
            label="Beneficios separados por virgula"
            value={draft.benefits.join(", ")}
            onChange={(value) =>
              setDraft({
                ...draft,
                benefits: value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
          <TextField
            label="Observacoes"
            value={draft.notes ?? ""}
            onChange={(value) => setDraft({ ...draft, notes: value })}
          />
          <ImagePicker
            label="Imagem opcional"
            value={draft.imageUrl ?? ""}
            onChange={(value) => setDraft({ ...draft, imageUrl: value })}
          />
          <Field
            label="Texto do botao"
            value={draft.buttonText}
            onChange={(value) => setDraft({ ...draft, buttonText: value })}
          />
          <TextField
            label="Mensagem para WhatsApp"
            value={draft.whatsappMessage}
            onChange={(value) => setDraft({ ...draft, whatsappMessage: value })}
          />
          <Field
            label="Ordem"
            type="number"
            value={String(draft.order)}
            onChange={(value) => setDraft({ ...draft, order: Number(value) })}
          />
          <ToggleActive
            active={draft.active}
            onChange={(active) => setDraft({ ...draft, active })}
          />
        </>
      )}
    />
  );
}

function ProductsAdmin() {
  const { products, saveProduct, addProduct, deleteProduct } = useBarbershop();
  return (
    <CrudAdmin<Product>
      title="Produtos"
      subtitle="Nao ha estoque, carrinho, checkout ou pagamento."
      items={products}
      makeNew={() => ({
        id: makeId("produto"),
        name: "",
        description: "",
        price: 0,
        imageUrl: "",
        whatsappMessage: "Tenho interesse neste produto.",
        active: true,
        order: products.length,
      })}
      validate={validateProduct}
      onSave={(item) =>
        products.some((product) => product.id === item.id) ? saveProduct(item) : addProduct(item)
      }
      onDelete={(item) => {
        if (window.confirm("Excluir este produto?")) deleteProduct(item.id);
      }}
      renderSummary={(item) => `${money(item.price)} - ${item.active ? "Ativo" : "Inativo"}`}
      renderEditor={(draft, setDraft) => (
        <>
          <Field
            label="Nome"
            value={draft.name}
            onChange={(value) => setDraft({ ...draft, name: value })}
          />
          <TextField
            label="Descricao"
            value={draft.description}
            onChange={(value) => setDraft({ ...draft, description: value })}
          />
          <Field
            label="Preco"
            type="number"
            value={String(draft.price)}
            onChange={(value) => setDraft({ ...draft, price: Number(value) })}
          />
          <ImagePicker
            label="Foto"
            value={draft.imageUrl ?? ""}
            onChange={(value) => setDraft({ ...draft, imageUrl: value })}
          />
          <TextField
            label="Mensagem de interesse"
            value={draft.whatsappMessage}
            onChange={(value) => setDraft({ ...draft, whatsappMessage: value })}
          />
          <Field
            label="Ordem"
            type="number"
            value={String(draft.order)}
            onChange={(value) => setDraft({ ...draft, order: Number(value) })}
          />
          <ToggleActive
            active={draft.active}
            onChange={(active) => setDraft({ ...draft, active })}
          />
        </>
      )}
    />
  );
}

function GalleryAdmin() {
  const { gallery, saveGalleryItem, addGalleryItem, deleteGalleryItem } = useBarbershop();
  return (
    <CrudAdmin<GalleryItem & { description: string; name: string }>
      title="Galeria"
      subtitle="Imagens ativas aparecem na galeria publica."
      items={gallery.map((item) => ({ ...item, name: item.title, description: item.category }))}
      makeNew={() => ({
        id: makeId("foto"),
        title: "",
        name: "",
        description: "",
        category: "Cortes",
        imageUrl: "",
        active: true,
        order: gallery.length,
      })}
      validate={(item) =>
        !item.title.trim() ? "Informe o titulo." : !item.imageUrl ? "Envie uma imagem." : null
      }
      onSave={(item) => {
        const normalized = {
          id: item.id,
          title: item.title,
          category: item.category || item.description,
          imageUrl: item.imageUrl,
          active: item.active,
          order: item.order,
        };
        if (gallery.some((galleryItem) => galleryItem.id === item.id)) {
          saveGalleryItem(normalized);
        } else {
          addGalleryItem(normalized);
        }
      }}
      onDelete={(item) => {
        if (window.confirm("Excluir esta imagem?")) deleteGalleryItem(item.id);
      }}
      renderSummary={(item) => `${item.category} - ${item.active ? "Ativa" : "Inativa"}`}
      renderEditor={(draft, setDraft) => (
        <>
          <Field
            label="Titulo"
            value={draft.title}
            onChange={(value) => setDraft({ ...draft, title: value, name: value })}
          />
          <Field
            label="Categoria"
            value={draft.category}
            onChange={(value) => setDraft({ ...draft, category: value, description: value })}
          />
          <ImagePicker
            label="Imagem"
            value={draft.imageUrl}
            onChange={(value) => setDraft({ ...draft, imageUrl: value })}
          />
          <Field
            label="Ordem"
            type="number"
            value={String(draft.order)}
            onChange={(value) => setDraft({ ...draft, order: Number(value) })}
          />
          <ToggleActive
            active={draft.active}
            onChange={(active) => setDraft({ ...draft, active })}
          />
        </>
      )}
    />
  );
}

function ScheduleAdmin() {
  const { config, setConfigDraft } = useBarbershop();
  return (
    <Panel
      title="Horarios"
      subtitle="Configure funcionamento geral, antecedencia e bloqueios globais."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Antecedencia minima em minutos"
          type="number"
          value={String(config.booking.minAdvanceMinutes)}
          onChange={(value) =>
            setConfigDraft({
              ...config,
              booking: { ...config.booking, minAdvanceMinutes: Number(value) },
            })
          }
        />
        <Field
          label="Dias futuros exibidos"
          type="number"
          value={String(config.booking.futureDays)}
          onChange={(value) =>
            setConfigDraft({ ...config, booking: { ...config.booking, futureDays: Number(value) } })
          }
        />
      </div>
      <div className="mt-5 grid gap-3">
        {config.barbershop.workingHours.map((hour) => (
          <div
            key={hour.weekday}
            className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_140px_140px_110px]"
          >
            <strong>{hour.label}</strong>
            <input
              type="time"
              value={hour.startTime}
              onChange={(event) =>
                setConfigDraft({
                  ...config,
                  barbershop: {
                    ...config.barbershop,
                    workingHours: config.barbershop.workingHours.map((item) =>
                      item.weekday === hour.weekday
                        ? { ...item, startTime: event.target.value }
                        : item,
                    ),
                  },
                })
              }
              className="admin-input"
            />
            <input
              type="time"
              value={hour.endTime}
              onChange={(event) =>
                setConfigDraft({
                  ...config,
                  barbershop: {
                    ...config.barbershop,
                    workingHours: config.barbershop.workingHours.map((item) =>
                      item.weekday === hour.weekday
                        ? { ...item, endTime: event.target.value }
                        : item,
                    ),
                  },
                })
              }
              className="admin-input"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hour.closed}
                onChange={(event) =>
                  setConfigDraft({
                    ...config,
                    barbershop: {
                      ...config.barbershop,
                      workingHours: config.barbershop.workingHours.map((item) =>
                        item.weekday === hour.weekday
                          ? { ...item, closed: event.target.checked }
                          : item,
                      ),
                    },
                  })
                }
              />{" "}
              Fechado
            </label>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SeoAdmin() {
  const { config, setConfigDraft } = useBarbershop();
  const seo = config.seo;
  const warnings = [
    !config.barbershop.address.district && "bairro",
    !config.barbershop.address.city && "cidade",
    !config.barbershop.whatsapp && "telefone",
    !seo.officialDomain && "dominio oficial",
  ].filter(Boolean);
  const update = (next: typeof seo) => setConfigDraft({ ...config, seo: next });

  return (
    <Panel title="SEO e Google" subtitle="Textos que ajudam o Google a entender a barbearia.">
      {warnings.length ? (
        <div className="mb-4 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
          Revise: {warnings.join(", ")}.
        </div>
      ) : null}
      <div className="mb-5 rounded-xl border border-border bg-background/50 p-4">
        <p className="text-xs text-[#1a0dab]">{seo.canonicalUrl}</p>
        <h2 className="mt-1 text-xl text-[#1a0dab]">{seo.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{seo.description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={`Titulo SEO (${seo.title.length}/70)`}
          value={seo.title}
          onChange={(value) => update({ ...seo, title: value })}
        />
        <Field
          label={`Descricao SEO (${seo.description.length}/180)`}
          value={seo.description}
          onChange={(value) => update({ ...seo, description: value })}
        />
        <Field
          label="Nome comercial"
          value={seo.businessName}
          onChange={(value) => update({ ...seo, businessName: value })}
        />
        <Field
          label="Servico principal"
          value={seo.primaryService}
          onChange={(value) => update({ ...seo, primaryService: value })}
        />
        <Field
          label="Servicos secundarios"
          value={seo.secondaryServices.join(", ")}
          onChange={(value) =>
            update({
              ...seo,
              secondaryServices: value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
        />
        <Field
          label="Bairro"
          value={seo.district}
          onChange={(value) => update({ ...seo, district: value })}
        />
        <Field
          label="Cidade"
          value={seo.city}
          onChange={(value) => update({ ...seo, city: value })}
        />
        <Field
          label="Estado"
          value={seo.state}
          onChange={(value) => update({ ...seo, state: value })}
        />
        <Field
          label="Regiao atendida"
          value={seo.serviceArea}
          onChange={(value) => update({ ...seo, serviceArea: value })}
        />
        <Field
          label="Dominio oficial"
          value={seo.officialDomain}
          onChange={(value) => update({ ...seo, officialDomain: value })}
        />
        <Field
          label="URL canonica"
          value={seo.canonicalUrl}
          onChange={(value) => update({ ...seo, canonicalUrl: value })}
        />
        <ImagePicker
          label="Imagem de compartilhamento"
          value={seo.shareImageUrl ?? ""}
          onChange={(value) => update({ ...seo, shareImageUrl: value })}
        />
        <Field
          label="Google Maps"
          value={seo.googleMapsUrl ?? ""}
          onChange={(value) => update({ ...seo, googleMapsUrl: value })}
        />
        <Field
          label="Perfil da Empresa no Google"
          value={seo.googleBusinessProfileUrl ?? ""}
          onChange={(value) => update({ ...seo, googleBusinessProfileUrl: value })}
        />
        <Field
          label="Codigo do Search Console"
          value={seo.googleSiteVerification}
          onChange={(value) =>
            update({ ...seo, googleSiteVerification: value.replace(/[^A-Za-z0-9_-]/g, "") })
          }
        />
      </div>
    </Panel>
  );
}

function SettingsAdmin() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { exportBackup, importBackup, restoreDefaults } = useBarbershop();

  function downloadBackup() {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "barbearia-assis-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file
      .text()
      .then((content) => {
        if (window.confirm("Importar este backup? Os dados atuais serao substituidos ao salvar.")) {
          importBackup(content);
          toast.success("Backup validado. Clique em Salvar alteracoes para publicar.");
        }
      })
      .catch(() => toast.error("Nao foi possivel ler o arquivo."));
    event.target.value = "";
  }

  return (
    <Panel title="Configuracoes" subtitle="Backup, restauracao e limitacoes da aplicacao.">
      <div className="rounded-md border border-border bg-background/50 p-4 text-sm text-muted-foreground">
        Esta aplicacao nao usa banco de dados e nao guarda dados de clientes. Os horarios sao apenas
        solicitacoes enviadas ao WhatsApp.
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={downloadBackup} className="admin-primary">
          <Download className="h-4 w-4" /> Exportar JSON
        </button>
        <button type="button" onClick={() => inputRef.current?.click()} className="admin-secondary">
          <Upload className="h-4 w-4" /> Importar backup
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={importFile}
        />
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Restaurar os dados padrao?")) restoreDefaults();
          }}
          className="admin-danger"
        >
          Restaurar padrao
        </button>
      </div>
    </Panel>
  );
}

function CrudAdmin<T extends { id: string; name: string; description: string; active: boolean }>({
  title,
  subtitle,
  items,
  makeNew,
  validate,
  onSave,
  onDelete,
  renderSummary,
  renderEditor,
}: {
  title: string;
  subtitle: string;
  items: T[];
  makeNew: () => T;
  validate: (item: T) => string | null;
  onSave: (item: T) => void;
  onDelete: (item: T) => void;
  renderSummary: (item: T) => string;
  renderEditor: (draft: T, setDraft: (draft: T) => void) => React.ReactNode;
}) {
  const [editing, setEditing] = useState<T | null>(null);

  if (editing) {
    return (
      <Panel title={`Editar ${title.toLowerCase()}`} subtitle={subtitle}>
        <div className="space-y-4">
          {renderEditor(editing, setEditing)}
          <FooterSave
            onSave={() => {
              const error = validate(editing);
              if (error) {
                toast.error(error);
                return;
              }
              onSave(editing);
              setEditing(null);
              toast.success("Alteracao adicionada. Clique em Salvar alteracoes para publicar.");
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      </Panel>
    );
  }

  return (
    <Panel title={title} subtitle={subtitle}>
      <button type="button" onClick={() => setEditing(makeNew())} className="admin-primary">
        + Novo
      </button>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="surface-premium rounded-xl p-5">
            <h2 className="font-display text-xl tracking-wide">{item.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            <p className="mt-3 text-sm text-primary">{renderSummary(item)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setEditing(item)} className="admin-secondary">
                Editar
              </button>
              <button
                type="button"
                onClick={() => onSave({ ...item, active: !item.active })}
                className="admin-secondary"
              >
                {item.active ? "Desativar" : "Ativar"}
              </button>
              <button type="button" onClick={() => onDelete(item)} className="admin-danger">
                Excluir
              </button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="surface-premium rounded-xl p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="font-display text-3xl tracking-wide">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        <div className="gold-rule mt-3" />
      </div>
      {children}
    </div>
  );
}

function FooterSave({ onSave, onCancel }: { onSave: () => void; onCancel?: () => void }) {
  return (
    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
      <button type="button" onClick={onSave} className="admin-primary">
        <Save className="h-4 w-4" /> Aplicar no rascunho
      </button>
      {onCancel ? (
        <button type="button" onClick={onCancel} className="admin-secondary">
          Cancelar
        </button>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="admin-input mt-1"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="admin-input mt-1"
      />
    </label>
  );
}

function ImagePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, queueImageDeletion } = useBarbershop();
  const [uploading, setUploading] = useState(false);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Envie JPEG, PNG ou WebP.");
      event.target.value = "";
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Escolha uma imagem com ate 3 MB.");
      event.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const nextUrl = await uploadImage(file);
      if (value) queueImageDeletion(value);
      onChange(nextUrl);
      toast.success("Imagem enviada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel enviar.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="block text-sm font-medium">
      {label}
      <div className="mt-1 rounded-xl border border-border bg-background/45 p-3">
        {value ? (
          <SmartImage
            value={value}
            alt={label}
            className="mb-3 h-40 w-full rounded-lg object-cover"
          />
        ) : (
          <div className="mb-3 flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
            <Image className="h-8 w-8" />
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="admin-secondary"
          >
            <Upload className="h-4 w-4" /> {uploading ? "Enviando..." : "Escolher foto"}
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => {
                queueImageDeletion(value);
                onChange("");
              }}
              className="admin-danger"
            >
              Remover foto
            </button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={chooseFile}
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="admin-input mt-1"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxGroup<T extends string | number>({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: { id: T; label: string }[];
  selected: T[];
  onToggle: (id: T) => void;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <label
            key={String(item.id)}
            className="flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm"
          >
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => onToggle(item.id)}
            />
            {item.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ToggleActive({
  active,
  onChange,
}: {
  active: boolean;
  onChange: (active: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm">
      <input
        type="checkbox"
        checked={active}
        onChange={(event) => onChange(event.target.checked)}
      />
      Ativo
    </label>
  );
}
