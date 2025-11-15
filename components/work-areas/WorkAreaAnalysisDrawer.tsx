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
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { WorkAreaCompletenessPanel } from "./WorkAreaCompletenessPanel"
import type { LatLng, RequestRecord } from "@/lib/record-types"
import { FileText, Download, AlertCircle } from "lucide-react"

type WorkAreaAnalysisDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workAreaId?: string
  workAreaName?: string
  polygon?: LatLng[] | null
  records?: RequestRecord[]
  data?: any
  loading?: boolean
}

export function WorkAreaAnalysisDrawer({
  open,
  onOpenChange,
  workAreaId,
  workAreaName,
  polygon,
  records = [],
  data,
  loading = false,
}: WorkAreaAnalysisDrawerProps) {
  // Extract gaps from data
  const gaps = React.useMemo(() => {
    if (data?.gaps && Array.isArray(data.gaps)) {
      return data.gaps
    }
    return []
  }, [data])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="group w-full sm:w-[420px] lg:w-[480px] overflow-y-auto p-6 bg-white border-l border-[var(--utilitx-gray-200)] animate-slideInRight animate-fadeIn"
        style={{ boxShadow: "var(--utilitx-shadow-md)" }}
      >
        {/* Wrap all content in a div to avoid ref issues */}
        <div>
          <SheetHeader className="mb-4 animate-slideUpFade">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-semibold text-[var(--utilitx-gray-900)]">
                {workAreaName ?? workAreaId ?? "Work Area"}
              </SheetTitle>
              {data?.recordCount !== undefined && (
                <Badge variant="secondary" className="ml-2 bg-[var(--utilitx-light-blue)] text-[var(--utilitx-gray-900)]">
                  {data.recordCount} records
                </Badge>
              )}
            </div>
            <SheetDescription className="text-sm text-[var(--utilitx-gray-600)]">
              Data coverage & completeness summary
            </SheetDescription>
          </SheetHeader>

          {/* Arrow Indicator */}
          <div className="flex items-center gap-2 mb-4 animate-slideUpFade" style={{ animationDelay: "0.1s" }}>
            <span className="text-xs text-[var(--utilitx-gray-600)]">Summary</span>
            <svg
              className="h-3 w-3 text-[var(--utilitx-gray-600)] transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="mb-3 text-xs text-[var(--utilitx-gray-600)] animate-pulse">
              Calculating completeness for this work area…
            </div>
          )}

          {/* Summary Section */}
          <div className="mb-6 animate-slideUpFade" style={{ animationDelay: "0.15s" }}>
            <WorkAreaCompletenessPanel
              workAreaId={workAreaId}
              workAreaName={workAreaName}
              polygon={polygon}
              records={records}
              data={data}
              className="border-0 shadow-none"
            />
          </div>

          <div className="h-px bg-[var(--utilitx-gray-200)] my-5" />

          {/* Data Gaps Section */}
          <div className="mb-6 animate-slideUpFade" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-[var(--utilitx-gray-600)]" />
              <h3 className="text-sm font-medium text-[var(--utilitx-gray-700)]">Data Gaps</h3>
            </div>
            {gaps.length > 0 && gaps[0] !== "No data gaps identified" ? (
              <ul className="space-y-2">
                {gaps.map((gap, i) => (
                  <li
                    key={i}
                    className="px-3 py-2 bg-red-50 text-red-700 rounded-md text-xs border border-red-100 hover:bg-red-100 transition-colors duration-200"
                  >
                    {gap}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-2 bg-green-50 text-green-700 rounded-md text-xs border border-green-100">
                No data gaps identified
              </div>
            )}
          </div>

          <div className="h-px bg-[var(--utilitx-gray-200)] my-5" />

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3 animate-slideUpFade" style={{ animationDelay: "0.35s" }}>
            <Button
              className="w-full bg-[var(--utilitx-blue)] hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
              onClick={() => {
                // TODO: Implement view records functionality
                console.log("View records for work area:", workAreaId)
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              View Records
            </Button>
            <Button
              variant="outline"
              className="w-full border-[var(--utilitx-gray-200)] text-[var(--utilitx-gray-900)] hover:bg-[var(--utilitx-gray-100)] transition-all duration-200"
              onClick={() => {
                // TODO: Implement export functionality
                console.log("Export summary for work area:", workAreaId)
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Summary
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

