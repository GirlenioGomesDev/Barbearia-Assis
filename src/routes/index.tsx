import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Scissors } from "lucide-react";

import { SmartImage } from "@/components/SmartImage";
import { PublicLayout, Section } from "@/components/site/PublicLayout";
import { useBarbershop } from "@/hooks/useBarbershop";
import { duration, money } from "@/lib/format";
import { pageSeo } from "@/lib/seo";
import { loadPublicConfig } from "@/lib/public-config-server";
import { defaultConfig } from "@/lib/storage";
import { buildPlanLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/")({
  loader: () => loadPublicConfig(),
  head: ({ loaderData }) => pageSeo(loaderData?.config ?? defaultConfig, "home"),
  component: Home,
});

function Home() {
  const { activeServices, activeBarbers, activePlans, barbershop } = useBarbershop();

  return (
    <PublicLayout>
      <section className="relative isolate overflow-hidden">
        <img
          src={barbershop.hero.imageUrl}
          alt={`Banner da ${barbershop.companyName}`}
          className="absolute inset-0 h-full w-full object-cover opacity-35"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start px-4 py-24 sm:py-32">
          <span className="rounded-full border border-primary/40 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
            Solicite pelo WhatsApp
          </span>
          <h1 className="mt-5 font-display text-5xl leading-none tracking-wide text-gradient-gold sm:text-7xl">
            {barbershop.hero.title}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-foreground/90">{barbershop.hero.subtitle}</p>
          <p className="mt-3 max-w-xl text-muted-foreground">{barbershop.hero.description}</p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              to="/agendamento"
              className="rounded-md bg-primary px-6 py-3 text-center font-bold uppercase tracking-wide text-primary-foreground shadow-gold transition hover:bg-primary/90"
            >
              Agendar horário
            </Link>
            <Link
              to="/servicos"
              className="rounded-md border border-border px-6 py-3 text-center font-semibold text-foreground transition hover:border-primary hover:text-primary"
            >
              Ver servicos
            </Link>
          </div>
        </div>
      </section>

      <Section className="py-10">
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          {[
            {
              icon: Scissors,
              title: "Serviços claros",
              text: "Cortes, barba e acabamentos com preço e duração.",
            },
            {
              icon: Clock,
              title: "Solicitacao rapida",
              text: "Você escolhe data e horário; o barbeiro confirma pelo WhatsApp.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="surface-premium flex h-full flex-col rounded-xl p-5">
              <Icon className="h-6 w-6 text-primary" aria-hidden />
              <h2 className="mt-3 font-display text-lg tracking-wide">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Serviços" subtitle="Preços e durações cadastrados pela barbearia.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeServices.slice(0, 6).map((service) => (
            <article key={service.id} className="surface-premium rounded-xl p-5">
              <h2 className="font-display text-xl tracking-wide">{service.name}</h2>
              <p className="mt-2 min-h-10 text-sm text-muted-foreground">{service.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-bold text-primary">{money(service.price)}</span>
                <span className="text-xs text-muted-foreground">
                  {duration(service.durationMinutes)}
                </span>
              </div>
              <Link
                to="/agendamento"
                search={{ servico: service.id }}
                className="mt-4 block rounded-md border border-primary/50 py-2 text-center text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                Agendar este servico
              </Link>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Nossos barbeiros">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeBarbers.map((barber) => (
            <article key={barber.id} className="surface-premium overflow-hidden rounded-xl">
              <SmartImage
                value={barber.photoUrl}
                alt={barber.name}
                className="h-52 w-full object-cover"
                fallbackClassName="h-52"
              />
              <div className="p-5">
                <h2 className="font-display text-xl tracking-wide">{barber.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{barber.bio}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {barber.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="rounded-full border border-primary/30 px-2 py-0.5 text-xs text-primary"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
                <Link
                  to="/agendamento"
                  search={{ barbeiro: barber.id }}
                  className="mt-4 block rounded-md bg-primary py-2 text-center text-sm font-semibold text-primary-foreground"
                >
                  Agendar com este barbeiro
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {activePlans.length ? (
        <Section
          title="Planos e pacotes"
          subtitle="Pacotes consultivos, sem assinatura automatica ou pagamento online."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activePlans.map((plan) => {
              const link = buildPlanLink(barbershop.whatsapp, plan.name, plan.whatsappMessage);
              return (
                <article key={plan.id} className="surface-premium rounded-xl p-5">
                  <h2 className="font-display text-xl tracking-wide">{plan.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  <p className="mt-4 text-lg font-bold text-primary">{money(plan.price)}</p>
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {plan.benefits.map((benefit) => (
                      <li key={benefit}>{benefit}</li>
                    ))}
                  </ul>
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 block rounded-md bg-primary py-2 text-center text-sm font-semibold text-primary-foreground"
                    >
                      {plan.buttonText}
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>
        </Section>
      ) : null}

      <Section className="pb-20">
        <div className="surface-premium flex flex-col items-center gap-4 rounded-xl px-6 py-12 text-center">
          <h2 className="font-display text-3xl tracking-wide text-gradient-gold">
            Pronto para o proximo corte?
          </h2>
          <p className="max-w-lg text-muted-foreground">
            Esta é uma solicitação de agendamento. O horário será confirmado pelo barbeiro no
            WhatsApp.
          </p>
          <Link
            to="/agendamento"
            className="rounded-md bg-primary px-6 py-3 font-bold uppercase tracking-wide text-primary-foreground"
          >
            Agendar horário
          </Link>
        </div>
      </Section>
    </PublicLayout>
  );
}
