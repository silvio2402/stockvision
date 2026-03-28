import React, { useState } from "react";
import { useLatestDetection, useDetections, useDetection, useTriggerScan, useCaptureImage, useScanJobs } from "../hooks/useDetections";
import { DetectionResult, ScanJob } from "../types";
import { CAMERA_ID } from "../lib/constants";
import { InsightsPage as InsightsPageLayout } from "../components/insights/page";

export function InsightsPage() {
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);

  const { data: latestDetection, isLoading: isLoadingLatest } = useLatestDetection();
  const { data: detectionsList } = useDetections(20);
  const { data: scanJobs } = useScanJobs(5);
  const { data: selectedDetection, isLoading: isLoadingSelected } = useDetection(selectedDetectionId);
  const triggerScan = useTriggerScan();
  const captureImage = useCaptureImage();

  const isJobRunning = scanJobs?.some((job: ScanJob) => job.status === "running") || false;
  const isScanning = triggerScan.isPending || isJobRunning;

  const handleScan = () => {
    triggerScan.mutate(CAMERA_ID);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await captureImage.mutateAsync({ file, cameraId: CAMERA_ID });
      setSelectedDetectionId(null);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload image");
    }
  };

  return (
    <InsightsPageLayout
      selectedDetectionId={selectedDetectionId}
      setSelectedDetectionId={setSelectedDetectionId}
      latestDetection={latestDetection}
      isLoadingLatest={isLoadingLatest}
      selectedDetection={selectedDetection}
      isLoadingSelected={isLoadingSelected}
      detectionsList={detectionsList}
      scanJobs={scanJobs}
      isScanning={isScanning}
      onScan={handleScan}
      onUpload={handleUpload}
      isCapturePending={captureImage.isPending}
    />
  );
}
