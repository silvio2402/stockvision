import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { REFRESH_MS } from "../lib/constants";

export function useOrders(status?: string) {
  return useQuery({
    queryKey: ["orders", status],
    queryFn: () => apiClient.getOrders(status),
    refetchInterval: REFRESH_MS,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => apiClient.getOrder(id),
    enabled: !!id,
  });
}

export function useApproveOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.approveOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useDeclineOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.declineOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}