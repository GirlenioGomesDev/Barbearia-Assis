import { createFileRoute, Link } from "@tanstack/react-router";

import { SmartImage } from "@/components/SmartImage";
import { PublicLayout, Section } from "@/components/site/PublicLayout";
import { useBarbershop } from "@/hooks/useBarbershop";
import { duration, money } from "@/lib/format";
import { pageSeo } from "@/lib/seo";
import { loadPublicConfig } from "@/lib/public-config-server";
import { defaultConfig } from "@/lib/storage";

export const Route = createFileRoute("/servicos")({
  loader: () => loadPublicConfig(),
  head: ({ loaderData }) => pageSeo(loaderData?.config ?? defaultConfig, "servicos"),
  component: ServicesPage,
});

function ServicesPage() {
  const { activeServices } = useBarbershop();

  return (
    <PublicLayout>
      <Section
        headingLevel="h1"
        title="Serviços"
        subtitle="Tudo o que fazemos na cadeira, com preço transparente e tempo estimado."
      >
        {!activeServices.length ? (
          <p className="rounded-md border border-border p-4 text-muted-foreground">
            Os serviços ainda não foram cadastrados. Entre em contato com a barbearia.
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeServices.map((service) => (
            <article key={service.id} className="surface-premium overflow-hidden rounded-xl">
              {service.imageUrl ? (
                <SmartImage
                  value={service.imageUrl}
                  alt={service.name}
                  className="h-40 w-full object-cover"
                />
              ) : null}
              <div className="p-5">
                <h2 className="font-display text-xl tracking-wide">{service.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">{money(service.price)}</span>
                  <span className="text-xs text-muted-foreground">
                    {duration(service.durationMinutes)}
                  </span>
                </div>
                <Link
                  to="/agendamento"
                  search={{ servico: service.id }}
                  className="mt-4 block rounded-md bg-primary py-2 text-center text-sm font-semibold text-primary-foreground"
                >
                  Agendar este servico
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Section>
    </PublicLayout>
  );
}
