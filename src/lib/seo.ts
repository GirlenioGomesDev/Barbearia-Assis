import type { BarbershopConfig } from "@/lib/schema";

export function pageSeo(config: BarbershopConfig, page: string) {
  const base = config.seo;
  const title =
    page === "home" ? base.title : `${labelForPage(page)} - ${config.barbershop.companyName}`;
  const description =
    page === "home"
      ? base.description
      : `${labelForPage(page)} da ${config.barbershop.companyName} em ${config.barbershop.address.district}, ${config.barbershop.address.city}. Solicite atendimento pelo WhatsApp.`;
  const canonical = canonicalFor(config, page);
  const image = absoluteUrl(config.seo.shareImageUrl || config.barbershop.hero.imageUrl, canonical);

  return {
    title,
    description,
    canonical,
    image,
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical },
      { property: "og:image", content: image },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(config.seo.googleSiteVerification
        ? [{ name: "google-site-verification", content: config.seo.googleSiteVerification }]
        : []),
    ],
    links: [{ rel: "canonical", href: canonical }],
  };
}

export function jsonLd(config: BarbershopConfig) {
  const address = config.barbershop.address;
  const canonical = config.seo.canonicalUrl.replace(/\/$/, "");
  return compact({
    "@context": "https://schema.org",
    "@type": ["BarberShop", "LocalBusiness"],
    name: config.seo.businessName || config.barbershop.companyName,
    image: absoluteUrl(config.seo.shareImageUrl || config.barbershop.hero.imageUrl, canonical),
    url: canonical,
    telephone: config.barbershop.phone || config.barbershop.whatsapp || undefined,
    address: address.city
      ? {
          "@type": "PostalAddress",
          streetAddress: `${address.street}, ${address.number}`,
          addressLocality: address.city,
          addressRegion: address.state,
          postalCode: address.zip,
          addressCountry: "BR",
        }
      : undefined,
    openingHoursSpecification: config.barbershop.workingHours
      .filter((hour) => !hour.closed)
      .map((hour) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: weekdayName(hour.weekday),
        opens: hour.startTime,
        closes: hour.endTime,
      })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Servicos",
      itemListElement: config.services
        .filter((service) => service.active)
        .map((service) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: service.name, description: service.description },
          price: service.price,
          priceCurrency: "BRL",
        })),
    },
  });
}

export function sitemap(config: BarbershopConfig) {
  const base = config.seo.canonicalUrl.replace(/\/$/, "");
  const paths = [
    "",
    "/servicos",
    "/planos",
    "/barbeiros",
    "/produtos",
    "/galeria",
    "/contato",
    "/agendamento",
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map(
      (path) =>
        `  <url><loc>${escapeXml(`${base}${path}`)}</loc><lastmod>${escapeXml(config.updatedAt.slice(0, 10))}</lastmod></url>`,
    )
    .join("\n")}\n</urlset>`;
}

export function robots(config: BarbershopConfig) {
  return `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${config.seo.canonicalUrl.replace(/\/$/, "")}/sitemap.xml\n`;
}

function canonicalFor(config: BarbershopConfig, page: string) {
  const base = config.seo.canonicalUrl.replace(/\/$/, "");
  return `${base}${page === "home" ? "" : `/${page}`}`;
}

export function escapeXml(value: string) {
  return value.replace(
    /[<>&"']/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[character] ?? character,
  );
}

function absoluteUrl(value: string, base: string) {
  if (!value || /^https?:\/\//.test(value)) return value;
  return base ? new URL(value, `${base}/`).toString() : value;
}

function compact<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function labelForPage(page: string) {
  const labels: Record<string, string> = {
    servicos: "Serviços e preços",
    planos: "Planos e pacotes",
    barbeiros: "Barbeiros",
    produtos: "Produtos",
    galeria: "Galeria",
    contato: "Contato e localização",
    agendamento: "Solicitar agendamento",
  };
  return labels[page] ?? "Barbearia";
}

function weekdayName(day: number) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day];
}
