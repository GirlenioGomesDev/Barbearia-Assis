import heroImage from "@/assets/hero-barbearia.jpg";
import logoImage from "@/assets/logo-assis.png";
import type {
  Barber,
  BarbershopConfig,
  BlockedDate,
  GalleryItem,
  Plan,
  Product,
  Service,
} from "@/lib/schema";
import { SCHEMA_VERSION } from "@/lib/schema";

export type { Barber, BarbershopConfig, BlockedDate, GalleryItem, Plan, Product, Service };

export const services: Service[] = [];
export const barbers: Barber[] = [];
export const products: Product[] = [];
export const plans: Plan[] = [];
export const gallery: GalleryItem[] = [];

export const barbershopConfig: BarbershopConfig = {
  schemaVersion: SCHEMA_VERSION,
  updatedAt: new Date("2026-09-04T12:00:00.000Z").toISOString(),
  revision: "default",
  barbershop: {
    companyName: "Barbearia Assis",
    logoUrl: logoImage,
    description: "Atendimento masculino com solicitação de horário pelo WhatsApp.",
    whatsapp: "",
    phone: "",
    instagram: "",
    email: "",
    googleMapsUrl: "",
    googleBusinessProfileUrl: "",
    address: { street: "", number: "", district: "", city: "", state: "", zip: "" },
    hero: {
      title: "BARBEARIA ASSIS",
      subtitle: "Cuidado e estilo em cada atendimento.",
      description: "Consulte os serviços e solicite seu horário pelo WhatsApp.",
      imageUrl: heroImage,
    },
    about: "Conheça a Barbearia Assis e solicite informações sobre o atendimento.",
    workingHours: [
      { weekday: 1, label: "Segunda", startTime: "08:00", endTime: "18:00", closed: true },
      { weekday: 2, label: "Terça", startTime: "08:00", endTime: "18:00", closed: true },
      { weekday: 3, label: "Quarta", startTime: "08:00", endTime: "18:00", closed: true },
      { weekday: 4, label: "Quinta", startTime: "08:00", endTime: "18:00", closed: true },
      { weekday: 5, label: "Sexta", startTime: "08:00", endTime: "18:00", closed: true },
      { weekday: 6, label: "Sábado", startTime: "08:00", endTime: "18:00", closed: true },
      { weekday: 0, label: "Domingo", startTime: "08:00", endTime: "18:00", closed: true },
    ],
  },
  barbers,
  services,
  plans,
  products,
  gallery,
  booking: { minAdvanceMinutes: 60, futureDays: 21, blockedDates: [] },
  seo: {
    title: "Barbearia Assis | Atendimento masculino",
    description: "Conheça a Barbearia Assis e solicite informações de atendimento pelo WhatsApp.",
    businessName: "Barbearia Assis",
    primaryService: "",
    secondaryServices: [],
    district: "",
    city: "",
    state: "",
    serviceArea: "",
    officialDomain: "",
    canonicalUrl: "",
    shareImageUrl: heroImage,
    googleMapsUrl: "",
    googleBusinessProfileUrl: "",
    googleSiteVerification: "",
  },
};
