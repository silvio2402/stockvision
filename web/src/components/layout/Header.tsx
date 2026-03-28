import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Box, LayoutDashboard, User, Package, ClipboardCheck, Settings, Bug, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/products", icon: Package, label: "Products" },
  { path: "/orders", icon: ClipboardCheck, label: "Orders" },
  { path: "/settings", icon: Settings, label: "Settings" },
  { path: "/debug", icon: Bug, label: "Debug" },
];

export function Header() {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <header className="border-b bg-white">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Box className="h-6 w-6 text-blue-600" />
          <span className="text-xl font-bold">StockVision</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          <User className="h-4 w-4" />
          <span className="hidden md:inline text-sm font-medium">Log out</span>
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}