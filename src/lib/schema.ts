import { z } from "zod";

export const SCHEMA_VERSION = 2;

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horario invalido.");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida.");
const httpUrlSchema = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "URL inválida.");
const urlSchema = z.union([z.literal(""), httpUrlSchema]);
const optionalUrlSchema = urlSchema.optional();
const imageUrlSchema = z
  .string()
  .refine(
    (value) => value === "" || value.startsWith("/") || /^https?:\/\//i.test(value),
    "URL de imagem inválida.",
  );
const phoneSchema = z.union([
  z.literal(""),
  z
    .string()
    .min(10)
    .max(16)
    .regex(/^\+?\d+$/),
]);

export const workingHourSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    label: z.string().min(1),
    startTime: timeSchema,
    endTime: timeSchema,
    closed: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!value.closed && timeToMinutes(value.startTime) >= timeToMinutes(value.endTime)) {
      ctx.addIssue({ code: "custom", message: "A abertura precisa ser antes do fechamento." });
    }
  });

export const blockedDateSchema = z.object({
  date: dateSchema,
  reason: z.string().max(120).optional(),
});

export const serviceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().min(0),
  durationMinutes: z.number().int().positive(),
  imageUrl: imageUrlSchema.optional(),
  active: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
  barberIds: z.array(z.string()).default([]),
});

export const barberSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    bio: z.string(),
    photoUrl: imageUrlSchema.optional(),
    specialties: z.array(z.string()),
    instagram: z.string().optional(),
    whatsapp: phoneSchema,
    active: z.boolean().default(true),
    order: z.number().int().min(0).default(0),
    workingDays: z.array(z.number().int().min(0).max(6)).min(1),
    startTime: timeSchema,
    endTime: timeSchema,
    slotIntervalMinutes: z.number().int().positive(),
    serviceIds: z.array(z.string()).default([]),
    breakStartTime: timeSchema.optional().or(z.literal("")),
    breakEndTime: timeSchema.optional().or(z.literal("")),
    blockedDates: z.array(blockedDateSchema),
  })
  .superRefine((value, ctx) => {
    if (timeToMinutes(value.startTime) >= timeToMinutes(value.endTime)) {
      ctx.addIssue({ code: "custom", message: "O expediente precisa terminar depois do inicio." });
    }
    const hasBreakStart = Boolean(value.breakStartTime);
    const hasBreakEnd = Boolean(value.breakEndTime);
    if (hasBreakStart !== hasBreakEnd) {
      ctx.addIssue({ code: "custom", message: "Informe inicio e fim da pausa." });
    }
    if (hasBreakStart && hasBreakEnd) {
      const breakStart = timeToMinutes(value.breakStartTime!);
      const breakEnd = timeToMinutes(value.breakEndTime!);
      if (breakStart >= breakEnd) {
        ctx.addIssue({ code: "custom", message: "A pausa precisa terminar depois do inicio." });
      }
      if (breakStart < timeToMinutes(value.startTime) || breakEnd > timeToMinutes(value.endTime)) {
        ctx.addIssue({ code: "custom", message: "A pausa precisa ficar dentro do expediente." });
      }
    }
  });

export const planSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().min(0),
  benefits: z.array(z.string()),
  notes: z.string().optional(),
  imageUrl: imageUrlSchema.optional(),
  buttonText: z.string().min(1),
  whatsappMessage: z.string().min(1),
  active: z.boolean(),
  order: z.number().int().min(0).default(0),
});

export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().min(0),
  imageUrl: imageUrlSchema.optional(),
  whatsappMessage: z.string().min(1).default("Tenho interesse neste produto."),
  active: z.boolean(),
  order: z.number().int().min(0).default(0),
});

export const galleryItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  imageUrl: imageUrlSchema.refine(Boolean, "Informe uma imagem."),
  active: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

export const barbershopInfoSchema = z.object({
  companyName: z.string().min(1),
  logoUrl: imageUrlSchema.optional(),
  description: z.string().min(1),
  whatsapp: phoneSchema,
  phone: z.string().optional(),
  instagram: z.string().optional(),
  email: z.string().email().or(z.literal("")),
  googleMapsUrl: optionalUrlSchema,
  googleBusinessProfileUrl: optionalUrlSchema,
  address: z.object({
    street: z.string(),
    number: z.string(),
    district: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
  }),
  hero: z.object({
    title: z.string().min(1),
    subtitle: z.string().min(1),
    description: z.string().min(1),
    imageUrl: imageUrlSchema.refine(Boolean, "Informe uma imagem principal."),
  }),
  about: z.string().min(1),
  workingHours: z.array(workingHourSchema).length(7),
});

export const bookingSettingsSchema = z.object({
  minAdvanceMinutes: z.number().int().min(0),
  futureDays: z.number().int().min(1).max(90),
  blockedDates: z.array(blockedDateSchema),
});

export const seoSettingsSchema = z.object({
  title: z.string().min(1).max(70),
  description: z.string().min(1).max(180),
  businessName: z.string().min(1),
  primaryService: z.string(),
  secondaryServices: z.array(z.string()),
  district: z.string(),
  city: z.string(),
  state: z.string(),
  serviceArea: z.string(),
  officialDomain: z.string(),
  canonicalUrl: urlSchema,
  shareImageUrl: imageUrlSchema.optional(),
  googleMapsUrl: optionalUrlSchema,
  googleBusinessProfileUrl: optionalUrlSchema,
  googleSiteVerification: z.string().regex(/^[A-Za-z0-9_-]*$/),
});

const barbershopConfigBaseSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  updatedAt: z.string().datetime(),
  revision: z.string().min(1),
  barbershop: barbershopInfoSchema,
  barbers: z.array(barberSchema),
  services: z.array(serviceSchema),
  plans: z.array(planSchema),
  products: z.array(productSchema),
  gallery: z.array(galleryItemSchema),
  booking: bookingSettingsSchema,
  seo: seoSettingsSchema,
});

type ParsedBarbershopConfig = z.infer<typeof barbershopConfigBaseSchema>;

export const barbershopConfigSchema = barbershopConfigBaseSchema
  .transform(normalizeConfigRelations)
  .superRefine((config, ctx) => {
    assertUnique(config.barbers, "barbers", ctx);
    assertUnique(config.services, "services", ctx);
    assertUnique(config.plans, "plans", ctx);
    assertUnique(config.products, "products", ctx);
    assertUnique(config.gallery, "gallery", ctx);

    const serviceIds = new Set(config.services.map((service) => service.id));
    const barberIds = new Set(config.barbers.map((barber) => barber.id));
    config.barbers.forEach((barber, index) => {
      barber.serviceIds.forEach((serviceId) => {
        if (!serviceIds.has(serviceId)) {
          ctx.addIssue({
            code: "custom",
            path: ["barbers", index, "serviceIds"],
            message: `Servico inexistente: ${serviceId}`,
          });
        }
      });
    });
    config.services.forEach((service, index) => {
      service.barberIds.forEach((barberId) => {
        if (!barberIds.has(barberId)) {
          ctx.addIssue({
            code: "custom",
            path: ["services", index, "barberIds"],
            message: `Barbeiro inexistente: ${barberId}`,
          });
        }
      });
    });
  });

export type BlockedDate = z.infer<typeof blockedDateSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type Barber = z.infer<typeof barberSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Product = z.infer<typeof productSchema>;
export type GalleryItem = z.infer<typeof galleryItemSchema>;
export type BarbershopConfig = z.infer<typeof barbershopConfigSchema>;
export type BarbershopInfo = BarbershopConfig["barbershop"];

export function normalizeConfigRelations(config: ParsedBarbershopConfig): ParsedBarbershopConfig {
  const serviceIds = new Set(config.services.map((service) => service.id));
  const barberIds = new Set(config.barbers.map((barber) => barber.id));
  const servicesByBarber = new Map<string, Set<string>>();
  const barbersByService = new Map<string, Set<string>>();

  for (const barber of config.barbers) {
    const ids = new Set(barber.serviceIds.filter((serviceId) => serviceIds.has(serviceId)));
    servicesByBarber.set(barber.id, ids);
    for (const serviceId of ids) {
      if (!barbersByService.has(serviceId)) barbersByService.set(serviceId, new Set());
      barbersByService.get(serviceId)!.add(barber.id);
    }
  }

  for (const service of config.services) {
    const ids = new Set(service.barberIds.filter((barberId) => barberIds.has(barberId)));
    barbersByService.set(
      service.id,
      new Set([...(barbersByService.get(service.id) ?? []), ...ids]),
    );
    for (const barberId of ids) {
      if (!servicesByBarber.has(barberId)) servicesByBarber.set(barberId, new Set());
      servicesByBarber.get(barberId)!.add(service.id);
    }
  }

  return {
    ...config,
    barbers: config.barbers.map((barber) => ({
      ...barber,
      serviceIds: [...(servicesByBarber.get(barber.id) ?? [])],
    })),
    services: config.services.map((service) => ({
      ...service,
      barberIds: [...(barbersByService.get(service.id) ?? [])],
    })),
  };
}

export function parseBarbershopConfig(value: unknown): BarbershopConfig {
  return barbershopConfigSchema.parse(value);
}

export function safeParseBarbershopConfig(value: unknown) {
  return barbershopConfigSchema.safeParse(value);
}

export function normalizePhone(value: string) {
  const onlyDigits = value.replace(/\D/g, "");
  if (!onlyDigits) return "";
  return onlyDigits.startsWith("55") ? onlyDigits : `55${onlyDigits}`;
}

export function isValidPhone(value: string) {
  const d = normalizePhone(value);
  return d.length >= 12 && d.length <= 13;
}

export function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function timeToMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function validateService(service: Service) {
  const result = serviceSchema.safeParse(service);
  return result.success ? null : result.error.issues[0]?.message || "Servico invalido.";
}

export function validateProduct(product: Product) {
  const result = productSchema.safeParse(product);
  return result.success ? null : result.error.issues[0]?.message || "Produto invalido.";
}

export function validatePlan(plan: Plan) {
  const result = planSchema.safeParse(plan);
  return result.success ? null : result.error.issues[0]?.message || "Plano invalido.";
}

export function validateBarber(barber: Barber) {
  const result = barberSchema.safeParse(barber);
  return result.success ? null : result.error.issues[0]?.message || "Barbeiro invalido.";
}

function assertUnique(items: { id: string }[], path: string, ctx: z.RefinementCtx) {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      ctx.addIssue({ code: "custom", path: [path], message: `ID duplicado: ${item.id}` });
    }
    seen.add(item.id);
  }
}
