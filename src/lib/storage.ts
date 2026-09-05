import { barbershopConfig } from "@/data/barbershop";
import {
  isValidPhone,
  makeId,
  normalizePhone,
  parseBarbershopConfig,
  safeParseBarbershopConfig,
  validateBarber,
  validatePlan,
  validateProduct,
  validateService,
  type Barber,
  type BarbershopConfig,
  type Plan,
  type Product,
  type Service,
} from "@/lib/schema";

export type { Barber, BarbershopConfig, GalleryItem, Plan, Product, Service } from "@/lib/schema";
export {
  isValidPhone,
  makeId,
  normalizePhone,
  validateBarber,
  validatePlan,
  validateProduct,
  validateService,
};

export const defaultConfig: BarbershopConfig = parseBarbershopConfig(barbershopConfig);

export type PublicConfigResponse = {
  config: BarbershopConfig;
  source: "cloudflare" | "fallback";
};

export async function fetchPublicConfig(): Promise<PublicConfigResponse> {
  const response = await fetch("/api/config", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Não foi possível carregar os dados públicos.");
  const payload = (await response.json()) as PublicConfigResponse;
  return { ...payload, config: parseBarbershopConfig(payload.config) };
}

export async function fetchAdminState(): Promise<{
  authenticated: boolean;
  csrfToken?: string;
  config?: BarbershopConfig;
  source?: "cloudflare" | "fallback";
}> {
  const response = await fetch("/api/admin/session", { headers: { Accept: "application/json" } });
  if (!response.ok) return { authenticated: false };
  const payload = (await response.json()) as {
    authenticated: boolean;
    csrfToken?: string;
    config?: unknown;
    source?: "cloudflare" | "fallback";
  };
  return {
    authenticated: payload.authenticated,
    ...(payload.csrfToken ? { csrfToken: payload.csrfToken } : {}),
    ...(payload.config ? { config: parseBarbershopConfig(payload.config) } : {}),
    ...(payload.source ? { source: payload.source } : {}),
  };
}

export async function loginAdmin(password: string) {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw new Error("Senha incorreta.");
  const payload = (await response.json()) as {
    csrfToken: string;
    config: unknown;
    source: "cloudflare" | "fallback";
  };
  return { ...payload, config: parseBarbershopConfig(payload.config) };
}

export async function logoutAdmin(csrfToken: string) {
  await fetch("/api/admin/logout", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function saveRemoteConfig(config: BarbershopConfig, csrfToken: string) {
  const response = await fetch("/api/admin/config", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ config, expectedRevision: config.revision }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    config?: unknown;
    message?: string;
  };
  if (!response.ok) throw new Error(payload.message || "Não foi possível salvar.");
  return parseBarbershopConfig(payload.config);
}

export async function uploadImage(file: File, csrfToken: string) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: formData,
  });
  const payload = (await response.json().catch(() => ({}))) as { url?: string; message?: string };
  if (!response.ok || !payload.url) throw new Error(payload.message || "Upload recusado.");
  return payload.url;
}

export async function deleteRemoteImage(url: string, csrfToken: string) {
  const response = await fetch("/api/admin/image", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ url }),
  });
  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) throw new Error(payload.message || "Não foi possível excluir a imagem.");
}

export function exportConfig(config: BarbershopConfig) {
  return JSON.stringify(config, null, 2);
}

export function parseImportedConfig(value: string) {
  return parseBarbershopConfig(JSON.parse(value));
}

export function validateImportedConfig(value: string) {
  return safeParseBarbershopConfig(JSON.parse(value));
}
