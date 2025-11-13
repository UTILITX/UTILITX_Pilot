"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getUtilityColorsFromUtilityType } from "@/lib/utility-colors"
import type { RequestRecord } from "@/lib/record-types"

type Props = {
  records: RequestRecord[]
  className?: string
}

// APWA utility types with display names
const APWA_UTILITIES = [
  { key: "water", label: "Water", description: "Potable water systems" },
  { key: "wastewater", label: "Wastewater", description: "Sanitary sewer systems" },
  { key: "storm", label: "Stormwater", description: "Storm drainage systems" },
  { key: "gas", label: "Gas", description: "Natural gas utilities" },
  { key: "telecom", label: "Telecom", description: "Communications systems" },
  { key: "electric", label: "Hydro/Electric", description: "Power utilities" },
] as const

export function UtilityOverviewPanel({ records, className }: Props) {
  const utilityCounts = React.useMemo(() => {
    // Initialize counts map
    const counts = new Map<string, number>()
    APWA_UTILITIES.forEach((utility) => {
      counts.set(utility.key, 0)
    })

    // Early return if no records
    if (!records || !Array.isArray(records) || records.length === 0) {
      return counts
    }

    // Count actual records
    records.forEach((record) => {
      // Skip null/undefined records
      if (!record) return

      // Handle Esri records (no recordTypePath) - extract from attributes
      if (!record.recordTypePath) {
        // Try to get utility type from Esri attributes
        const esriUtilityType = (record as any).attributes?.utility_type
        if (esriUtilityType && typeof esriUtilityType === "string") {
          const utilityKey = esriUtilityType.toLowerCase().trim()
          if (counts.has(utilityKey)) {
            counts.set(utilityKey, (counts.get(utilityKey) || 0) + 1)
          }
        }
        return // Skip path-based processing for Esri records
      }

      // Handle upload-session (folder-based) records
      // SAFELY extract utility type from record path
      const recordPath = record.recordTypePath
      
      // Triple-check that recordPath is a valid string before any operations
      if (!recordPath || typeof recordPath !== "string") {
        return // Skip if not a valid string
      }

      // Now safe to split
      const safePath = recordPath.trim()
      if (!safePath) return // Skip empty strings

      const pathParts = safePath.split("/").map((p) => p.trim().toLowerCase()).filter(Boolean)

      // Look for utility type in the path
      let utilityKey: string | null = null

      for (const part of pathParts) {
        if (part.includes("water") && !part.includes("waste") && !part.includes("storm")) {
          utilityKey = "water"
          break
        } else if (part.includes("wastewater") || part.includes("sanitary")) {
          utilityKey = "wastewater"
          break
        } else if (part.includes("stormwater") || part.includes("storm")) {
          utilityKey = "storm"
          break
        } else if (part.includes("gas") || part.includes("natural gas")) {
          utilityKey = "gas"
          break
        } else if (part.includes("telco") || part.includes("telecom")) {
          utilityKey = "telecom"
          break
        } else if (part.includes("power") || part.includes("electric") || part.includes("hydro")) {
          utilityKey = "electric"
          break
        }
      }

      if (utilityKey && counts.has(utilityKey)) {
        counts.set(utilityKey, (counts.get(utilityKey) || 0) + 1)
      }
    })

    return counts
  }, [records])

  const totalRecords = records?.length || 0
  const recordsWithFiles = records?.filter((r) => Array.isArray(r.files) && r.files.length > 0).length || 0

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Record Completeness Overview</CardTitle>
        <div className="text-sm text-muted-foreground mb-2">
          Completeness shows which utility types are represented in this corridor. More types = higher confidence in
          your decision.
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{totalRecords} total records</span>
          <span>{recordsWithFiles} with files</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {APWA_UTILITIES.map((utility) => {
            const count = utilityCounts.get(utility.key) || 0
            const colors = getUtilityColorsFromUtilityType(utility.key)
            const hasRecords = count > 0

            return (
              <div
                key={utility.key}
                className={`rounded-lg border-2 p-4 transition-all ${
                  hasRecords ? "border-current bg-current/5" : "border-muted bg-muted/20"
                }`}
                style={
                  hasRecords
                    ? {
                        borderColor: colors.stroke,
                        backgroundColor: `${colors.fill}15`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: colors.stroke }}
                      aria-hidden
                    />
                    <span className="font-medium text-sm">{utility.label}</span>
                  </div>
                  <Badge variant={hasRecords ? "default" : "secondary"} className="text-xs">
                    {count} records
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">{utility.description}</div>
                {count === 0 && <div className="text-xs text-orange-600 mt-1 font-medium">Missing data</div>}
              </div>
            )
          })}
        </div>

        {totalRecords === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-sm">No utility records uploaded yet</div>
            <div className="text-xs mt-1">Upload records to see completeness overview</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
