import React from "react";
import { Button } from "../layout/ui";
import { RotateCcw, Save } from "lucide-react";

interface UnsavedChangesProps {
  onReset: () => void;
  onSave: () => void;
  isPending: boolean;
}

export function UnsavedChanges({ onReset, onSave, isPending }: UnsavedChangesProps) {
  return (
    <div className="fixed bottom-20 md:bottom-8 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 flex items-center justify-between md:justify-center gap-3 bg-white px-4 md:px-6 py-4 rounded-2xl md:rounded-full shadow-[0_-5px_40px_rgba(0,0,0,0.15)] md:shadow-[0_0_40px_rgba(0,0,0,0.1)] border border-gray-200 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <span className="text-sm font-medium text-gray-700 mr-2 hidden md:inline-block">Unsaved changes</span>
      <Button variant="secondary" onClick={onReset} disabled={isPending} className="rounded-xl md:rounded-full px-4 md:px-5 w-full md:w-auto flex-1 md:flex-none">
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset
      </Button>
      <Button onClick={onSave} disabled={isPending} className="rounded-xl md:rounded-full px-4 md:px-6 shadow-md hover:shadow-lg transition-shadow w-full md:w-auto flex-1 md:flex-none">
        <Save className="h-4 w-4 mr-2" />
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}