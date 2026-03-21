"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth, clearTokens, setTokens, type User } from "@/lib/api";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const u = await auth.me();
      if (!["admin", "examiner", "super_admin"].includes(u.role)) {
        clearTokens();
        setUser(null);
      } else {
        setUser(u);
      }
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await auth.login(email, password);
    setTokens(res.access_token, res.refresh_token);
    const u = await auth.me();
    if (!["admin", "examiner", "super_admin"].includes(u.role)) {
      clearTokens();
      throw { detail: "Access denied. Admin or examiner role required.", status: 403 };
    }
    setUser(u);
  };

  const logout = useCallback(() => {
    // Best-effort server-side logout
    auth.logout().catch(() => {});
    clearTokens();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
