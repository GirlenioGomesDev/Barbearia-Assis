import { deleteUploadedImage, readPublicConfig } from "../../src/lib/server/cloudflare-storage";
import {
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  requireHttpCsrf,
} from "../../src/lib/server/http-auth";

export default async function handler(request: Request) {
  if (request.method !== "DELETE") return methodNotAllowed(["DELETE"]);
  try {
    requireHttpCsrf(request);
    const { url } = (await request.json().catch(() => ({}))) as { url?: string };
    if (!url) return jsonResponse({ message: "Endereço da imagem ausente." }, { status: 400 });
    const { config } = await readPublicConfig();
    await deleteUploadedImage(url, config);
    return jsonResponse({ ok: true });
  } catch (error) {
    return errorResponse(error, "Não foi possível excluir a imagem.");
  }
}
