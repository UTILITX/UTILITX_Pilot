"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { LatLng, RequestRecord } from "@/lib/record-types"
import { defaultTaxonomy, flattenTaxonomy, type Taxonomy } from "@/lib/taxonomy"
import { getUtilityColorsFromDomain, getUtilityColorsFromUtilityType } from "@/lib/utility-colors"
import { Droplet, Flame, Zap, Phone, CloudRain, Trash2 } from "lucide-react"

type WorkAreaCompletenessPanelProps = {
  workAreaId?: string
  workAreaName?: string
  polygon?: LatLng[] | null
  records?: RequestRecord[]
  taxonomy?: Taxonomy
  className?: string
  data?: any // For passing pre-computed data
}

const CATEGORY_DISPLAY_NAMES = {
  water: "Water",
  wastewater: "Wastewater",
  storm: "Storm",
  gas: "Gas",
  power: "Power",
  telecom: "Telecom",
} as const

const ALL_UTILITIES = ["Water", "Gas", "Electric", "Telecom", "Storm", "Wastewater"] as const

const utilityIcons: Record<string, React.ReactNode> = {
  Water: <Droplet className="h-3 w-3" />,
  Gas: <Flame className="h-3 w-3" />,
  Electric: <Zap className="h-3 w-3" />,
  Telecom: <Phone className="h-3 w-3" />,
  Storm: <CloudRain className="h-3 w-3" />,
  Wastewater: <Trash2 className="h-3 w-3" />,
}

const utilityAPWAColors: Record<string, { bg: string; text: string; border: string }> = {
  Water: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  Gas: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" },
  Electric: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
  Telecom: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  Storm: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  Wastewater: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
}

