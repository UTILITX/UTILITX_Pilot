"use client"

import { type GeoJsonPolygon } from "@/lib/geometry-utils"

interface ProjectGeometrySummaryProps {
  geometry?: GeoJsonPolygon
  areaSqm?: number
}

export function ProjectGeometrySummary({ geometry, areaSqm }: ProjectGeometrySummaryProps) {
  if (!geometry || !geometry.coordinates?.length) {
    return <div className="text-xs text-[var(--utilitx-gray-600)]">Geometry not available</div>
  }

  const vertices = geometry.coordinates[0]?.length ?? 0
  const areaLabel = areaSqm ? `${Math.round(areaSqm).toLocaleString()} m²` : "Area TBD"

  return (
    <div className="text-xs text-[var(--utilitx-gray-600)]">
      Polygon · {vertices} vertices · {areaLabel}
    </div>
  )
}

