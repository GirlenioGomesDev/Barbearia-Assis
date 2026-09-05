import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

import { SmartImage } from "@/components/SmartImage";
import { PublicLayout, Section } from "@/components/site/PublicLayout";
import { useBarbershop } from "@/hooks/useBarbershop";
import { money } from "@/lib/format";
import { pageSeo } from "@/lib/seo";
import { loadPublicConfig } from "@/lib/public-config-server";
import { defaultConfig } from "@/lib/storage";
import { buildProductLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/produtos")({
  loader: () => loadPublicConfig(),
  head: ({ loaderData }) => pageSeo(loaderData?.config ?? defaultConfig, "produtos"),
  component: ProductsPage,
});

function ProductsPage() {
  const { activeProducts, barbershop } = useBarbershop();

  return (
    <PublicLayout>
      <Section
        headingLevel="h1"
        title="Produtos"
        subtitle="Itens para cuidar do visual em casa. Consulte pelo WhatsApp."
      >
        {!activeProducts.length ? (
          <p className="rounded-md border border-border p-4 text-muted-foreground">
            Nenhum produto está disponível no momento.
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeProducts.map((product) => {
            const wa = buildProductLink(
              barbershop.whatsapp,
              product.name,
              product.price,
              product.whatsappMessage,
            );
            return (
              <article key={product.id} className="surface-premium overflow-hidden rounded-xl">
                <SmartImage
                  value={product.imageUrl}
                  alt={product.name}
                  className="h-44 w-full object-cover"
                />
                <div className="p-5">
                  <h2 className="font-display text-xl tracking-wide">{product.name}</h2>
                  <p className="mt-2 min-h-12 text-sm text-muted-foreground">
                    {product.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-lg font-bold text-primary">{money(product.price)}</span>
                    {wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Consultar
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