export function WorkAreaCompletenessPanel({
  workAreaId,
  workAreaName,
  polygon,
  records = [],
  taxonomy = defaultTaxonomy,
  className,
  data,
}: WorkAreaCompletenessPanelProps) {
  // Require a closed polygon with at least 3 vertices
  const active = !!polygon && polygon.length >= 3

  const analysis = React.useMemo(() => {
    if (!active || !records.length) {
      return null
    }

    const flat = flattenTaxonomy(taxonomy)

    // Collect present paths inside polygon (distinct)
    const presentPaths = new Set<string>()
    const recordsInside: RequestRecord[] = []

    for (const rec of records) {
      // A record "counts" if any of its georeferenced files has a centroid inside the polygon
      const hasInside = rec.files.some((f) => {
        if (f.status !== "Georeferenced") {
          return false
        }

        // Prefer stored centroid, otherwise derive from path if available
        let lat: number | undefined = typeof f.lat === "number" ? f.lat : undefined
        let lng: number | undefined = typeof f.lng === "number" ? f.lng : undefined

        if ((lat === undefined || lng === undefined) && Array.isArray(f.path) && f.path.length > 0) {
          const c = centroidOfPath(f.path)
          lat = c.lat
          lng = c.lng
        }

        if (typeof lat !== "number" || typeof lng !== "number") {
          return false
        }

        return pointInPolygon({ lat, lng }, polygon!)
      })

      if (hasInside) {
        presentPaths.add(rec.recordTypePath)
        recordsInside.push(rec)
      }
    }

    const categoryGroups = new Map<
      string,
      {
        category: string
        items: Array<{ label: string; owner: string; domain: string; path: string; recordId: string }>
      }
    >()

    // Initialize all categories
    Object.values(CATEGORY_DISPLAY_NAMES).forEach((category) => {
      categoryGroups.set(category.toLowerCase(), { category, items: [] })
    })

    // Track utilities present and record types
    const utilitiesPresent = new Set<string>()
    const recordsByType: Record<string, number> = {
      PDF: 0,
      AsBuilt: 0,
      Locate: 0,
      Permit: 0,
    }

    for (const rec of recordsInside) {
      // Extract utility type from the record path (e.g., "water / as built" -> "water")
      const pathParts = rec.recordTypePath.split("/").map((p) => p.trim().toLowerCase())
      const utilityType = pathParts[0] || ""
      const recordType = pathParts[1] || ""

      // Map utility type to category
      let categoryKey = utilityType
      let utilityDisplayName = ""
      if (utilityType === "wastewater/sanitary" || utilityType === "wastewater") {
        categoryKey = "wastewater"
        utilityDisplayName = "Wastewater"
      } else if (utilityType === "stormwater" || utilityType === "storm") {
        categoryKey = "storm"
        utilityDisplayName = "Storm"
      } else if (utilityType === "natural gas" || utilityType === "gas") {
        categoryKey = "gas"
        utilityDisplayName = "Gas"
      } else if (utilityType === "electric" || utilityType === "power") {
        categoryKey = "power"
        utilityDisplayName = "Electric"
      } else if (utilityType === "telco" || utilityType === "telecom") {
        categoryKey = "telecom"
        utilityDisplayName = "Telecom"
      } else if (utilityType === "water") {
        categoryKey = "water"
        utilityDisplayName = "Water"
      }

      if (utilityDisplayName) {
        utilitiesPresent.add(utilityDisplayName)
      }

      // Count record types
      const recordTypeLower = recordType.toLowerCase()
      if (recordTypeLower.includes("asbuilt") || recordTypeLower.includes("as-built")) {
        recordsByType.AsBuilt++
      } else if (recordTypeLower.includes("locate")) {
        recordsByType.Locate++
      } else if (recordTypeLower.includes("permit")) {
        recordsByType.Permit++
      } else {
        recordsByType.PDF++
      }

      const group = categoryGroups.get(categoryKey)
      if (group) {
        group.items.push({
          label: recordType || rec.recordTypePath, // Use record type (e.g., "as built")
          owner: rec.orgName || "Unknown",
          domain: utilityType,
          path: rec.recordTypePath,
          recordId: rec.id,
        })
      }
    }

    // Sort items within each category by owner then label
    categoryGroups.forEach((group) => {
      group.items.sort((a, b) => {
        const ownerCompare = a.owner.localeCompare(b.owner)
        if (ownerCompare !== 0) return ownerCompare
        return a.label.localeCompare(b.label)
      })
    })

    // Filter out empty categories and sort by category name
    const nonEmptyCategories = Array.from(categoryGroups.values())
      .filter((group) => group.items.length > 0)
      .sort((a, b) => a.category.localeCompare(b.category))

    const totalPresent = recordsInside.length

    // Calculate completeness percentage (based on utilities present vs all utilities)
    const completenessPct = Math.round((utilitiesPresent.size / ALL_UTILITIES.length) * 100)

    // Identify missing utilities
    const missingUtilities = ALL_UTILITIES.filter((u) => !utilitiesPresent.has(u))
    const gaps = missingUtilities.map((u) => `Missing ${u} records`)

    return {
      categories: nonEmptyCategories,
      totalPresent,
      utilitiesPresent: Array.from(utilitiesPresent),
      recordsByType,
      completenessPct,
      gaps,
    }
  }, [active, polygon, records, taxonomy])

  // Use data prop if provided, otherwise use computed analysis
  const completenessPct = data?.completenessPct ?? analysis?.completenessPct ?? 82
  const recordCount = data?.recordCount ?? analysis?.totalPresent ?? 0
  const utilitiesPresent = data?.utilitiesPresent ?? analysis?.utilitiesPresent ?? []
  const recordsByType = data?.recordsByType ?? analysis?.recordsByType ?? { PDF: 0, AsBuilt: 0, Locate: 0, Permit: 0 }
  const gaps = data?.gaps ?? analysis?.gaps ?? []

  // Get confidence bar color based on completeness
  const getBarColor = (pct: number) => {
    if (pct >= 80) return "bg-green-600"
    if (pct >= 60) return "bg-blue-600"
    if (pct >= 40) return "bg-yellow-600"
    return "bg-red-600"
  }

  return (
    <div className={className}>
      {!active ? (
        <div className="bg-white rounded-xl p-4 border border-[var(--utilitx-gray-200)] animate-slideUpFade animate-fadeIn" style={{ boxShadow: "var(--utilitx-shadow-light)" }}>
          <div className="text-sm text-[var(--utilitx-gray-600)]">Draw a polygon to see uploaded records.</div>
        </div>
      ) : !analysis && !data ? (
        <div className="bg-white rounded-xl p-4 border border-[var(--utilitx-gray-200)] animate-slideUpFade animate-fadeIn" style={{ boxShadow: "var(--utilitx-shadow-light)" }}>
          <div className="text-sm text-[var(--utilitx-gray-600)]">No analysis available.</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-4 border border-[var(--utilitx-gray-200)] animate-slideUpFade animate-fadeIn" style={{ boxShadow: "var(--utilitx-shadow-light)" }}>
          {/* Bold Completeness Score */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--utilitx-gray-600)]">Completeness</div>
              <div className="text-2xl font-bold text-[var(--utilitx-gray-900)]">{completenessPct}%</div>
            </div>
            <div className="text-xs px-2 py-1 rounded-md bg-[var(--utilitx-light-blue)] text-[var(--utilitx-gray-900)] font-medium">
              {recordCount} records
            </div>
          </div>

          {/* Horizontal Confidence Bar */}
          <div className="w-full h-2 bg-gray-100 rounded-md overflow-hidden mb-6">
            <div
              className={`h-full ${getBarColor(completenessPct)} transition-all duration-500`}
              style={{ width: `${completenessPct}%` }}
            ></div>
          </div>

          {/* Utility Coverage Matrix */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-[var(--utilitx-gray-700)] mb-2">Utility Coverage</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_UTILITIES.map((u) => {
                const isPresent = utilitiesPresent.includes(u)
                const colors = utilityAPWAColors[u] || {
                  bg: "bg-gray-100",
                  text: "text-gray-700",
                  border: "border-gray-200",
                }
                return (
                  <span
                    key={u}
                    className={`
                      px-2 py-1 text-xs rounded-md border flex items-center gap-1
                      ${
                        isPresent
                          ? `${colors.bg} ${colors.text} ${colors.border}`
                          : "bg-gray-100 text-gray-400 border-gray-200 line-through opacity-60"
                      }
                    `}
                  >
                    {utilityIcons[u]}
                    {u}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Record-Type Breakdown */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-[var(--utilitx-gray-700)] mb-2">Records by Type</h3>
            <div className="space-y-2">
              {Object.entries(recordsByType)
                .filter(([_, count]) => count > 0)
                .map(([type, count]) => {
                  // Get APWA color for record type indicator
                  const colors = getUtilityColorsFromUtilityType(type.toLowerCase())
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: colors.stroke }}
                        ></span>
                        <span className="text-sm text-[var(--utilitx-gray-900)]">{type}</span>
                      </div>
                      <span className="text-sm text-[var(--utilitx-gray-900)] font-medium">{count}</span>
                    </div>
                  )
                })}
              {Object.values(recordsByType).every((count) => count === 0) && (
                <div className="text-sm text-[var(--utilitx-gray-600)]">No records by type</div>
              )}
            </div>
          </div>

          {/* Data Gaps Section */}
          {gaps.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--utilitx-gray-700)] mb-2">Data Gaps</h3>
              <ul className="space-y-1">
                {gaps.map((gap, index) => (
                  <li
                    key={index}
                    className="px-2 py-1 bg-red-50 text-red-700 rounded-md text-xs border border-red-200"
                  >
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Standard ray-casting algorithm
function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng,
      yi = polygon[i].lat
    const xj = polygon[j].lng,
      yj = polygon[j].lat
    const intersect =
      yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + 0.0) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function centroidOfPath(path: LatLng[]): LatLng {
  if (!path || path.length === 0) return { lat: 0, lng: 0 }
  const sum = path.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 })
  return { lat: sum.lat / path.length, lng: sum.lng / path.length }
}

