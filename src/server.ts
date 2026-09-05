import app from "@tanstack/react-start/server-entry";

import configHandler from "../api/config";
import robotsHandler from "../api/robots";
import sitemapHandler from "../api/sitemap";
import adminConfigHandler from "../api/admin/config";
import imageHandler from "../api/admin/image";
import loginHandler from "./server/login";
import logoutHandler from "../api/admin/logout";
import sessionHandler from "../api/admin/session";
import uploadHandler from "../api/admin/upload";
import { serveUploadedAsset } from "./lib/server/cloudflare-storage";
import { setRuntimeEnv, type RuntimeEnv } from "./lib/server/runtime-env";

type ApiHandler = (request: Request) => Promise<Response> | Response;

const apiRoutes: Record<string, ApiHandler> = {
  "/api/config": configHandler,
  "/api/admin/config": adminConfigHandler,
  "/api/admin/image": imageHandler,
  "/api/admin/login": loginHandler,
  "/api/admin/logout": logoutHandler,
  "/api/admin/session": sessionHandler,
  "/api/admin/upload": uploadHandler,
  "/api/robots": robotsHandler,
  "/api/sitemap": sitemapHandler,
  "/robots.txt": robotsHandler,
  "/sitemap.xml": sitemapHandler,
};

export default {
  async fetch(request: Request, env: RuntimeEnv) {
    setRuntimeEnv(env);
    const pathname = new URL(request.url).pathname;
    let response: Response;

    if (pathname.startsWith("/uploads/")) {
      response =
        (await serveUploadedAsset(pathname)) ??
        new Response("Imagem não encontrada.", { status: 404 });
    } else if (apiRoutes[pathname]) {
      response = await apiRoutes[pathname](request);
    } else {
      response = await app.fetch(request);
    }

    return withSecurityHeaders(response);
  },
};

function withSecurityHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://maps.gstatic.com https://*.googleusercontent.com; frame-src https://www.google.com https://maps.google.com; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
