import React, { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "../api/client";

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
      apiClient.setToken(storedToken);
    }
  }, []);

  const login = async (password: string) => {
    const response = await apiClient.login(password);
    setToken(response.token);
    setIsAuthenticated(true);
    apiClient.setToken(response.token);
  };

  const logout = () => {
    setToken(null);
    setIsAuthenticated(false);
    apiClient.clearToken();
    localStorage.removeItem("auth_token");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}