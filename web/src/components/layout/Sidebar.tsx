import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Camera, Package, ClipboardCheck, Settings, Bug, LogOut } from "lucide-react";

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/camera", icon: Camera, label: "Camera" },
  { path: "/products", icon: Package, label: "Products" },
  { path: "/orders", icon: ClipboardCheck, label: "Orders" },
  { path: "/settings", icon: Settings, label: "Settings" },
  { path: "/debug", icon: Bug, label: "Debug" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 border-r bg-gray-50 hidden md:flex flex-col">
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-900">Menu</h2>
      </div>
      
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
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
    </aside>
  );
}