import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { runtimeValue } from "./runtime-env";

const SESSION_COOKIE = "assis_admin_session";
const CSRF_COOKIE = "assis_admin_csrf";
const MAX_AGE_SECONDS = 60 * 60 * 6;
const DEV_CSRF = "dev-auth-disabled";

type SessionPayload = { sub: "admin"; exp: number; csrf: string };

export function jsonResponse(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}
export function methodNotAllowed(allow: string[]) { return jsonResponse({ message: "Método não permitido." }, { status: 405, headers: { Allow: allow.join(", ") } }); }
export function storageUnavailable() { return jsonResponse({ message: "O armazenamento do site não está configurado. Entre em contato com o responsável pela instalação." }, { status: 503 }); }
export function errorResponse(error: unknown, fallback = "Não foi possível concluir a solicitação.") {
  const name = error instanceof Error ? error.name : "";
  const status = name === "RateLimit" ? 429 : name === "Unauthorized" ? 401 : name === "CsrfError" ? 403 : name === "RevisionConflict" || name === "ImageInUse" || name === "AppointmentConflict" ? 409 : name === "NotFound" ? 404 : name === "StorageUnavailable" || name === "EnvironmentError" ? 503 : name === "ValidationError" || name === "InvalidImageDelete" ? 422 : 500;
  const message = error instanceof Error && status !== 500 ? error.message : fallback;
  return jsonResponse({ message }, { status });
}
export function verifyHttpPassword(password: string, storedHash = runtimeValue("ADMIN_PASSWORD_HASH")) { const [, salt, expected] = storedHash.split(":"); if (!salt || !expected) return false; const actual = scryptSync(password, salt, 64); const expectedBuffer = Buffer.from(expected, "hex"); return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer); }
export function hashHttpPassword(password: string, salt = randomBytes(16).toString("hex")) { return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`; }
export function createHttpSessionHeaders(maxAgeSeconds = MAX_AGE_SECONDS) { const csrf = randomBytes(24).toString("hex"); const payload: SessionPayload = { sub: "admin", exp: Math.floor(Date.now() / 1000) + maxAgeSeconds, csrf }; const headers = new Headers(); headers.append("Set-Cookie", cookie(SESSION_COOKIE, signPayload(payload), true)); headers.append("Set-Cookie", cookie(CSRF_COOKIE, csrf, false)); return { headers, csrf }; }
export function clearHttpSessionHeaders() { const headers = new Headers(); headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`); headers.append("Set-Cookie", `${CSRF_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`); return headers; }
export function getHttpSession(request: Request) { if (isAdminAuthDisabled()) return { sub: "admin" as const, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS, csrf: DEV_CSRF }; const cookies = parseCookie(request.headers.get("cookie") || ""); const raw = cookies[SESSION_COOKIE]; if (!raw) return null; const payload = verifyPayload(raw); if (!payload || payload.exp < Math.floor(Date.now() / 1000)) return null; return payload; }
export function requireHttpAdmin(request: Request) { const session = getHttpSession(request); if (!session) { const error = new Error("Não autorizado."); error.name = "Unauthorized"; throw error; } return session; }
export function requireHttpCsrf(request: Request) { const session = requireHttpAdmin(request); if (isAdminAuthDisabled()) return session; if (request.headers.get("x-csrf-token") !== session.csrf) { const error = new Error("Solicitação recusada."); error.name = "CsrfError"; throw error; } return session; }
export function isAdminAuthDisabled() { return runtimeValue("ENVIRONMENT") !== "production" && !runtimeValue("ADMIN_PASSWORD_HASH"); }
export function devCsrfToken() { return DEV_CSRF; }
export function assertAuthConfigured() { if (!runtimeValue("ADMIN_PASSWORD_HASH")) throw namedError("EnvironmentError", "ADMIN_PASSWORD_HASH não está configurada."); if (runtimeValue("ADMIN_SESSION_SECRET").length < 32) throw namedError("EnvironmentError", "ADMIN_SESSION_SECRET precisa ter pelo menos 32 caracteres."); }
function signPayload(payload: SessionPayload) { const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url"); const signature = createHmac("sha256", getSessionSecret()).update(encoded).digest("base64url"); return `${encoded}.${signature}`; }
function verifyPayload(value: string): SessionPayload | null { const [encoded, signature] = value.split("."); if (!encoded || !signature) return null; const expected = createHmac("sha256", getSessionSecret()).update(encoded).digest("base64url"); const a = Buffer.from(signature); const b = Buffer.from(expected); if (a.length !== b.length || !timingSafeEqual(a, b)) return null; try { return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload; } catch { return null; } }
function getSessionSecret() { const secret = runtimeValue("ADMIN_SESSION_SECRET"); if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET precisa ter pelo menos 32 caracteres."); return secret; }
function namedError(name: string, message: string) { const error = new Error(message); error.name = name; return error; }
function cookie(name: string, value: string, httpOnly: boolean) { return [`${name}=${value}`, "Path=/", `Max-Age=${MAX_AGE_SECONDS}`, "SameSite=Lax", httpOnly ? "HttpOnly" : "", runtimeValue("ENVIRONMENT") === "production" ? "Secure" : ""].filter(Boolean).join("; "); }
function parseCookie(header: string) { return Object.fromEntries(header.split(";").map((part) => part.trim().split("=")).filter((parts): parts is [string, string] => Boolean(parts[0] && parts[1])).map(([key, value]) => [key, decodeURIComponent(value)])); }
