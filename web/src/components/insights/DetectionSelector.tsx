import React from "react";
import { ChevronDown, Clock, Cpu } from "lucide-react";
import { DetectionResult } from "../../types";
import { formatRelativeTime } from "../../lib/utils";

interface DetectionSelectorProps {
  selectedDetectionId: string | null;
  setSelectedDetectionId: (id: string | null) => void;
  detectionsList: DetectionResult[] | undefined;
  activeDetection: DetectionResult | undefined;
}

export function DetectionSelector({
  selectedDetectionId,
  setSelectedDetectionId,
  detectionsList,
  activeDetection,
}: DetectionSelectorProps) {
  return (
    <div className="bg-white rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Detection History:</label>
        <div className="relative w-full sm:w-80">
          <select
            className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pr-8"
            value={selectedDetectionId || ""}
            onChange={(e) => setSelectedDetectionId(e.target.value || null)}
          >
            <option value="">Latest Detection</option>
            {detectionsList?.map((d) => (
              <option key={d.id} value={d.id}>
                {formatRelativeTime(d.timestamp)} — {d.products.length} products
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-3 h-4 w-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {activeDetection && (
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4" />
            {formatRelativeTime(activeDetection.timestamp)}
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Cpu className="h-4 w-4" />
            {(activeDetection.processing_time_ms / 1000).toFixed(1)}s
          </div>
          <div className="text-gray-600">Camera: {activeDetection.camera_id}</div>
        </div>
      )}
    </div>
  );
}