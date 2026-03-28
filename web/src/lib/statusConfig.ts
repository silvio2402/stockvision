import { ProductStatus } from "../types";

export interface StatusConfig {
  color: string;
  label: string;
}

export const statusConfig: Record<ProductStatus, StatusConfig> = {
  in_stock: { color: "bg-green-100 text-green-700", label: "In Stock" },
  running_out: { color: "bg-red-100 text-red-700", label: "Running Out" },
  unconfigured: { color: "bg-amber-100 text-amber-700", label: "Unconfigured" },
  unknown: { color: "bg-gray-100 text-gray-700", label: "Unknown" },
  not_detected: { color: "bg-gray-100 text-gray-700", label: "Not Detected" },
};