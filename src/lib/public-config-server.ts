import { createServerFn } from "@tanstack/react-start";

import { readPublicConfig } from "@/lib/server/cloudflare-storage";

export const loadPublicConfig = createServerFn({ method: "GET" }).handler(async () => {
  return readPublicConfig();
});
