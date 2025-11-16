"use client"

import { Eye, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModeSelectorProps {
  mode: "view" | "upload"
  onModeChange: (mode: "view" | "upload") => void
}

export default function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <>
      {/* Background panel that covers from 0 to drawer edge to eliminate any gap */}
      <div className="absolute top-0 left-0 z-[1998] h-full bg-white" style={{ left: '0px', width: '128px', margin: 0, padding: 0 }} />
      {/* Mode selector buttons positioned in the right place */}
      <div className="absolute top-0 z-[1999] w-12 h-full bg-transparent flex flex-col items-center py-4 gap-2" style={{ left: '80px', margin: 0, padding: 0 }}>
        <button
          onClick={() => onModeChange("view")}
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
            mode === "view"
              ? "bg-[#011e31] text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          )}
          aria-label="View mode"
          title="View"
        >
          <Eye className="h-5 w-5" />
        </button>
        <button
          onClick={() => onModeChange("upload")}
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
            mode === "upload"
              ? "bg-[#011e31] text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          )}
          aria-label="Upload mode"
          title="Upload"
        >
          <Upload className="h-5 w-5" />
        </button>
      </div>
      {/* Border */}
      <div className="absolute top-0 left-0 z-[1999] w-px h-full bg-gray-200" style={{ left: '128px', margin: 0, padding: 0 }} />
    </>
  )
}

