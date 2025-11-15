"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { WorkAreaCompletenessPanel } from "./WorkAreaCompletenessPanel"
import type { LatLng, RequestRecord } from "@/lib/record-types"

type WorkAreaAnalysisDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workAreaId?: string
  workAreaName?: string
  polygon?: LatLng[] | null
  records?: RequestRecord[]
  data?: any
}

export function WorkAreaAnalysisDrawer({
  open,
  onOpenChange,
  workAreaId,
  workAreaName,
  polygon,
  records,
  data,
}: WorkAreaAnalysisDrawerProps) {
  // Calculate coverage percentage if we have data
  const coveragePercentage = React.useMemo(() => {
    if (!polygon || !records || records.length === 0) return null
    
    // This is a placeholder - you can enhance this with actual completeness calculation
    // For now, we'll just show a basic percentage based on records in the area
    return null // Will be calculated in the completeness panel
  }, [polygon, records])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[420px] lg:w-[480px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>{workAreaName ?? "Selected Work Area"}</SheetTitle>
            {coveragePercentage !== null && (
              <Badge variant="secondary" className="ml-2">
                {coveragePercentage}% coverage
              </Badge>
            )}
          </div>
          <SheetDescription>
            Data completeness and coverage summary.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <WorkAreaCompletenessPanel
            workAreaId={workAreaId}
            workAreaName={workAreaName}
            polygon={polygon}
            records={records}
            data={data}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

