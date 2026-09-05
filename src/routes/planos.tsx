import { createFileRoute } from "@tanstack/react-router";

import { SmartImage } from "@/components/SmartImage";
import { PublicLayout, Section } from "@/components/site/PublicLayout";
import { money } from "@/lib/format";
import { pageSeo } from "@/lib/seo";
import { loadPublicConfig } from "@/lib/public-config-server";
import { defaultConfig } from "@/lib/storage";
import { buildPlanLink } from "@/lib/whatsapp";
import { useBarbershop } from "@/hooks/useBarbershop";

export const Route = createFileRoute("/planos")({
  loader: () => loadPublicConfig(),
  head: ({ loaderData }) => pageSeo(loaderData?.config ?? defaultConfig, "planos"),
  component: PlansPage,
});

function PlansPage() {
  const { activePlans, barbershop } = useBarbershop();

  return (
    <PublicLayout>
      <Section
        headingLevel="h1"
        title="Planos e pacotes"
        subtitle="Pacotes combinados diretamente pelo WhatsApp, sem assinatura automática."
      >
        {activePlans.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activePlans.map((plan) => {
              const link = buildPlanLink(barbershop.whatsapp, plan.name, plan.whatsappMessage);
              return (
                <article key={plan.id} className="surface-premium overflow-hidden rounded-xl">
                  {plan.imageUrl ? (
                    <SmartImage
                      value={plan.imageUrl}
                      alt={plan.name}
                      className="h-44 w-full object-cover"
                    />
                  ) : null}
                  <div className="p-5">
                    <h2 className="font-display text-xl tracking-wide">{plan.name}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                    <p className="mt-4 text-lg font-bold text-primary">{money(plan.price)}</p>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {plan.benefits.map((benefit) => (
                        <li key={benefit}>{benefit}</li>
                      ))}
                    </ul>
                    {plan.notes ? (
                      <p className="mt-3 text-xs text-muted-foreground">{plan.notes}</p>
                    ) : null}
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
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
            Nenhum plano ativo no momento.
          </p>
        )}
      </Section>
    </PublicLayout>
  );
}
