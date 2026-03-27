import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { Product } from "../types";

export function useProducts(filters?: { status?: string; needs_review?: boolean }) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => apiClient.getProducts(filters),
    refetchInterval: 30000,
  });
}

export function useProduct(itemCode: string) {
  return useQuery({
    queryKey: ["product", itemCode],
    queryFn: () => apiClient.getProduct(itemCode),
    enabled: !!itemCode,
  });
}