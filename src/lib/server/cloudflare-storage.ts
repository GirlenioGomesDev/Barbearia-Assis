import { randomUUID } from "node:crypto";
import { barbershopConfig } from "../../data/barbershop";
import { parseBarbershopConfig, type BarbershopConfig } from "../schema";
import { runtimeEnv, runtimeValue } from "./runtime-env";

const CONFIG_KEY = "site-config";
const IMAGE_PREFIX = "uploads";

export async function readPublicConfig(): Promise<{
  config: BarbershopConfig;
  source: "cloudflare" | "fallback";
}> {
  const fallback = withRuntimeSiteUrl(parseBarbershopConfig(barbershopConfig));
  const storage = runtimeEnv().SITE_CONFIG;
  if (!storage) return { config: fallback, source: "fallback" };
  try {
    const value = await storage.get(CONFIG_KEY);
    if (!value) return { config: fallback, source: "fallback" };
    return {
      config: withRuntimeSiteUrl(parseBarbershopConfig(JSON.parse(value))),
      source: "cloudflare",
    };
  } catch (error) {
    console.error("Falha ao ler a configuração publicada:", safeError(error));
    return { config: fallback, source: "fallback" };
  }
}

export async function writePublicConfig({
  config,
  expectedRevision,
}: {
  config: BarbershopConfig;
  expectedRevision: string;
}) {
  assertStorageConfigured();
  const current = await readPublicConfig();
  assertExpectedRevision(current.config.revision, expectedRevision);
  const next = parseBarbershopConfig({
    ...config,
    revision: randomUUID(),
    updatedAt: new Date().toISOString(),
  });
  await runtimeEnv().SITE_CONFIG!.put(CONFIG_KEY, JSON.stringify(next));
  return next;
}

export function assertExpectedRevision(current: string, expected: string) {
  if (current !== expected)
    throw namedError(
      "RevisionConflict",
      "O conteúdo foi alterado em outra sessão. Recarregue o painel antes de salvar.",
    );
}

export async function assertLoginAllowed(request: Request) {
  const storage = runtimeEnv().SITE_CONFIG;
  if (!storage) return "";
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  const suffix = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const key = `login:${suffix}`;
  if (Number((await storage.get(key)) || "0") >= 6)
    throw namedError("RateLimit", "Muitas tentativas. Aguarde dez minutos e tente novamente.");
  return key;
}

export async function registerLoginAttempt(key: string, success: boolean) {
  const storage = runtimeEnv().SITE_CONFIG;
  if (!storage || !key) return;
  if (success) return storage.delete(key);
  const count = Number((await storage.get(key)) || "0");
  await storage.put(key, String(count + 1), { expirationTtl: 600 });
}

export async function putImage(file: File) {
  assertStorageConfigured();
  await validateImage(file);
  const extension = extensionFromFile(file);
  const baseName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));
  const key = `${IMAGE_PREFIX}/${Date.now()}-${randomUUID()}-${baseName}.${extension}`;
  await runtimeEnv().SITE_ASSETS!.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
  });
  return `/${key}`;
}

export async function serveUploadedAsset(pathname: string) {
  const key = pathname.replace(/^\//, "");
  if (!key.startsWith(`${IMAGE_PREFIX}/`) || key.includes("..")) return null;
  const object = await runtimeEnv().SITE_ASSETS?.get(key);
  if (!object) return null;
  const headers = new Headers({
    "Cache-Control": object.httpMetadata?.cacheControl || "public, max-age=31536000, immutable",
    "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });
  if (object.httpEtag) headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}

export async function deleteUploadedImage(url: string, config: BarbershopConfig) {
  assertStorageConfigured();
  if (isBundledAsset(url))
    throw namedError("InvalidImageDelete", "Imagens padrão do site não podem ser excluídas.");
  const key = await assertR2Asset(url);
  if (isImageUsed(url, config))
    throw namedError("ImageInUse", "Esta imagem ainda está em uso no site.");
  await runtimeEnv().SITE_ASSETS!.delete(key);
}

export async function validateImage(file: File) {
  const types = new Set(["image/jpeg", "image/png", "image/webp"]);
  const extensions = new Set(["jpg", "jpeg", "png", "webp"]);
  if (!types.has(file.type) || !extensions.has(extensionFromFile(file)))
    throw namedError("ValidationError", "Envie somente imagens JPEG, PNG ou WebP.");
  if (file.size > 3 * 1024 * 1024)
    throw namedError("ValidationError", "A imagem deve ter no máximo 3 MB.");
  if ((await imageSignature(file)) !== file.type)
    throw namedError("ValidationError", "O arquivo não parece ser uma imagem válida.");
}

function assertStorageConfigured() {
  if (!runtimeEnv().SITE_CONFIG || !runtimeEnv().SITE_ASSETS)
    throw namedError(
      "StorageUnavailable",
      "O armazenamento do site não está configurado. Entre em contato com o responsável pela instalação.",
    );
}

function namedError(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}

function isImageUsed(url: string, config: BarbershopConfig) {
  return [
    config.barbershop.logoUrl,
    config.barbershop.hero.imageUrl,
    config.seo.shareImageUrl,
    ...config.barbers.map((item) => item.photoUrl),
    ...config.services.map((item) => item.imageUrl),
    ...config.plans.map((item) => item.imageUrl),
    ...config.products.map((item) => item.imageUrl),
    ...config.gallery.map((item) => item.imageUrl),
  ].includes(url);
}

function extensionFromFile(file: File) {
  return file.name.split(".").pop()?.toLowerCase() || "";
}
function sanitizeFileName(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .toLowerCase() || "imagem"
  );
}

async function imageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return "image/png";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "image/webp";
  return null;
}

async function assertR2Asset(url: string) {
  const path = url.startsWith("http") ? new URL(url).pathname : url;
  if (!path.startsWith(`/${IMAGE_PREFIX}/`) || path.includes(".."))
    throw namedError(
      "InvalidImageDelete",
      "A imagem informada não pertence ao armazenamento do site.",
    );
  const key = path.slice(1);
  if (!(await runtimeEnv().SITE_ASSETS!.head(key)))
    throw namedError("InvalidImageDelete", "A imagem informada não foi encontrada.");
  return key;
}

function isBundledAsset(url: string) {
  return (url.startsWith("/") && !url.startsWith(`/${IMAGE_PREFIX}/`)) || url.startsWith("data:");
}
function safeError(error: unknown) {
  return error instanceof Error ? error.message : "Erro desconhecido";
}
function withRuntimeSiteUrl(config: BarbershopConfig) {
  const siteUrl = runtimeValue("SITE_URL").trim().replace(/\/$/, "");
  if (!siteUrl || config.seo.canonicalUrl) return config;
  return { ...config, seo: { ...config.seo, canonicalUrl: siteUrl, officialDomain: siteUrl } };
}
