import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { BarbershopContext, type BarbershopContextValue } from "@/context/barbershopContextValue";
import { normalizeConfigRelations } from "@/lib/schema";
import {
  defaultConfig,
  deleteRemoteImage,
  exportConfig,
  fetchAdminState,
  fetchPublicConfig,
  loginAdmin,
  logoutAdmin,
  parseImportedConfig,
  saveRemoteConfig,
  uploadImage as uploadRemoteImage,
  type BarbershopConfig,
} from "@/lib/storage";

export function BarbershopProvider({
  children,
  initialConfig = defaultConfig,
}: {
  children: ReactNode;
  initialConfig?: BarbershopConfig;
}) {
  const [config, setConfig] = useState<BarbershopConfig>(() => initialConfig);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configSource, setConfigSource] = useState<"cloudflare" | "fallback">("fallback");
  const imagesToDelete = useRef(new Set<string>());

  useEffect(() => {
    fetchPublicConfig()
      .then(({ config: loaded, source }) => {
        setConfig(loaded);
        setConfigSource(source);
      })
      .catch((error) => console.error("Falha segura ao carregar dados publicos.", error));
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

  const value = useMemo<BarbershopContextValue>(() => {
    function replaceConfig(next: BarbershopConfig, markDirty = true) {
      setConfig(normalizeConfigRelations(next));
      if (markDirty) setDirty(true);
    }

    function sortByOrder<T extends { order: number }>(items: T[]) {
      return [...items].sort((a, b) => a.order - b.order);
    }

    return {
      config,
      csrfToken,
      authenticated,
      dirty,
      saving,
      configSource,
      barbershop: config.barbershop,
      barbers: sortByOrder(config.barbers),
      services: sortByOrder(config.services),
      plans: sortByOrder(config.plans),
      products: sortByOrder(config.products),
      gallery: sortByOrder(config.gallery),
      activeBarbers: sortByOrder(config.barbers.filter((barber) => barber.active)),
      activeServices: sortByOrder(config.services.filter((service) => service.active)),
      activePlans: sortByOrder(config.plans.filter((plan) => plan.active)),
      activeProducts: sortByOrder(config.products.filter((product) => product.active)),
      activeGallery: sortByOrder(config.gallery.filter((item) => item.active)),
      setConfigDraft: (next) => replaceConfig(next),
      loadAdmin: async () => {
        const state = await fetchAdminState();
        setAuthenticated(state.authenticated);
        setCsrfToken(state.csrfToken ?? null);
        if (state.source) setConfigSource(state.source);
        if (state.config) {
          setConfig(state.config);
          setDirty(false);
        }
        return state.authenticated;
      },
      login: async (password) => {
        const state = await loginAdmin(password);
        setCsrfToken(state.csrfToken);
        setConfig(state.config);
        setAuthenticated(true);
        setConfigSource(state.source);
        setDirty(false);
      },
      logout: async () => {
        if (csrfToken) await logoutAdmin(csrfToken);
        setCsrfToken(null);
        setAuthenticated(false);
        setDirty(false);
      },
      publishChanges: async () => {
        if (!csrfToken) throw new Error("Entre no painel novamente.");
        setSaving(true);
        try {
          const saved = await saveRemoteConfig(config, csrfToken);
          setConfig(saved);
          setDirty(false);
          setConfigSource("cloudflare");
          const pending = [...imagesToDelete.current];
          imagesToDelete.current.clear();
          await Promise.allSettled(pending.map((url) => deleteRemoteImage(url, csrfToken)));
        } finally {
          setSaving(false);
        }
      },
      updateBarbershop: (barbershop) => replaceConfig({ ...config, barbershop }),
      saveBarber: (barber) =>
        replaceConfig({
          ...config,
          barbers: config.barbers.map((item) => (item.id === barber.id ? barber : item)),
        }),
      addBarber: (barber) => replaceConfig({ ...config, barbers: [...config.barbers, barber] }),
      deleteBarber: (id) =>
        replaceConfig({ ...config, barbers: config.barbers.filter((barber) => barber.id !== id) }),
      saveService: (service) =>
        replaceConfig({
          ...config,
          services: config.services.map((item) => (item.id === service.id ? service : item)),
        }),
      addService: (service) =>
        replaceConfig({
          ...config,
          services: [...config.services, service],
        }),
      deleteService: (id) =>
        replaceConfig({
          ...config,
          services: config.services.filter((service) => service.id !== id),
          barbers: config.barbers.map((barber) => ({
            ...barber,
            serviceIds: barber.serviceIds.filter((serviceId) => serviceId !== id),
          })),
        }),
      savePlan: (plan) =>
        replaceConfig({
          ...config,
          plans: config.plans.map((item) => (item.id === plan.id ? plan : item)),
        }),
      addPlan: (plan) => replaceConfig({ ...config, plans: [...config.plans, plan] }),
      deletePlan: (id) =>
        replaceConfig({ ...config, plans: config.plans.filter((plan) => plan.id !== id) }),
      saveProduct: (product) =>
        replaceConfig({
          ...config,
          products: config.products.map((item) => (item.id === product.id ? product : item)),
        }),
      addProduct: (product) =>
        replaceConfig({ ...config, products: [...config.products, product] }),
      deleteProduct: (id) =>
        replaceConfig({
          ...config,
          products: config.products.filter((product) => product.id !== id),
        }),
      saveGalleryItem: (galleryItem) =>
        replaceConfig({
          ...config,
          gallery: config.gallery.map((item) => (item.id === galleryItem.id ? galleryItem : item)),
        }),
      addGalleryItem: (galleryItem) =>
        replaceConfig({ ...config, gallery: [...config.gallery, galleryItem] }),
      deleteGalleryItem: (id) =>
        replaceConfig({ ...config, gallery: config.gallery.filter((item) => item.id !== id) }),
      restoreDefaults: () =>
        replaceConfig({ ...defaultConfig, revision: config.revision, updatedAt: config.updatedAt }),
      importBackup: (json) =>
        replaceConfig({ ...parseImportedConfig(json), revision: config.revision }),
      exportBackup: () => exportConfig(config),
      uploadImage: async (file) => {
        if (!csrfToken) throw new Error("Entre no painel novamente.");
        return uploadRemoteImage(file, csrfToken);
      },
      queueImageDeletion: (url) => {
        if (/^\/uploads\//.test(url)) {
          imagesToDelete.current.add(url);
        }
      },
    };
  }, [authenticated, config, configSource, csrfToken, dirty, saving]);

  return <BarbershopContext.Provider value={value}>{children}</BarbershopContext.Provider>;
}
