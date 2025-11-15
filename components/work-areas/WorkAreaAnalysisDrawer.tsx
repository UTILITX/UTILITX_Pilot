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
}

export function WorkAreaAnalysisDrawer({
  open,
  onOpenChange,
  workAreaId,
  workAreaName,
  polygon,
  records = [],
  data,
}: WorkAreaAnalysisDrawerProps) {
  // Extract utility types from records
  const utilityTypes = React.useMemo(() => {
    const utilities = new Set<string>()
    records.forEach((rec) => {
      const pathParts = rec.recordTypePath?.split("/").map((p) => p.trim().toLowerCase()) || []
      const utilityType = pathParts[0] || ""
      if (utilityType) {
        // Normalize utility type names
        if (utilityType.includes("water") && !utilityType.includes("waste")) {
          utilities.add("Water")
        } else if (utilityType.includes("wastewater") || utilityType.includes("sanitary")) {
          utilities.add("Wastewater")
        } else if (utilityType.includes("storm")) {
          utilities.add("Storm")
        } else if (utilityType.includes("gas")) {
          utilities.add("Gas")
        } else if (utilityType.includes("electric") || utilityType.includes("power")) {
          utilities.add("Electric")
        } else if (utilityType.includes("telco") || utilityType.includes("telecom")) {
          utilities.add("Telecom")
        }
      }
    })
    return Array.from(utilities)
  }, [records])

  // Count records by type
  const recordCounts = React.useMemo(() => {
    const counts = {
      pdf: 0,
      asBuilt: 0,
      locate: 0,
      permit: 0,
      total: records.length,
    }
    
    records.forEach((rec) => {
      const pathLower = rec.recordTypePath?.toLowerCase() || ""
      if (pathLower.includes("asbuilt") || pathLower.includes("as-built")) {
        counts.asBuilt++
      } else if (pathLower.includes("locate")) {
        counts.locate++
      } else if (pathLower.includes("permit")) {
        counts.permit++
      } else {
        counts.pdf++
      }
    })
    
    return counts
  }, [records])

  // Calculate coverage percentage
  const coveragePercentage = React.useMemo(() => {
    if (!polygon || records.length === 0) return null
    // Placeholder calculation - can be enhanced with actual completeness logic
    const baseCoverage = Math.min(100, Math.round((records.length / 20) * 100))
    return baseCoverage
  }, [polygon, records])

  // Extract gaps from data or generate placeholder
  const gaps = React.useMemo(() => {
    if (data?.gaps && Array.isArray(data.gaps)) {
      return data.gaps
    }
    // Generate gaps based on missing utilities
    const allUtilities = ["Water", "Wastewater", "Storm", "Gas", "Electric", "Telecom"]
    const missingUtilities = allUtilities.filter((util) => !utilityTypes.includes(util))
    return missingUtilities.length > 0
      ? missingUtilities.map((util) => `Missing ${util} records`)
      : ["No data gaps identified"]
  }, [data, utilityTypes])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="group w-full sm:w-[420px] lg:w-[480px] overflow-y-auto p-6 bg-white border-l border-[#dad9d6] animate-slideInRight"
      >
        <SheetHeader className="mb-4 animate-slideUpFade">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold text-[#011e31]">
              {workAreaName ?? workAreaId ?? "Work Area"}
            </SheetTitle>
            {coveragePercentage !== null && (
              <Badge variant="secondary" className="ml-2 bg-[#d7e0eb] text-[#011e31]">
                {coveragePercentage}% coverage
              </Badge>
            )}
          </div>
          <SheetDescription className="text-sm text-[#68869a]">
            Completeness & data coverage summary
          </SheetDescription>
        </SheetHeader>

        {/* Arrow Indicator */}
        <div className="flex items-center gap-2 mb-4 animate-slideUpFade" style={{ animationDelay: "0.1s" }}>
          <span className="text-xs text-[#68869a]">Summary</span>
          <svg
            className="h-3 w-3 text-[#68869a] transition-transform duration-300 group-hover:translate-x-1"
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

        <div className="h-px bg-[#dad9d6] my-5" />

        {/* Utility Coverage Section */}
        <div className="mb-6 animate-slideUpFade" style={{ animationDelay: "0.2s" }}>
          <h3 className="text-sm font-medium text-[#011e31] mb-3 flex items-center gap-1">
            Utilities Covered
            <span className="text-[#68869a]">•</span>
            <span className="text-[#68869a] text-xs font-normal">{utilityTypes.length} types</span>
          </h3>
          {utilityTypes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {utilityTypes.map((util) => {
                const colors: Record<string, { bg: string; hover: string; text: string }> = {
                  Water: { bg: "bg-blue-100", hover: "hover:bg-blue-200", text: "text-blue-700" },
                  Wastewater: { bg: "bg-purple-100", hover: "hover:bg-purple-200", text: "text-purple-700" },
                  Storm: { bg: "bg-cyan-100", hover: "hover:bg-cyan-200", text: "text-cyan-700" },
                  Gas: { bg: "bg-yellow-100", hover: "hover:bg-yellow-200", text: "text-yellow-700" },
                  Electric: { bg: "bg-green-100", hover: "hover:bg-green-200", text: "text-green-700" },
                  Telecom: { bg: "bg-pink-100", hover: "hover:bg-pink-200", text: "text-pink-700" },
                }
                const color = colors[util] || { bg: "bg-gray-100", hover: "hover:bg-gray-200", text: "text-gray-700" }
                return (
                  <Badge
                    key={util}
                    variant="secondary"
                    className={`${color.bg} ${color.hover} ${color.text} border-0 transition-colors duration-200 cursor-default`}
                  >
                    {util}
                  </Badge>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-[#68869a]">No utilities identified</p>
          )}
        </div>

        <div className="h-px bg-[#dad9d6] my-5" />

        {/* Records Section */}
        <div className="mb-6 animate-slideUpFade" style={{ animationDelay: "0.25s" }}>
          <h3 className="text-sm font-medium text-[#011e31] mb-3 flex items-center gap-1">
            Records in this Work Area
            <span className="text-[#68869a]">•</span>
            <span className="text-[#68869a] text-xs font-normal">{recordCounts.total} total</span>
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#68869a]">Total Records</span>
              <span className="font-medium text-[#011e31]">{recordCounts.total}</span>
            </div>
            {recordCounts.asBuilt > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#68869a]">As-builts</span>
                <span className="font-medium text-[#011e31]">{recordCounts.asBuilt}</span>
              </div>
            )}
            {recordCounts.locate > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#68869a]">Locates</span>
                <span className="font-medium text-[#011e31]">{recordCounts.locate}</span>
              </div>
            )}
            {recordCounts.permit > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#68869a]">Permits</span>
                <span className="font-medium text-[#011e31]">{recordCounts.permit}</span>
              </div>
            )}
            {recordCounts.pdf > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#68869a]">PDFs</span>
                <span className="font-medium text-[#011e31]">{recordCounts.pdf}</span>
              </div>
            )}
            {recordCounts.total === 0 && (
              <p className="text-sm text-[#68869a]">No records found</p>
            )}
          </div>
        </div>

        <div className="h-px bg-[#dad9d6] my-5" />

        {/* Data Gaps Section */}
        <div className="mb-6 animate-slideUpFade" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-[#68869a]" />
            <h3 className="text-sm font-medium text-[#011e31]">Data Gaps</h3>
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

        <div className="h-px bg-[#dad9d6] my-5" />

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 animate-slideUpFade" style={{ animationDelay: "0.35s" }}>
          <Button
            className="w-full bg-[#011e31] hover:bg-[#0c4160] text-white shadow-sm hover:shadow-md transition-all duration-200"
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
            className="w-full border-[#dad9d6] text-[#011e31] hover:bg-[#d7e0eb] transition-all duration-200"
            onClick={() => {
              // TODO: Implement export functionality
              console.log("Export summary for work area:", workAreaId)
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Summary
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

