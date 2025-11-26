"use client"

import { Button } from "@/components/ui/button"
import { PenTool, Sparkles, Upload, ZoomIn } from "lucide-react"

export interface ProjectQuickActionsProps {
  onUploadRecord: () => void
  onDrawGeometry: () => void
  onZoomToArea: () => void
}

export function ProjectQuickActions({
  onUploadRecord,
  onDrawGeometry,
  onZoomToArea,
}: ProjectQuickActionsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <Button
        size="sm"
        variant="outline"
        className="rounded-full min-w-[140px] justify-center whitespace-nowrap"
        onClick={onUploadRecord}
      >
        <Upload className="size-4" />
        Upload Record
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="rounded-full min-w-[140px] justify-center whitespace-nowrap"
        onClick={onDrawGeometry}
      >
        <PenTool className="size-4" />
        Draw Geometry
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="rounded-full min-w-[140px] justify-center whitespace-nowrap"
        onClick={onZoomToArea}
      >
        <ZoomIn className="size-4" />
        Zoom to Area
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="rounded-full min-w-[160px] opacity-50 cursor-not-allowed justify-center whitespace-nowrap"
        disabled
      >
        <Sparkles className="size-4" />
        AI (coming soon)
      </Button>
    </div>
  )
}

