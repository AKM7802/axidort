"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api } from "@/lib/api";
import type { ClientProfile, SignupPayload } from "@/lib/types";

const STORAGE_KEY = "lgc_client_token";

interface ClientAuthState {
  token: string | null;
  client: ClientProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<ClientProfile>;
  signup: (payload: SignupPayload) => Promise<ClientProfile>;
  /** Re-fetches /me and updates the cached profile — used by the
   * post-checkout return page to poll for the webhook-driven status flip
   * from unpaid to active (see app/payment/return/page.tsx). */
  refresh: () => Promise<ClientProfile | null>;
  logout: () => void;
}

const ClientAuthContext = createContext<ClientAuthState | null>(null);

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!stored) {
      setLoading(false);
      return;
    }
    setToken(stored);
    api
      .me(stored)
      .then(setClient)
      .catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.signin(email, password);
    window.localStorage.setItem(STORAGE_KEY, res.access_token);
    setToken(res.access_token);
    setClient(res.client);
    return res.client;
  }, []);

  const signup = useCallback(async (payload: SignupPayload) => {
    const res = await api.signup(payload);
    window.localStorage.setItem(STORAGE_KEY, res.access_token);
    setToken(res.access_token);
    setClient(res.client);
    return res.client;
  }, []);

  const refresh = useCallback(async () => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!stored) return null;
    const profile = await api.me(stored);
    setClient(profile);
    return profile;
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setClient(null);
  }, []);

  return (
    <ClientAuthContext.Provider value={{ token, client, loading, login, signup, refresh, logout }}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth(): ClientAuthState {
  const ctx = useContext(ClientAuthContext);
  if (!ctx) throw new Error("useClientAuth must be used within ClientAuthProvider");
  return ctx;
}
