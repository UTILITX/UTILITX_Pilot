"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

interface ProjectQuickActionsProps {
  onUploadRecords?: () => void
  onAddWorkArea?: () => void
  onShareProject?: () => void
  onZoomToArea?: () => void
}

const quickActions = [
  { label: "Upload Records", key: "upload" },
  { label: "Add Work Area", key: "add" },
  { label: "Share Project", key: "share" },
  { label: "Zoom to Area", key: "zoom" },
]

export function ProjectQuickActions({
  onUploadRecords,
  onAddWorkArea,
  onShareProject,
  onZoomToArea,
}: ProjectQuickActionsProps) {
  const [open, setOpen] = useState(false)
  const reference = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reference.current && !reference.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleAction = (key: string) => {
    setOpen(false)
    if (key === "upload") onUploadRecords?.()
    if (key === "add") onAddWorkArea?.()
    if (key === "share") onShareProject?.()
    if (key === "zoom") onZoomToArea?.()
  }

  return (
    <div ref={reference} className="relative">
      <Button size="sm" variant="outline" onClick={() => setOpen((prev) => !prev)}>
        Quick Actions
      </Button>
      {open && (
        <div className="absolute left-0 mt-2 w-48 rounded-xl border border-[var(--utilitx-gray-200)] bg-white shadow-lg">
          {quickActions.map((action) => (
            <button
              key={action.key}
              onClick={() => handleAction(action.key)}
              className="w-full px-3 py-2 text-left text-sm text-[var(--utilitx-gray-700)] hover:bg-[var(--utilitx-gray-50)]"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

