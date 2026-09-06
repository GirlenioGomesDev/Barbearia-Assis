import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Instagram,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Settings,
  X,
} from "lucide-react";

import { useBarbershop } from "@/hooks/useBarbershop";
import { instagramLink, whatsappLink } from "@/lib/format";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-assis.png";

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/servicos", label: "Serviços" },
  { to: "/barbeiros", label: "Barbeiros" },
  { to: "/planos", label: "Planos" },
  { to: "/produtos", label: "Produtos" },
  { to: "/galeria", label: "Galeria" },
  { to: "/contato", label: "Contato" },
] as const;

export function PublicLayout({ children }: { children: ReactNode }) {
  const { barbershop } = useBarbershop();
  const [open, setOpen] = useState(false);
  const wa = whatsappLink(
    barbershop.whatsapp,
    "Ola! Vim pelo site e gostaria de mais informacoes.",
  );
  const ig = instagramLink(barbershop.instagram);
  const logoUrl = barbershop.logoUrl || logo;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <img src={logoUrl} alt={barbershop.companyName} className="h-9 w-9 object-contain" />
            <span className="font-display text-xl tracking-wide text-gradient-gold">
              {barbershop.companyName}
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                activeProps={{ className: "text-primary" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
            <a href="/meu-plano" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">Meu plano</a>
            <Link
              to="/agendamento"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Agendar
            </Link>
          </nav>

          <button
            type="button"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="rounded-md border border-border p-2 text-foreground md:hidden"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div className={cn("border-t border-border/70 md:hidden", open ? "block" : "hidden")}>
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="border-b border-border/40 py-3 text-sm font-medium text-muted-foreground last:border-0"
                activeProps={{ className: "text-primary" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
            <a href="/meu-plano" onClick={() => setOpen(false)} className="border-b border-border/40 py-3 text-sm font-semibold text-muted-foreground">Meu plano / Meu histórico</a>
            <Link
              to="/agendamento"
              onClick={() => setOpen(false)}
              className="border-b border-border/40 py-3 text-sm font-bold text-primary"
            >
              Agendar horário
            </Link>

            <div className="my-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Área do barbeiro
              </p>
              <Link
                to="/agenda"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-2 border-b border-border/40 py-2 text-sm font-bold text-foreground"
              >
                <CalendarDays className="h-4 w-4 text-primary" />
                Abrir agenda
              </Link>
              <a href="/clientes-planos" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-2 border-b border-border/40 py-2 text-sm font-semibold text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" />Clientes com plano</a>
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-muted-foreground"
              >
                <Settings className="h-4 w-4 text-primary" />
                Configurar site
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-0">{children}</main>

      <footer className="border-t border-border/70 bg-card/40">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <img src={logoUrl} alt="" className="h-8 w-8 object-contain" aria-hidden />
              <span className="font-display text-lg text-gradient-gold">
                {barbershop.companyName}
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{barbershop.description}</p>
            <a href="/meu-plano" className="mt-4 inline-block text-xs font-semibold text-primary">Consultar meu plano e histórico</a>
          </div>

          <div className="text-sm">
            <h2 className="font-display text-base tracking-wide text-foreground">Contato</h2>
            <div className="mt-3 space-y-2 text-muted-foreground">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                <span>
                  {barbershop.address.street}, {barbershop.address.number} -{" "}
                  {barbershop.address.district}
                  <br />
                  {barbershop.address.city}/{barbershop.address.state}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" aria-hidden />
                {barbershop.phone || barbershop.whatsapp}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" aria-hidden />
                {barbershop.email}
              </p>
            </div>
          </div>

          <div className="text-sm">
            <h2 className="font-display text-base tracking-wide text-foreground">Redes</h2>
            <div className="mt-3 flex gap-3">
              {ig ? (
                <SocialLink href={ig} label="Instagram">
                  <Instagram className="h-5 w-5" />
                </SocialLink>
              ) : null}
              {wa ? (
                <SocialLink href={wa} label="WhatsApp">
                  <MessageCircle className="h-5 w-5" />
                </SocialLink>
              ) : null}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                to="/agenda"
                className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary"
              >
                <CalendarDays className="h-4 w-4" />
                Agenda do barbeiro
              </Link>
              <a href="/clientes-planos" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary"><CalendarDays className="h-4 w-4" />Clientes com plano</a>
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
              >
                <Settings className="h-4 w-4" />
                Configurar site
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
          (c) {new Date().getFullYear()} {barbershop.companyName}. Todos os direitos reservados.
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-50 flex gap-2 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border py-3 text-sm font-semibold text-foreground"
          >
            <MessageCircle className="h-4 w-4 text-primary" /> WhatsApp
          </a>
        ) : null}
        <Link
          to="/agendamento"
          className="flex flex-1 items-center justify-center rounded-md bg-primary py-3 text-sm font-bold text-primary-foreground"
        >
          Agendar
        </Link>
      </div>
    </div>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-md border border-border p-2 text-muted-foreground transition hover:text-primary"
      aria-label={label}
    >
      {children}
    </a>
  );
}

export function Section({
  title,
  subtitle,
  children,
  className,
  headingLevel = "h2",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headingLevel?: "h1" | "h2";
}) {
  const Heading = headingLevel;
  return (
    <section className={cn("mx-auto w-full max-w-6xl px-4 py-14", className)}>
      {title ? (
        <header className="mb-8">
          <Heading className="font-display text-3xl tracking-wide text-foreground sm:text-4xl">
            {title}
          </Heading>
          <div className="gold-rule mt-3" />
          {subtitle ? <p className="mt-3 max-w-2xl text-muted-foreground">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
