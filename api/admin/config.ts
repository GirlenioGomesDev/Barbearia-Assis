import { parseBarbershopConfig } from "../../src/lib/schema";
import { writePublicConfig } from "../../src/lib/server/cloudflare-storage";
import {
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  requireHttpCsrf,
} from "../../src/lib/server/http-auth";

export default async function handler(request: Request) {
  if (request.method !== "PUT") return methodNotAllowed(["PUT"]);
  try {
    requireHttpCsrf(request);
    const body = (await request.json().catch(() => ({}))) as {
      config?: unknown;
      expectedRevision?: string;
    };
    if (!body.expectedRevision) {
      return jsonResponse({ message: "Versao esperada ausente." }, { status: 400 });
    }
    const config = parseBarbershopConfig(body.config);
    const next = await writePublicConfig({ config, expectedRevision: body.expectedRevision });
    return jsonResponse({
      config: next,
      message: "Alterações salvas e publicadas com sucesso.",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") error.name = "ValidationError";
    return errorResponse(error, "Os dados enviados não passaram na validação.");
  }
}
