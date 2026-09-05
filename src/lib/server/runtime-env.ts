export type SiteKv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
};

export type SiteR2Object = {
  body: ReadableStream;
  httpEtag?: string;
  httpMetadata?: { contentType?: string; cacheControl?: string };
};

export type SiteR2 = {
  get(key: string): Promise<SiteR2Object | null>;
  head(key: string): Promise<unknown | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | string,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
};

export type RuntimeEnv = {
  SITE_CONFIG?: SiteKv;
  SITE_ASSETS?: SiteR2;
  ADMIN_PASSWORD_HASH?: string;
  ADMIN_SESSION_SECRET?: string;
  SITE_URL?: string;
  ENVIRONMENT?: string;
};

let currentEnv: RuntimeEnv = {};

export function setRuntimeEnv(env: RuntimeEnv) {
  currentEnv = env;
}

export function runtimeEnv() {
  return currentEnv;
}

export function runtimeValue(key: keyof RuntimeEnv) {
  const value = currentEnv[key];
  if (typeof value === "string") return value;
  return process.env[String(key)] || "";
}
