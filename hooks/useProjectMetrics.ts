"use client"

import { useMemo } from "react"
import { format, differenceInMonths, isValid, parseISO } from "date-fns"

import { calculateGeoJSONAreaSqm, convertArcGISToGeoJSONPolygon } from "@/lib/geometry-utils"

type WorkAreaForMetrics = {
  geometry?: any
  areaSqm?: number
  complexity?: number
  coverage?: number
  duration?: { start?: string; end?: string }
}

type RecordLike = {
  utilityType?: string | null
  utility_type?: string | null
  recordType?: string | null
  record_type?: string | null
  recordTypePath?: string | null
}

export type ProjectMetricsResult = {
  areaKm2: string
  complexityLabel: string
  durationLabel: string
  coveragePct: number
  totalRecords: number
}

const clampComplexityLabel = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Medium"
  }
  if (value <= 2) return "Low"
  if (value === 3) return "Medium"
  return "High"
}

const formatDurationLabel = (duration?: WorkAreaForMetrics["duration"]) => {
  if (!duration) return "TBD"
  const start = duration.start ? parseISO(duration.start) : undefined
  const end = duration.end ? parseISO(duration.end) : undefined

  if (start && end && isValid(start) && isValid(end)) {
    const months = Math.abs(differenceInMonths(end, start)) + 1
    if (months <= 1) return "1 month"
    return `${months} months`
  }
  if (start && isValid(start)) return format(start, "MMM yyyy")
  if (end && isValid(end)) return format(end, "MMM yyyy")
  return "TBD"
}

export function useProjectMetrics(workArea?: WorkAreaForMetrics, records: RecordLike[] = []): ProjectMetricsResult {
  const geometry = useMemo(() => {
    if (!workArea?.geometry) return null
    return convertArcGISToGeoJSONPolygon(workArea.geometry)
  }, [workArea?.geometry])

  const areaSqm = workArea?.areaSqm ?? (geometry ? calculateGeoJSONAreaSqm(geometry) : undefined)
  const areaKm2 = areaSqm ? (areaSqm / 1_000_000).toFixed(2) : "—"

  const complexityLabel = clampComplexityLabel(workArea?.complexity)

  const durationLabel = useMemo(() => formatDurationLabel(workArea?.duration), [workArea?.duration])

  const totalRecords = records.length
  const coveragePct =
    typeof workArea?.coverage === "number" ? Math.min(100, Math.round(workArea.coverage)) : Math.min(100, totalRecords * 3)

  return {
    areaKm2,
    complexityLabel,
    durationLabel,
    coveragePct,
    totalRecords,
  }
}



