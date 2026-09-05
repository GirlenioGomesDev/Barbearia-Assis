import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { SmartImage } from "@/components/SmartImage";
import { PublicLayout, Section } from "@/components/site/PublicLayout";
import { useBarbershop } from "@/hooks/useBarbershop";
import { cn } from "@/lib/utils";
import { pageSeo } from "@/lib/seo";
import { loadPublicConfig } from "@/lib/public-config-server";
import { defaultConfig } from "@/lib/storage";

export const Route = createFileRoute("/galeria")({
  loader: () => loadPublicConfig(),
  head: ({ loaderData }) => pageSeo(loaderData?.config ?? defaultConfig, "galeria"),
  component: GalleryPage,
});

function GalleryPage() {
  const { activeGallery, barbershop } = useBarbershop();
  const [filter, setFilter] = useState("all");
  const categories = useMemo(
    () => Array.from(new Set(activeGallery.map((item) => item.category).filter(Boolean))),
    [activeGallery],
  );
  const visible =
    filter === "all" ? activeGallery : activeGallery.filter((item) => item.category === filter);

  return (
    <PublicLayout>
      <Section headingLevel="h1" title="Galeria" subtitle="Fotos cadastradas pela barbearia.">
        {!activeGallery.length ? (
          <p className="rounded-md border border-border p-4 text-muted-foreground">
            A galeria ainda não possui fotos publicadas.
          </p>
        ) : null}
        {categories.length > 1 ? (
          <div className="mb-6 flex flex-wrap gap-2">
            {["all", ...categories].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setFilter(category)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition",
                  filter === category
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-primary",
                )}
              >
                {category === "all" ? "Todos" : category}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {visible.map((item) => (
            <figure key={item.id} className="overflow-hidden rounded-xl border border-border">
              <SmartImage
                value={item.imageUrl || barbershop.hero.imageUrl}
                alt={item.title}
                className="aspect-square w-full object-cover transition duration-300 hover:scale-105"
              />
            </figure>
          ))}
        </div>
      </Section>
    </PublicLayout>
  );
}
