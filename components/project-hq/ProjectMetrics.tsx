"use client"

import type { RequestRecord } from "@/lib/record-types"
import { useProjectMetrics } from "@/hooks/useProjectMetrics"
import type { LucideIcon } from "lucide-react"
import { MapPin, Layers3, Clock3, Percent } from "lucide-react"

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

function MetricRow({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-[0.8rem]">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
          <Icon className="h-3 w-3" />
        </div>
        <span className="text-[0.7rem] uppercase tracking-[0.18em] text-[var(--utilitx-gray-600)]">
          {label}
        </span>
      </div>
      <span className="ml-2 text-sm font-semibold text-[var(--utilitx-gray-900)]">{value}</span>
    </div>
  )
}

export function ProjectMetrics({ workArea, records = [] }: ProjectMetricsProps) {
  const { areaKm2, complexityLabel, durationLabel, coveragePct } = useProjectMetrics(workArea, records)
  const areaValue = !Number.isNaN(Number(areaKm2)) ? `${Number(areaKm2).toFixed(2)} km²` : "—"

  return (
    <div className="space-y-1">
      <MetricRow label="Area" value={areaValue} icon={MapPin} />
      <MetricRow label="Complexity" value={complexityLabel} icon={Layers3} />
      <MetricRow label="Duration" value={durationLabel} icon={Clock3} />
      <MetricRow label="Coverage" value={`${coveragePct}%`} icon={Percent} />
    </div>
  )
}

