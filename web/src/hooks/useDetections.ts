import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { REFRESH_MS, SCAN_JOBS_REFRESH_MS } from "../lib/constants";

export function useLatestDetection() {
  return useQuery({
    queryKey: ["detection", "latest"],
    queryFn: () => apiClient.getLatestDetection(),
    refetchInterval: REFRESH_MS,
  });
}

export function useDetection(id: string | null) {
  return useQuery({
    queryKey: ["detection", id],
    queryFn: () => apiClient.getDetection(id!),
    enabled: !!id,
  });
}

export function useDetections(limit = 20, offset = 0) {
  return useQuery({
    queryKey: ["detections", limit, offset],
    queryFn: () => apiClient.getDetections(limit, offset),
  });
}

export function useScanJobs(limit = 5) {
  return useQuery({
    queryKey: ["scanJobs", limit],
    queryFn: () => apiClient.getScanJobs(limit),
    refetchInterval: SCAN_JOBS_REFRESH_MS,
  });
}

export function useTriggerScan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (cameraId?: string) => apiClient.triggerScan(cameraId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scanJobs"] });
      queryClient.invalidateQueries({ queryKey: ["detections"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useCaptureImage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ file, cameraId }: { file: File; cameraId?: string }) => 
      apiClient.captureImage(file, cameraId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scanJobs"] });
      queryClient.invalidateQueries({ queryKey: ["detections"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}