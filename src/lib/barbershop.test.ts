import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "@/lib/storage";
import {
  normalizePhone,
  parseBarbershopConfig,
  safeParseBarbershopConfig,
  type Barber,
  type Service,
} from "@/lib/schema";
import { getAvailableDates, getAvailableTimes } from "@/lib/schedule";
import { escapeXml, jsonLd, sitemap } from "@/lib/seo";
import { buildBookingMessage } from "@/lib/whatsapp";
import {
  createHttpSessionHeaders,
  getHttpSession,
  hashHttpPassword,
  jsonResponse,
  requireHttpCsrf,
  verifyHttpPassword,
} from "@/lib/server/http-auth";
import {
  assertExpectedRevision,
  readPublicConfig,
  validateImage,
} from "@/lib/server/cloudflare-storage";
import { setRuntimeEnv } from "@/lib/server/runtime-env";

const service: Service = {
  id: "service-test",
  name: "Corte teste",
  description: "Serviço usado somente nos testes.",
  price: 50,
  durationMinutes: 70,
  imageUrl: "",
  active: true,
  order: 0,
  barberIds: ["barber-test"],
};
const barber: Barber = {
  id: "barber-test",
  name: "Profissional teste",
  bio: "",
  photoUrl: "",
  specialties: [],
  instagram: "",
  whatsapp: "5511987654321",
  active: true,
  order: 0,
  workingDays: [4],
  startTime: "08:00",
  endTime: "18:00",
  slotIntervalMinutes: 30,
  serviceIds: [service.id],
  breakStartTime: "12:00",
  breakEndTime: "13:00",
  blockedDates: [{ date: "2026-09-17" }],
};

afterEach(() => {
  delete process.env["ADMIN_PASSWORD_HASH"];
  delete process.env["ADMIN_SESSION_SECRET"];
  setRuntimeEnv({});
  delete process.env["NODE_ENV"];
});

describe("configuração", () => {
  it("aceita o schema padrão sem dados comerciais inventados", () => {
    expect(() => parseBarbershopConfig(defaultConfig)).not.toThrow();
    expect(defaultConfig.barbers).toEqual([]);
    expect(defaultConfig.services).toEqual([]);
    expect(defaultConfig.barbershop.whatsapp).toBe("");
  });

  it("rejeita IDs duplicados", () => {
    const invalid = {
      ...defaultConfig,
      services: [service, { ...service }],
    };
    expect(safeParseBarbershopConfig(invalid).success).toBe(false);
  });

  it("normaliza relações entre serviços e barbeiros", () => {
    const normalized = parseBarbershopConfig({
      ...defaultConfig,
      services: [{ ...service, barberIds: ["barber-test", "missing"] }],
      barbers: [{ ...barber, serviceIds: [] }],
    });

    expect(normalized.services[0]?.barberIds).toEqual(["barber-test"]);
    expect(normalized.barbers[0]?.serviceIds).toEqual(["service-test"]);
  });
});

describe("telefone e WhatsApp", () => {
  it("normaliza e valida telefone brasileiro com DDD", () => {
    expect(normalizePhone("(11) 98765-4321")).toBe("5511987654321");
  });

  it("inclui todos os dados necessários na mensagem", () => {
    const message = buildBookingMessage({
      service,
      barber,
      barbershopName: "Barbearia Teste",
      date: "2026-09-10",
      time: "10:00",
      name: "Cliente Teste",
      phone: "(11) 90000-0000",
      notes: "Sem perfume",
    });
    for (const text of [
      "Barbearia Teste",
      "Cliente Teste",
      "(11) 90000-0000",
      service.name,
      barber.name,
      "10/09/2026",
      "10:00",
      "70 min",
      "R$",
      "Sem perfume",
      "confirme pelo WhatsApp",
    ]) {
      expect(message).toContain(text);
    }
  });
});

