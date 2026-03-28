import React from "react";
import { cn } from "../../lib/utils";

interface FilterTabsProps {
  filterTab: "all" | "configured" | "unconfigured" | "unknown";
  setFilterTab: (tab: "all" | "configured" | "unconfigured" | "unknown") => void;
}

export function FilterTabs({ filterTab, setFilterTab }: FilterTabsProps) {
  const tabs: Array<"all" | "configured" | "unconfigured" | "unknown"> = ["all", "configured", "unconfigured", "unknown"];

  return (
    <div className="flex space-x-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setFilterTab(tab)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            filterTab === tab ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  );
}