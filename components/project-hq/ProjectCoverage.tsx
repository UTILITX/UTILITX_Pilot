"use client"

import type { RequestRecord } from "@/lib/record-types"
import { getUtilityColorsFromUtilityType } from "@/lib/utility-colors"

const TARGET_UTILITIES = ["Water", "Gas", "Electric", "Telecom", "Storm", "Wastewater"]

export interface ProjectCoverageProps {
  records?: RequestRecord[]
}

export function ProjectCoverage({ records = [] }: ProjectCoverageProps) {
  const total = records.length

  const counts = TARGET_UTILITIES.reduce<Record<string, number>>((acc, utility) => {
    acc[utility] = 0
    return acc
  }, {})

  records.forEach((record) => {
    const type = record.utilityType || record.utility_type || record.orgName || "Other"
    const normalized = TARGET_UTILITIES.find((candidate) =>
      type.toLowerCase().includes(candidate.toLowerCase())
    )
    if (normalized) {
      counts[normalized] += 1
    }
  })

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-[var(--utilitx-gray-500)]">Coverage</div>
      <div className="text-sm font-semibold text-[var(--utilitx-gray-900)]">
        {total} record{total === 1 ? "" : "s"}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {TARGET_UTILITIES.map((utility) => {
          const count = counts[utility]
          const active = count > 0
          const colors = getUtilityColorsFromUtilityType(utility)
          const style = active
            ? {
                borderColor: colors.stroke,
                color: colors.stroke,
                backgroundColor: colors.fill,
              }
            : {
                borderColor: "#e5e7eb",
                color: "#94a3b8",
                backgroundColor: "#f8fafc",
              }
          return (
            <div
              key={utility}
              style={style}
              className="flex items-center justify-between rounded-full border px-3 py-1 font-semibold shadow-sm"
            >
              <span>{utility}</span>
              <span>{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

