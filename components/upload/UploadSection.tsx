"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string; icon?: string };

type Props = {
  utilityTypes: Option[];
  recordTypes: Option[];
  geometryTypes: Option[];
  selectedUtilityType: string | null;
  selectedRecordType: string | null;
  selectedGeometryType: string | null;
  onUtilityTypeSelect: (value: string) => void;
  onRecordTypeSelect: (value: string) => void;
  onGeometryTypeSelect: (value: string) => void;
  onAttachDrop: React.DragEventHandler<HTMLDivElement>;
  onAttachDragOver: React.DragEventHandler<HTMLDivElement>;
  onAttachDragLeave: React.DragEventHandler<HTMLDivElement>;
  isDraggingAttach: boolean;
  onFileInputChange: React.ChangeEventHandler<HTMLInputElement>;
  uploadedFiles: File[];
  files: FileList | null;
};

/**
 * Reusable Upload Section
 * (Copied directly from components/workflows/upload-tab.tsx)
 *
 * Props must match the existing handlers & state:
 */
export function UploadSection({
  utilityTypes,
  recordTypes,
  geometryTypes,
  selectedUtilityType,
  selectedRecordType,
  selectedGeometryType,
  onUtilityTypeSelect,
  onRecordTypeSelect,
  onGeometryTypeSelect,
  onAttachDrop,
  onAttachDragOver,
  onAttachDragLeave,
  isDraggingAttach,
  onFileInputChange,
  uploadedFiles,
  files,
}: Props) {
  const isSelectionComplete = Boolean(selectedUtilityType && selectedRecordType && selectedGeometryType);

  return (
    <div className="space-y-4">
      {/* Utility Chips */}
      <div className="grid gap-3">
        <Label className="text-sm font-medium">Utility Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {utilityTypes.map((utility) => (
            <Button
              key={utility.value}
              variant="outline"
              className={cn(
                "h-auto p-3 flex items-center justify-center border-2 transition-all text-xs",
                selectedUtilityType === utility.value
                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                  : "hover:bg-muted",
              )}
              onClick={() => onUtilityTypeSelect(utility.value)}
            >
              <span className="font-medium">{utility.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Record Type Chips */}
      <div className="grid gap-3">
        <Label className="text-sm font-medium">Record Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {recordTypes.map((record) => (
            <Button
              key={record.value}
              variant="outline"
              className={cn(
                "h-auto p-3 flex items-center justify-center border-2 transition-all text-xs",
                selectedRecordType === record.value
                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                  : "hover:bg-muted",
              )}
              onClick={() => onRecordTypeSelect(record.value)}
              disabled={!selectedUtilityType}
            >
              <span className="font-medium">{record.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Geometry Chips */}
      <div className="grid gap-3">
        <Label className="text-sm font-medium">Geometry Type</Label>
        <div className="grid grid-cols-3 gap-2">
          {geometryTypes.map((geometry) => (
            <Button
              key={geometry.value}
              variant="outline"
              className={cn(
                "h-auto p-3 flex flex-col items-center gap-2 border-2 transition-all text-xs",
                selectedGeometryType === geometry.value
                  ? "bg-primary/10 text-primary border-primary hover:bg-primary/20"
                  : "hover:bg-muted/50",
              )}
              onClick={() => onGeometryTypeSelect(geometry.value)}
              disabled={!selectedRecordType}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-lg font-bold border",
                  selectedGeometryType === geometry.value
                    ? "bg-primary/20 text-primary border-primary"
                    : "bg-muted border-muted-foreground/20",
                )}
              >
                {geometry.icon}
              </div>
              <span className="font-medium">{geometry.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Selection Summary */}
      {isSelectionComplete && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 p-3 text-sm">
          <span className="font-medium">Selection:</span>{" "}
          <span className="font-medium">
            {selectedUtilityType} • {selectedRecordType} • {selectedGeometryType}
          </span>
        </div>
      )}

      {/* File Input + Drag Drop */}
      <div
        className="relative grid gap-3 rounded-md"
        onDragEnter={onAttachDragOver}
        onDragOver={onAttachDragOver}
        onDragLeave={onAttachDragLeave}
        onDrop={onAttachDrop}
      >
        <Label htmlFor="upload-file-input">Files (PDF/Images/CAD)</Label>

        <div
          className={cn(
            "rounded-md border p-2 transition-colors",
            isDraggingAttach ? "border-emerald-500 bg-emerald-50/40" : "border-muted",
          )}
        >
          <Input
            id="upload-file-input"
            type="file"
            accept="application/pdf,image/png,image/jpeg,.dwg,.dxf,.tiff,.tif"
            multiple
            onChange={onFileInputChange}
          />
          <div className="mt-1 text-xs text-muted-foreground">Drag files here to start the flow, or use the picker.</div>
        </div>

        {uploadedFiles.length > 0 ? (
          <div className="text-xs text-muted-foreground">
            {uploadedFiles.length} file(s) uploaded: {uploadedFiles.map((f) => f.name).join(", ")}
          </div>
        ) : files && files.length > 0 ? (
          <div className="text-xs text-muted-foreground">{files.length} file(s) selected</div>
        ) : null}

        <div
          className={cn(
            "pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-md px-3 py-1 text-xs font-medium shadow-sm transition-opacity",
            isDraggingAttach ? "opacity-100 bg-emerald-600 text-white" : "opacity-0",
          )}
          aria-hidden={!isDraggingAttach}
        >
          Drop files to start flow
        </div>
      </div>

      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed p-8 text-center transition-all",
          isDraggingAttach ? "border-emerald-500 bg-emerald-50/50" : "border-muted-foreground/25 hover:border-muted-foreground/50",
          isSelectionComplete ? "opacity-100" : "opacity-50 pointer-events-none",
        )}
        onDragEnter={onAttachDragOver}
        onDragOver={onAttachDragOver}
        onDragLeave={onAttachDragLeave}
        onDrop={onAttachDrop}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-muted p-3">
            <svg className="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Drop files here to upload</p>
            <p className="text-xs text-muted-foreground">PDF, Images, CAD files supported</p>
          </div>
        </div>

        {isDraggingAttach && (
          <div className="absolute inset-0 rounded-lg bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center">
            <div className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium">Drop files to start upload flow</div>
          </div>
        )}
      </div>
    </div>
  );
}

