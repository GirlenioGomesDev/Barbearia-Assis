import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { CalendarDays, Copy, Settings } from "lucide-react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { BarbershopProvider } from "@/context/BarbershopContext";
import { loadPublicConfig } from "@/lib/public-config-server";
import { jsonLd } from "@/lib/seo";
import { defaultConfig } from "@/lib/storage";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço que você acessou não existe ou foi movido.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado por aqui. Tente novamente ou volte para o início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  loader: () => loadPublicConfig(),
  head: ({ loaderData }) => {
    const config = loaderData?.config ?? defaultConfig;
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "Barbearia Assis" },
        { name: "description", content: "Barbearia premium com agendamento pelo WhatsApp." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&display=swap",
        },
        { rel: "icon", href: "/favicon.ico?v=2", type: "image/x-icon" },
        { rel: "icon", href: "/favicon-32x32.png?v=2", type: "image/png", sizes: "32x32" },
        { rel: "icon", href: "/favicon-16x16.png?v=2", type: "image/png", sizes: "16x16" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=2", sizes: "180x180" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLd(config)).replace(/</g, "\\u003c"),
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function BarberAreaQuickNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [copied, setCopied] = useState(false);
  const isBarberArea = pathname === "/admin" || pathname === "/agenda";

  if (!isBarberArea) return null;

  async function copyAgendaLink() {
    if (typeof window === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(`${window.location.origin}/agenda`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="border-b border-border bg-card/80 px-3 py-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2">
        <span className="mr-auto text-xs font-bold uppercase tracking-[0.16em] text-primary">
          Área do barbeiro
        </span>
        <Link
          to="/agenda"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground"
        >
          <CalendarDays className="h-4 w-4" />
          Agenda
        </Link>
        <Link
          to="/admin"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-foreground"
        >
          <Settings className="h-4 w-4" />
          Configurar site
        </Link>
        <button
          type="button"
          onClick={() => void copyAgendaLink()}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <Copy className="h-4 w-4" />
          {copied ? "Link copiado" : "Copiar link da agenda"}
        </button>
      </div>
    </div>
  );
}

function RootComponent() {
  const { config } = Route.useLoaderData();
  return (
    <BarbershopProvider initialConfig={config}>
      <BarberAreaQuickNav />
      <Outlet />
      <Toaster position="top-center" richColors />
    </BarbershopProvider>
  );
}
