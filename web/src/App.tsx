import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { WebSocketProvider, useWebSocket } from "./contexts/WebSocketContext";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CameraPage } from "./pages/CameraPage";
import { ProductsPage } from "./pages/ProductsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { DebugPage } from "./pages/DebugPage";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

interface AppContentProps {
  children: React.ReactNode;
}

function AppContent({ children }: AppContentProps) {
  const { token, isAuthenticated } = useAuth();
  const { connect } = useWebSocket();

  React.useEffect(() => {
    if (isAuthenticated && token) {
      connect(token);
    }
  }, [isAuthenticated, token, connect]);

  return <AppShell>{children}</AppShell>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <WebSocketProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="*"
                element={
                  <ProtectedRoute>
                    <AppContent>
                      <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/camera" element={<CameraPage />} />
                        <Route path="/products" element={<ProductsPage />} />
                        <Route path="/orders" element={<OrdersPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/debug" element={<DebugPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </AppContent>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </WebSocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;