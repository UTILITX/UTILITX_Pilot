"use client";

import React from "react";
import { MapPin, Calendar, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WorkAreaPopupProps = {
  workAreaId?: string;
  workAreaName?: string;
  region?: string;
  owner?: string;
  createdBy?: string;
  date?: string;
  notes?: string;
  onViewRecords?: () => void;
  onCreatedByClick?: (name: string) => void;
  onOpenAnalysis?: () => void;
  onClose?: () => void;
};

export function WorkAreaPopup({
  workAreaId,
  workAreaName,
  region,
  owner,
  createdBy,
  date,
  notes,
  onViewRecords,
  onCreatedByClick,
  onOpenAnalysis,
  onClose,
}: WorkAreaPopupProps) {
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
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          <h3 className="font-bold text-base text-gray-900">
            {workAreaName || `Work Area: ${workAreaId || "N/A"}`}
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      {/* Details */}
      <div className="space-y-2.5 mb-4 text-sm">
        {region && (
          <div className="text-gray-700">
            <span className="font-medium">Region:</span> {region}
          </div>
        )}
        {owner && (
          <div className="text-gray-700">
            <span className="font-medium">Owner:</span> {owner}
          </div>
        )}
        {createdBy && (
          <div className="flex items-center gap-1.5 text-gray-700">
            <User className="h-3.5 w-3.5 text-gray-500" />
            <span className="font-medium">Created by:</span>{" "}
            {onCreatedByClick ? (
              <button
                onClick={() => onCreatedByClick(createdBy)}
                className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                {createdBy}
              </button>
            ) : (
              <span>{createdBy}</span>
            )}
          </div>
        )}
        {date && (
          <div className="flex items-center gap-1.5 text-gray-700">
            <Calendar className="h-3.5 w-3.5 text-gray-500" />
            <span className="font-medium">Date:</span> {formatDate(date) || date}
          </div>
        )}
        {notes !== undefined && (
          <div className="text-gray-700">
            <span className="font-medium mb-1.5 block">Notes:</span>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5 text-gray-600 min-h-[60px]">
              {notes || <span className="text-gray-400 italic">No notes</span>}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        {onOpenAnalysis && (
          <Button
            onClick={onOpenAnalysis}
            className="w-full bg-[#011e31] text-white hover:bg-[#0c4160] rounded-md h-9 text-sm font-medium"
          >
            Open Analysis
          </Button>
        )}
        {onViewRecords && (
          <Button
            onClick={onViewRecords}
            variant="outline"
            className="w-full rounded-md h-9 text-sm font-medium"
          >
            <FileText className="h-4 w-4 mr-2" />
            View Records
          </Button>
        )}
      </div>
    </div>
  );
}

