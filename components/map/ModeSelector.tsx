"use client"

import { Eye, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

type Mode = "view" | "upload"

interface ModeSelectorProps {
  mode: Mode
  onModeChange: (mode: Mode) => void
}

export default function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="fixed left-16 top-16 h-[calc(100vh-64px)] w-10 bg-white border-r border-[var(--utilitx-gray-200)] z-30 flex flex-col items-center py-4 shadow-sm">
      <button
        onClick={() => onModeChange("view")}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all mb-2",
          mode === "view"
            ? "bg-[var(--utilitx-blue)] text-white"
            : "text-[var(--utilitx-gray-600)] hover:bg-[var(--utilitx-gray-100)]"
        )}
        title="View Mode"
      >
        <Eye className="h-4 w-4" />
      </button>
      <button
        onClick={() => onModeChange("upload")}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
          mode === "upload"
            ? "bg-[var(--utilitx-blue)] text-white"
            : "text-[var(--utilitx-gray-600)] hover:bg-[var(--utilitx-gray-100)]"
        )}
        title="Upload Mode"
      >
        <Upload className="h-4 w-4" />
      </button>
    </div>
  )
}
