import { createFileRoute } from "@tanstack/react-router";
import { Instagram, Mail, MapPin, MessageCircle } from "lucide-react";

import { PublicLayout, Section } from "@/components/site/PublicLayout";
import { useBarbershop } from "@/hooks/useBarbershop";
import { hhmm, instagramLink, whatsappLink } from "@/lib/format";
import { pageSeo } from "@/lib/seo";
import { loadPublicConfig } from "@/lib/public-config-server";
import { defaultConfig } from "@/lib/storage";

export const Route = createFileRoute("/contato")({
  loader: () => loadPublicConfig(),
  head: ({ loaderData }) => pageSeo(loaderData?.config ?? defaultConfig, "contato"),
  component: ContactPage,
});

function ContactPage() {
  const { barbershop } = useBarbershop();
  const address = [
    `${barbershop.address.street}, ${barbershop.address.number}`,
    barbershop.address.district,
    `${barbershop.address.city}/${barbershop.address.state}`,
    barbershop.address.zip,
  ].join(" - ");
  const mapsUrl =
    barbershop.googleMapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const wa = whatsappLink(barbershop.whatsapp, "Ola! Gostaria de mais informacoes.");
  const ig = instagramLink(barbershop.instagram);

  return (
    <PublicLayout>
      <Section
        headingLevel="h1"
        title="Contato"
        subtitle="Fale com a barbearia ou veja como chegar."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="surface-premium space-y-5 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-5 w-5 text-primary" aria-hidden />
              <div>
                <h2 className="font-display text-lg tracking-wide">Endereço</h2>
                <p className="text-sm text-muted-foreground">{address}</p>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm text-primary underline-offset-4 hover:underline"
                >
                  Abrir no Google Maps
                </a>
              </div>
            </div>

            {wa ? (
              <ContactLink
                href={wa}
                icon={<MessageCircle className="mt-1 h-5 w-5 text-primary" />}
                title="WhatsApp"
                text={barbershop.whatsapp}
              />
            ) : null}
            {ig ? (
              <ContactLink
                href={ig}
                icon={<Instagram className="mt-1 h-5 w-5 text-primary" />}
                title="Instagram"
                text={`@${barbershop.instagram?.replace(/^@/, "")}`}
              />
            ) : null}

            <div className="flex items-start gap-3">
              <Mail className="mt-1 h-5 w-5 text-primary" aria-hidden />
              <div>
                <h2 className="font-display text-lg tracking-wide">E-mail</h2>
                <p className="text-sm text-muted-foreground">{barbershop.email}</p>
              </div>
            </div>
          </div>

          <div className="surface-premium rounded-xl p-6">
            <h2 className="font-display text-lg tracking-wide">Horario de funcionamento</h2>
            <div className="gold-rule mt-3" />
            <ul className="mt-4 space-y-2 text-sm">
              {barbershop.workingHours.map((hour) => (
                <li
                  key={hour.weekday}
                  className="flex justify-between border-b border-border/40 pb-2"
                >
                  <span className="text-muted-foreground">{hour.label}</span>
                  <span className="font-medium">
                    {hour.closed ? "Fechado" : `${hhmm(hour.startTime)} - ${hhmm(hour.endTime)}`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Horarios sujeitos a confirmacao pelo WhatsApp.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <iframe
            title={`Mapa da ${barbershop.companyName}`}
            src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
            className="h-72 w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </Section>
    </PublicLayout>
  );
}

function ContactLink({
  href,
  icon,
  title,
  text,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string | undefined;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-start gap-3">
      {icon}
      <div>
        <h2 className="font-display text-lg tracking-wide">{title}</h2>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </a>
  );
}
