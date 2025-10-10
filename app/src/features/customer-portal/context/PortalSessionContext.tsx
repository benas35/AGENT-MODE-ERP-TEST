import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PortalPreferences = {
  notify_email: boolean;
  notify_sms: boolean;
  notify_whatsapp: boolean;
};

type PortalSession = {
  accessToken: string;
  orgId: string;
  customerId: string;
  workOrderId: string | null;
  expiresAt: string;
  preferences: PortalPreferences;
};

type PortalSessionContextValue = {
  status: "idle" | "requesting" | "authenticating" | "authenticated";
  session: PortalSession | null;
  requestMagicLink: (input: { email: string; workOrderNumber?: string }) => Promise<void>;
  verifyToken: (token: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  updatePreferences: (prefs: PortalPreferences) => void;
};

const PortalSessionContext = createContext<PortalSessionContextValue | undefined>(undefined);

const STORAGE_KEY = "customer-portal-session";

const readStoredSession = (): PortalSession | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PortalSession;
    if (!parsed?.accessToken) return null;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const persistSession = (session: PortalSession | null) => {
  if (!session) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const PortalSessionProvider = ({ children }: { children: React.ReactNode }) => {
  const { toast } = useToast();
  const [session, setSession] = useState<PortalSession | null>(() => readStoredSession());
  const [status, setStatus] = useState<PortalSessionContextValue["status"]>(session ? "authenticated" : "idle");

  useEffect(() => {
    if (session) {
      supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.accessToken,
        expires_in: Math.max(60, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000)),
        token_type: "bearer",
      }).catch((error) => {
        console.error("Failed to prime Supabase session", error);
      });
    }
  }, [session?.accessToken, session?.expiresAt]);

  const requestMagicLink = useCallback<PortalSessionContextValue["requestMagicLink"]>(
    async ({ email, workOrderNumber }) => {
      setStatus("requesting");
      try {
        const { data, error } = await supabase.functions.invoke("customer-portal", {
          body: {
            action: "generate_link",
            email,
            workOrderNumber,
          },
        });

        if (error) {
          console.error("Failed to generate magic link", error);
          toast({
            title: "Nepavyko išsiųsti nuorodos",
            description: "Patikrinkite el. pašto adresą ir bandykite dar kartą.",
            variant: "destructive",
          });
          setStatus(session ? "authenticated" : "idle");
          return;
        }

        toast({
          title: "Nuoroda išsiųsta",
          description: `Patikrinkite el. paštą ${data?.email ?? email} – nuoroda galioja 24 valandas.`,
        });
      } catch (error) {
        console.error(error);
        toast({
          title: "Nepavyko išsiųsti nuorodos",
          description: "Įvyko nenumatyta klaida. Bandykite vėliau.",
          variant: "destructive",
        });
      } finally {
        setStatus(session ? "authenticated" : "idle");
      }
    },
    [session, toast],
  );

  const verifyToken = useCallback<PortalSessionContextValue["verifyToken"]>(
    async (token) => {
      setStatus("authenticating");
      try {
        const { data, error } = await supabase.functions.invoke("customer-portal", {
          body: {
            action: "verify_token",
            token,
          },
        });

        if (error || !data?.access_token) {
          console.error("Token verification failed", error);
          toast({
            title: "Nuoroda negalioja",
            description: "Prašome paprašyti naujos nuorodos.",
            variant: "destructive",
          });
          setStatus(session ? "authenticated" : "idle");
          return false;
        }

        const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
        const nextSession: PortalSession = {
          accessToken: data.access_token,
          orgId: data.org_id,
          customerId: data.customer_id,
          workOrderId: data.work_order_id ?? null,
          expiresAt,
          preferences: data.preferences ?? {
            notify_email: true,
            notify_sms: true,
            notify_whatsapp: false,
          },
        };

        persistSession(nextSession);
        setSession(nextSession);
        setStatus("authenticated");
        toast({
          title: "Prisijungimas sėkmingas",
          description: "Galite matyti darbo užsakymo eigą ir patvirtinti darbus.",
        });
        return true;
      } catch (error) {
        console.error(error);
        toast({
          title: "Nepavyko patvirtinti nuorodos",
          description: "Patikrinkite interneto ryšį ir bandykite dar kartą.",
          variant: "destructive",
        });
        setStatus(session ? "authenticated" : "idle");
        return false;
      }
    },
    [session, toast],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    persistSession(null);
    setSession(null);
    setStatus("idle");
  }, []);

  const updatePreferences = useCallback((prefs: PortalPreferences) => {
    setSession((current) => {
      if (!current) return current;
      const next: PortalSession = { ...current, preferences: prefs };
      persistSession(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    persistSession(session);
  }, [session]);

  const value = useMemo<PortalSessionContextValue>(
    () => ({ status, session, requestMagicLink, verifyToken, signOut, updatePreferences }),
    [status, session, requestMagicLink, verifyToken, signOut, updatePreferences],
  );

  return <PortalSessionContext.Provider value={value}>{children}</PortalSessionContext.Provider>;
};

export const usePortalSessionContext = () => {
  const ctx = useContext(PortalSessionContext);
  if (!ctx) {
    throw new Error("usePortalSessionContext must be used within PortalSessionProvider");
  }
  return ctx;
};
