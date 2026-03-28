import React from "react";
import { Button } from "../layout/ui";
import { Bug, RefreshCw, Upload } from "lucide-react";
import { DetectionResult, ScanJob } from "../../types";
import { formatRelativeTime } from "../../lib/utils";
import { CAMERA_ID } from "../../lib/constants";
import { ScanJobsList } from "./ScanJobsList";
import { DetectionSelector } from "./DetectionSelector";
import { InsightsImageAndViewer } from "./InsightsImageAndViewer";
import { InsightsResults } from "./InsightsResults";

interface InsightsPageProps {
  selectedDetectionId: string | null;
  setSelectedDetectionId: (id: string | null) => void;
  latestDetection: DetectionResult | undefined;
  isLoadingLatest: boolean;
  selectedDetection: DetectionResult | undefined;
  isLoadingSelected: boolean;
  detectionsList: DetectionResult[] | undefined;
  scanJobs: ScanJob[] | undefined;
  isScanning: boolean;
  onScan: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCapturePending: boolean;
}

export function InsightsPage({
  selectedDetectionId,
  setSelectedDetectionId,
  latestDetection,
  isLoadingLatest,
  selectedDetection,
  isLoadingSelected,
  detectionsList,
  scanJobs,
  isScanning,
  onScan,
  onUpload,
  isCapturePending,
}: InsightsPageProps) {
  const activeDetection = selectedDetectionId ? selectedDetection : latestDetection;
  const isLoading = selectedDetectionId ? isLoadingSelected : isLoadingLatest;

  return (
    <div className="p-6 space-y-6">
      <InsightsHeader isScanning={isScanning} onScan={onScan} onUpload={onUpload} isCapturePending={isCapturePending} />

      {scanJobs && scanJobs.length > 0 && <ScanJobsList scanJobs={scanJobs} onSelectJob={setSelectedDetectionId} />}

      <DetectionSelector
        selectedDetectionId={selectedDetectionId}
        setSelectedDetectionId={setSelectedDetectionId}
        detectionsList={detectionsList}
        activeDetection={activeDetection}
      />

      {activeDetection && (
        <>
          <InsightsImageAndViewer activeDetection={activeDetection} isLoading={isLoading} />

          <InsightsResults
            activeDetection={activeDetection}
            selectedDetectionId={selectedDetectionId}
          />
        </>
      )}
    </div>
  );
}

interface InsightsHeaderProps {
  isScanning: boolean;
  onScan: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCapturePending: boolean;
}

function InsightsHeader({ isScanning, onScan, onUpload, isCapturePending }: InsightsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Bug className="h-6 w-6" /> Insights Console
      </h1>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 bg-white border px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm font-medium">
          <Upload className="h-4 w-4" />
          <span>Upload Image</span>
          <input type="file" accept="image/*" onChange={onUpload} className="hidden" disabled={isCapturePending} />
        </label>
        <Button onClick={onScan} disabled={isScanning}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? "animate-spin" : ""}`} />
          {isScanning ? "Scanning..." : "Trigger Scan"}
        </Button>
      </div>
    </div>
  );
}