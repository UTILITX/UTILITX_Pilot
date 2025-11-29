"use client"

import { ComingSoon } from "@/components/ui/ComingSoon"
import { FileSearch } from "lucide-react"

export function AIInterpretationDrawer() {
  return (
    <ComingSoon>
      <div className="border rounded-md p-3 bg-white shadow-sm hover:bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <FileSearch className="w-4 h-4 text-green-600" />
          <p className="font-medium text-sm">AI Interpretation</p>
        </div>

        <div className="space-y-2 text-xs text-gray-500">
          <p>Detected Utility: —</p>
          <p>Material: —</p>
          <p>Diameter: —</p>

          <hr />

          <p>Street Names: —</p>
          <p>Title Block Clues: —</p>

          <hr />

          <p>Geolocation Confidence: —</p>
          <p>Metadata Confidence: —</p>
        </div>
      </div>
    </ComingSoon>
  )
}


