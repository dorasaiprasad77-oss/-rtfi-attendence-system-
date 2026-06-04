"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api, setToken, getToken, clearToken, setStoredUser, getStoredUser } from "@/lib/api";
import { disconnectSocket } from "@/lib/socket";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "FACULTY" | "STUDENT";
  department?: string;
  photoUrl?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const stored = getStoredUser();
    if (token && stored) {
      setUser(stored);
      // Verify token is still valid
      api.get<User>("/api/auth/profile").then((u) => {
        setUser(u);
        setStoredUser(u);
      }).catch(() => {
        clearToken();
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>("/api/auth/login", { email, password }, { noAuth: true });
    setToken(data.token);
    setStoredUser(data.user);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    disconnectSocket();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
