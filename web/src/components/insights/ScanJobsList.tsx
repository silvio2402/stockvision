import React from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Activity } from "lucide-react";
import { ScanJob } from "../../types";
import { formatRelativeTime } from "../../lib/utils";

interface ScanJobsListProps {
  scanJobs: ScanJob[];
  onSelectJob: (detectionId: string | null) => void;
}

export function ScanJobsList({ scanJobs, onSelectJob }: ScanJobsListProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Activity className="h-4 w-4" /> Pipeline Jobs
        </h3>
      </div>
      <div className="divide-y max-h-48 overflow-y-auto">
        {scanJobs.map((job) => (
          <div key={job.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {job.status === "running" && <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />}
              {job.status === "completed" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {job.status === "failed" && <AlertCircle className="h-5 w-5 text-red-500" />}
              <div>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {job.status} {job.camera_id && `(${job.camera_id})`}
                </p>
                <p className="text-xs text-gray-500">
                  Started: {formatRelativeTime(job.started_at)}
                  {job.completed_at && ` • Ended: ${formatRelativeTime(job.completed_at)}`}
                </p>
              </div>
            </div>
            {job.error_message && (
              <div className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded max-w-md truncate" title={job.error_message}>
                {job.error_message}
              </div>
            )}
            {job.detection_id && (
              <button onClick={() => onSelectJob(job.detection_id || null)} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                View Result
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}