describe("agenda", () => {
  it("remove datas bloqueadas gerais e individuais", () => {
    const dates = getAvailableDates({
      barber,
      futureDays: 15,
      from: new Date("2026-09-10T08:00:00"),
      blockedDates: [{ date: "2026-09-10" }],
    });
    const values = dates.map((date) => date.toISOString().slice(0, 10));
    expect(values).not.toContain("2026-09-10");
    expect(values).not.toContain("2026-09-17");
  });

  it("respeita intervalo, duração e fim do expediente", () => {
    const times = getAvailableTimes({
      barber,
      service,
      date: "2026-09-10",
      minAdvanceMinutes: 0,
      now: new Date("2026-09-01T08:00:00"),
    });
    expect(times).not.toContain("11:30");
    expect(times).not.toContain("17:30");
    expect(times).toContain("13:00");
  });

  it("respeita a antecedência mínima", () => {
    const shortService = { ...service, durationMinutes: 30 };
    const times = getAvailableTimes({
      barber,
      service: shortService,
      date: "2026-09-10",
      minAdvanceMinutes: 60,
      now: new Date("2026-09-10T09:30:00"),
    });
    expect(times).not.toContain("10:00");
    expect(times).toContain("10:30");
  });
});

describe("segurança do servidor", () => {
  it("gera e verifica hashes scrypt", () => {
    const hash = hashHttpPassword("senha-segura");
    expect(verifyHttpPassword("senha-segura", hash)).toBe(true);
    expect(verifyHttpPassword("outra", hash)).toBe(false);
  });

  it("rejeita sessão inválida, expirada e CSRF inválido", () => {
    process.env["NODE_ENV"] = "production";
    process.env["ADMIN_PASSWORD_HASH"] = hashHttpPassword("senha-segura");
    process.env["ADMIN_SESSION_SECRET"] = "segredo-de-teste-com-mais-de-32-caracteres";
    expect(
      getHttpSession(
        new Request("http://local", { headers: { cookie: "assis_admin_session=invalid" } }),
      ),
    ).toBeNull();
    const { headers } = createHttpSessionHeaders(-1);
    const cookie = headers.get("set-cookie")?.split(",")[0]?.split(";")[0] ?? "";
    expect(getHttpSession(new Request("http://local", { headers: { cookie } }))).toBeNull();
    const valid = createHttpSessionHeaders();
    const validCookie = valid.headers.get("set-cookie")?.split(",")[0]?.split(";")[0] ?? "";
    expect(() =>
      requireHttpCsrf(
        new Request("http://local", { headers: { cookie: validCookie, "x-csrf-token": "wrong" } }),
      ),
    ).toThrow();
  });

  it("preserva cookies de sessão e CSRF na resposta JSON", () => {
    process.env["NODE_ENV"] = "production";
    process.env["ADMIN_SESSION_SECRET"] = "segredo-de-teste-com-mais-de-32-caracteres";
    const { headers } = createHttpSessionHeaders();
    const response = jsonResponse({ ok: true }, { headers });
    const cookies = response.headers.getSetCookie();

    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toContain("assis_admin_session=");
    expect(cookies[1]).toContain("assis_admin_csrf=");
  });

  it("usa fallback sem Blob e detecta conflito de revisão", async () => {
    await expect(readPublicConfig()).resolves.toMatchObject({ source: "fallback" });
    expect(() => assertExpectedRevision("new", "old")).toThrow(/outra sessão/);
  });

  it("rejeita upload inválido e imagem maior que 3 MB", async () => {
    await expect(
      validateImage(new File(["x"], "file.txt", { type: "text/plain" })),
    ).rejects.toThrow();
    const big = new File([new Uint8Array(3 * 1024 * 1024 + 1)], "foto.webp", {
      type: "image/webp",
    });
    await expect(validateImage(big)).rejects.toThrow(/3 MB/);
  });
});

describe("SEO", () => {
  it("gera sitemap escapado e JSON-LD sem dados de avaliação", () => {
    expect(escapeXml("https://site.test/?a=1&b=<x>")).toContain("&amp;");
    expect(
      sitemap({
        ...defaultConfig,
        seo: { ...defaultConfig.seo, canonicalUrl: "https://site.test/?a=1&b=2" },
      }),
    ).toContain("&amp;");
    const structuredData = JSON.stringify(jsonLd(defaultConfig));
    expect(structuredData).toContain("BarberShop");
    expect(structuredData).not.toContain(["Aggregate", "Rating"].join(""));
    expect(structuredData).not.toContain(["Re", "view"].join(""));
  });
});
