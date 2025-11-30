"use client"

import { ComingSoon } from "@/components/ui/ComingSoon"
import { Sparkles } from "lucide-react"

export function AISummaryCard() {
  return (
    <ComingSoon>
      <div className="border rounded-md p-3 mb-3 bg-white shadow-sm hover:bg-gray-50">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <p className="font-medium text-sm">AI Summary</p>
        </div>
        <p className="text-xs text-gray-500">Extracted utility info, materials, diameter, and notes.</p>
      </div>
    </ComingSoon>
  )
}



