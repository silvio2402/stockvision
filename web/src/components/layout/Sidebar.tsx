import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Box, LayoutDashboard, Camera, Package, ClipboardCheck, Settings, Bug, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSettings } from "../../hooks/useSettings";

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

export function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const { data: settings } = useSettings();

  const filteredNavItems = navItems.filter(item => {
    if (item.path === "/debug") {
      return settings?.developer_mode;
    }
    return true;
  });

  return (
    <aside className="w-64 border-r bg-gray-50 hidden md:flex flex-col h-full">
      <div className="p-6 flex items-center gap-2">
        <Box className="h-6 w-6 text-blue-600" />
        <span className="text-xl font-bold text-gray-900">StockVision</span>
      </div>
      
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={logout}
            className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
          
          <Link
            to="/camera"
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Open Camera"
          >
            <Camera className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}