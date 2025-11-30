"use client"

import { ComingSoon } from "@/components/ui/ComingSoon"
import { Sparkles } from "lucide-react"

export function AIGeolocationPreview() {
  return (
    <ComingSoon>
      <div className="border rounded-md p-3 mb-3 bg-white shadow-sm hover:bg-gray-50">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-[var(--utilitx-blue)]" />
          <p className="font-medium text-sm">AI Geolocation</p>
        </div>

        <ul className="text-xs text-gray-500 space-y-1">
          <li>Intersection Guess: —</li>
          <li>Detected City: —</li>
          <li>Rotation: —°</li>
          <li>Trust Score: —/100</li>
        </ul>

        <div className="mt-2 w-full h-20 bg-gray-200 rounded" />
      </div>
    </ComingSoon>
  )
}



