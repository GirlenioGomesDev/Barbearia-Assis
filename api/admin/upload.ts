import { putImage } from "../../src/lib/server/cloudflare-storage";
import {
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  requireHttpCsrf,
} from "../../src/lib/server/http-auth";

export default async function handler(request: Request) {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  try {
    requireHttpCsrf(request);
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonResponse({ message: "Arquivo ausente." }, { status: 400 });
    }
    return jsonResponse({ url: await putImage(file) });
  } catch (error) {
    return errorResponse(error, "Upload recusado.");
  }
}
