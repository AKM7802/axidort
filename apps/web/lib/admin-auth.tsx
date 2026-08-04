"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api } from "@/lib/api";
import type { ClientProfile } from "@/lib/types";

const STORAGE_KEY = "lgc_admin_token";

interface AdminAuthState {
  client: ClientProfile | null;
  loading: boolean;
  /** Admin-ness is decided ONLY by role="admin" on the Client row behind
   * this token — the same login every client uses, not a separate system. */
  isAdmin: boolean;
  token: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!stored) {
      setLoading(false);
      return;
    }
    api
      .me(stored)
      .then((profile) => {
        if (profile.role !== "admin") {
          window.localStorage.removeItem(STORAGE_KEY);
          return;
        }
        setToken(stored);
        setClient(profile);
      })
      .catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.signin(email, password);
      if (res.client.role !== "admin") {
        return { error: "This account doesn't have admin access." };
      }
      window.localStorage.setItem(STORAGE_KEY, res.access_token);
      setToken(res.access_token);
      setClient(res.client);
      return { error: null };
    } catch {
      return { error: "Invalid email or password." };
    }
  }, []);

  const signOut = useCallback(async () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setClient(null);
  }, []);

  const isAdmin = client?.role === "admin";

  return (
    <AdminAuthContext.Provider value={{ client, loading, isAdmin, token, signIn, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
