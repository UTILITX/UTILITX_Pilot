"use client"

import { Badge } from "@/components/ui/badge"
import { differenceInMonths, format, isValid, parseISO } from "date-fns"

export interface ProjectKPIsProps {
  areaSqm?: number
  complexity?: number
  duration?: { start?: string; end?: string }
  coverage?: number
}

const clampComplexity = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 3
  }
  return Math.min(5, Math.max(1, Math.round(value)))
}

const buildComplexityStars = (value: number) => {
  const filled = clampComplexity(value)
  const empty = 5 - filled
  return `${"★".repeat(filled)}${"☆".repeat(empty)}`
}

const formatDurationLabel = (duration?: ProjectKPIsProps["duration"]) => {
  if (!duration) return "Duration TBD"

  const start = duration.start ? parseISO(duration.start) : undefined
  const end = duration.end ? parseISO(duration.end) : undefined

  if (start && end && isValid(start) && isValid(end)) {
    const months = Math.abs(differenceInMonths(end, start)) + 1
    if (months > 1) {
      return `${months} months`
    }
    if (months === 1) {
      return "1 month"
    }
    return `${format(start, "MMM yyyy")} – ${format(end, "MMM yyyy")}`
  }

  if (start && isValid(start)) {
    return format(start, "MMM yyyy")
  }

  if (end && isValid(end)) {
    return format(end, "MMM yyyy")
  }

  return "Duration TBD"
}

export function ProjectKPIs({ areaSqm, complexity, duration, coverage }: ProjectKPIsProps) {
  const areaLabel = areaSqm ? `${Math.round(areaSqm).toLocaleString()} m²` : "Area TBD"
  const complexityLabel = buildComplexityStars(complexity)
  const durationLabel = formatDurationLabel(duration)
  const coverageLabel =
    typeof coverage === "number" && !Number.isNaN(coverage)
      ? `${Math.round(coverage)}% Coverage`
      : "Coverage TBD"

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold tracking-wide uppercase">
        {areaLabel}
      </Badge>
      <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold tracking-wide">
        {complexityLabel}
      </Badge>
      <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold tracking-wide">
        {durationLabel}
      </Badge>
      <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold tracking-wide">
        {coverageLabel}
      </Badge>
    </div>
  )
}

