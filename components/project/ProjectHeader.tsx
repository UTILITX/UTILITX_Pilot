"use client"

import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import { format, isValid, parseISO } from "date-fns"
import { Pencil } from "lucide-react"

import { Input } from "@/components/ui/input"
import { ProjectGeometrySummary } from "@/components/project/ProjectGeometrySummary"
import { ProjectKPIs } from "@/components/project/ProjectKPIs"
import { ProjectQuickActions } from "@/components/project/ProjectQuickActions"
import { type GeoJsonPolygon } from "@/lib/geometry-utils"

export interface ProjectHeaderProps {
  workArea: {
    id: string
    name?: string
    geometry?: GeoJsonPolygon
    areaSqm?: number
    complexity?: number
    duration?: { start?: string; end?: string }
    coverage?: number
    updatedAt?: string
    owner?: string
  }
  onRename: (newName: string) => void
  onUploadRecord: () => void
  onDrawGeometry: () => void
  onZoomToArea: () => void
}

export function ProjectHeader({
  workArea,
  onRename,
  onUploadRecord,
  onDrawGeometry,
  onZoomToArea,
}: ProjectHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState(workArea.name ?? "")

  useEffect(() => {
    if (!isEditing) {
      setDraftName(workArea.name ?? "")
    }
  }, [workArea.name, isEditing])

  const formattedUpdatedAt = useMemo(() => {
    if (!workArea.updatedAt) return "Unknown"
    const parsed = parseISO(workArea.updatedAt)
    if (!isValid(parsed)) return "Unknown"
    return format(parsed, "MMM d, yyyy")
  }, [workArea.updatedAt])

  const handleCommitName = () => {
    const trimmed = draftName.trim()
    if (!trimmed) {
      setDraftName(workArea.name ?? "")
      setIsEditing(false)
      return
    }
    if (trimmed !== workArea.name) {
      onRename(trimmed)
    }
    setIsEditing(false)
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      handleCommitName()
    } else if (event.key === "Escape") {
      setDraftName(workArea.name ?? "")
      setIsEditing(false)
    }
  }

  return (
    <div className="bg-muted/40 rounded-xl p-3 space-y-3 shadow-sm border border-[var(--utilitx-gray-200)] max-h-[280px]">
      <div className="space-y-1">
        {isEditing ? (
          <Input
            className="text-lg font-semibold bg-white"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={handleCommitName}
            onKeyDown={handleInputKeyDown}
            autoFocus
          />
        ) : (
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[var(--utilitx-gray-900)] truncate">
              {workArea.name ?? "Untitled Work Area"}
            </h2>
            <Pencil
              className="size-4 cursor-pointer text-[var(--utilitx-gray-500)] transition-colors hover:text-[var(--utilitx-gray-900)]"
              onClick={() => setIsEditing(true)}
            />
          </div>
        )}
        <div className="text-xs text-[var(--utilitx-gray-600)] space-y-0.5">
          <p>Last updated: {formattedUpdatedAt}</p>
          <p>Owner: {workArea.owner ?? "You"}</p>
        </div>
      </div>

      <ProjectKPIs
        areaSqm={workArea.areaSqm}
        complexity={workArea.complexity}
        duration={workArea.duration}
        coverage={workArea.coverage}
      />

      <ProjectQuickActions
        onUploadRecord={onUploadRecord}
        onDrawGeometry={onDrawGeometry}
        onZoomToArea={onZoomToArea}
      />

      <ProjectGeometrySummary geometry={workArea.geometry} areaSqm={workArea.areaSqm} />
    </div>
  )
}

