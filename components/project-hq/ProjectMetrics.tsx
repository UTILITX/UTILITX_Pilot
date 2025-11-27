"use client"

import type { RequestRecord } from "@/lib/record-types"
import { useProjectMetrics } from "@/hooks/useProjectMetrics"

export interface ProjectMetricsProps {
  workArea?: {
    geometry?: any
    areaSqm?: number
    complexity?: number
    coverage?: number
    duration?: { start?: string; end?: string }
  }
  records?: RequestRecord[]
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.75rem] font-semibold text-[var(--utilitx-gray-900)]">
      <span className="text-[var(--utilitx-gray-600)] text-[0.65rem] uppercase tracking-[0.3em]">{label}</span>
      <span className="ml-2">{value}</span>
    </div>
  )
}

export function ProjectMetrics({ workArea, records = [] }: ProjectMetricsProps) {
  const { areaKm2, complexityLabel, durationLabel, coveragePct } = useProjectMetrics(workArea, records)
  const areaValue = !Number.isNaN(Number(areaKm2)) ? `${Number(areaKm2).toFixed(2)} km²` : "—"

  return (
    <div className="space-y-1">
      <MetricRow label="Area" value={areaValue} />
      <MetricRow label="Complexity" value={complexityLabel} />
      <MetricRow label="Duration" value={durationLabel} />
      <MetricRow label="Coverage" value={`${coveragePct}%`} />
    </div>
  )
}

