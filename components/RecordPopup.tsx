"use client";

import React from "react";
import { FileText, Calendar, User, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RecordPopupProps = {
  recordId?: string;
  source?: string;
  processedDate?: string;
  uploadedBy?: string;
  filePath?: string;
  fileUrl?: string;
  onViewFile?: () => void;
  onDownload?: () => void;
  onUploadedByClick?: (name: string) => void;
};

export function RecordPopup({
  recordId,
  source,
  processedDate,
  uploadedBy,
  filePath,
  fileUrl,
  onViewFile,
  onDownload,
  onUploadedByClick,
}: RecordPopupProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-w-[280px] max-w-[400px] bg-white rounded-lg shadow-lg border border-gray-200 p-4 font-sans">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-blue-600" />
        <h3 className="font-bold text-base text-gray-900">
          Record: {recordId || "N/A"}
        </h3>
      </div>

      {/* Details */}
      <div className="space-y-2.5 mb-4 text-sm">
        {source && (
          <div className="text-gray-700">
            <span className="font-medium">Source:</span> {source}
          </div>
        )}
        {processedDate && (
          <div className="flex items-center gap-1.5 text-gray-700">
            <Calendar className="h-3.5 w-3.5 text-gray-500" />
            <span className="font-medium">Processed:</span> {formatDate(processedDate) || processedDate}
          </div>
        )}
        {uploadedBy && (
          <div className="flex items-center gap-1.5 text-gray-700">
            <User className="h-3.5 w-3.5 text-gray-500" />
            <span className="font-medium">Uploaded by:</span>{" "}
            {onUploadedByClick ? (
              <button
                onClick={() => onUploadedByClick(uploadedBy)}
                className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                {uploadedBy}
              </button>
            ) : (
              <span>{uploadedBy}</span>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onViewFile) onViewFile();
          }}
          variant="outline"
          disabled={!onViewFile || (!filePath && !fileUrl)}
          className="flex-1 bg-white text-black border-gray-300 hover:bg-gray-50 rounded-md h-9 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Eye className="h-4 w-4 mr-2" />
          View File
        </Button>
        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onDownload) onDownload();
          }}
          disabled={!onDownload || (!filePath && !fileUrl)}
          className="flex-1 bg-black text-white hover:bg-gray-800 rounded-md h-9 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    </div>
  );
}

