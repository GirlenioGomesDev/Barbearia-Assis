import { createFileRoute, Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";

import { SmartImage } from "@/components/SmartImage";
import { PublicLayout, Section } from "@/components/site/PublicLayout";
import { useBarbershop } from "@/hooks/useBarbershop";
import { instagramLink } from "@/lib/format";
import { pageSeo } from "@/lib/seo";
import { loadPublicConfig } from "@/lib/public-config-server";
import { defaultConfig } from "@/lib/storage";

export const Route = createFileRoute("/barbeiros")({
  loader: () => loadPublicConfig(),
  head: ({ loaderData }) => pageSeo(loaderData?.config ?? defaultConfig, "barbeiros"),
  component: BarbersPage,
});

function BarbersPage() {
  const { activeBarbers } = useBarbershop();

  return (
    <PublicLayout>
      <Section
        headingLevel="h1"
        title="Barbeiros"
        subtitle="Escolha o profissional da sua preferência e solicite o horário pelo WhatsApp."
      >
        {!activeBarbers.length ? (
          <p className="rounded-md border border-border p-4 text-muted-foreground">
            A equipe ainda não foi cadastrada. Entre em contato com a barbearia.
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeBarbers.map((barber) => {
            const ig = instagramLink(barber.instagram);
            return (
              <article key={barber.id} className="surface-premium overflow-hidden rounded-xl">
                <SmartImage
                  value={barber.photoUrl}
                  alt={barber.name}
                  className="h-56 w-full object-cover"
                  fallbackClassName="h-56"
                />
                <div className="p-5">
                  <h2 className="font-display text-xl tracking-wide">{barber.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{barber.bio}</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {barber.specialties.map((specialty) => (
                      <li
                        key={specialty}
                        className="rounded-full border border-primary/40 px-3 py-1 text-xs text-primary"
                      >
                        {specialty}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center gap-3">
                    <Link
                      to="/agendamento"
                      search={{ barbeiro: barber.id }}
                      className="flex-1 rounded-md bg-primary py-2 text-center text-sm font-semibold text-primary-foreground"
                    >
                      Agendar com este barbeiro
                    </Link>
                    {ig ? (
                      <a
                        href={ig}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Instagram de ${barber.name}`}
                        className="rounded-md border border-border p-2 text-muted-foreground transition hover:text-primary"
                      >
                        <Instagram className="h-5 w-5" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Section>
    </PublicLayout>
  );
}
