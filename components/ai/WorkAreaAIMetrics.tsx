"use client"

import { ComingSoon } from "@/components/ui/ComingSoon"
import { Brain } from "lucide-react"

export function WorkAreaAIMetrics() {
  return (
    <ComingSoon>
      <div className="border rounded-md p-4 bg-white shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-indigo-500" />
          <p className="font-medium text-sm">Work Area Intelligence</p>
        </div>

        <div className="space-y-2 text-xs text-gray-600">
          <p>Record Completeness: —%</p>
          <div className="w-full bg-gray-200 h-2 rounded"></div>

          <p>AI Coverage Score: —/100</p>
          <div className="w-full bg-gray-200 h-2 rounded"></div>

          <p>Detected Gaps: —</p>
        </div>
      </div>
    </ComingSoon>
  )
}



