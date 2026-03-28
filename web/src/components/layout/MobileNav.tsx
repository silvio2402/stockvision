import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Camera, Package, ClipboardCheck, Settings, Bug } from "lucide-react";
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
  { path: "/insights", icon: Bug, label: "Insights" },
];

export function MobileNav() {
  const location = useLocation();
  const { data: settings } = useSettings();

  const filteredNavItems = navItems.filter(item => {
    if (item.path === "/insights") {
      return settings?.developer_mode;
    }
    return true;
  });

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-40 pb-safe">
      <div className="flex items-center justify-around h-16">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "scale-110" : ""} transition-transform`} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
