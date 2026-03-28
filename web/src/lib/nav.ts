import { LayoutDashboard, Package, ClipboardCheck, Settings, Bug } from "lucide-react";

export interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
  requiresDevMode?: boolean;
}

export const navItems: NavItem[] = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/products", icon: Package, label: "Products" },
  { path: "/orders", icon: ClipboardCheck, label: "Orders" },
  { path: "/settings", icon: Settings, label: "Settings" },
  { path: "/insights", icon: Bug, label: "Insights", requiresDevMode: true },
];