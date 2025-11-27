"use client"

import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import { Pencil } from "lucide-react"

import { Input } from "@/components/ui/input"
import { format, parseISO, isValid } from "date-fns"

export type ProjectHeaderData = {
  name?: string
  owner?: string
  updatedAt?: string
}

export interface ProjectHeaderProps {
  project?: ProjectHeaderData
  onRename?: (newName: string) => void
}

const formatUpdatedAt = (value?: string) => {
  if (!value) return "Unknown"
  const parsed = parseISO(value)
  return isValid(parsed) ? format(parsed, "MMM d, yyyy") : "Unknown"
}

export function ProjectHeader({ project, onRename }: ProjectHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState(project?.name ?? "")

  useEffect(() => {
    if (!isEditing) {
      setDraftName(project?.name ?? "")
    }
  }, [project?.name, isEditing])

  const handleCommit = () => {
    const trimmed = draftName.trim()
    if (!trimmed || trimmed === project?.name) {
      setIsEditing(false)
      setDraftName(project?.name ?? "")
      return
    }
    onRename?.(trimmed)
    setIsEditing(false)
  }

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      handleCommit()
    } else if (event.key === "Escape") {
      setDraftName(project?.name ?? "")
      setIsEditing(false)
    }
  }

  return (
    <div className="space-y-1">
      {isEditing ? (
        <Input
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKey}
          className="text-lg font-semibold bg-white"
          autoFocus
        />
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="text-lg font-semibold text-[var(--utilitx-gray-900)]">
            {project?.name ?? "Untitled Project"}
          </div>
          <Pencil
            className="size-4 text-[var(--utilitx-gray-500)] hover:text-[var(--utilitx-gray-900)] cursor-pointer"
            onClick={() => setIsEditing(true)}
          />
        </div>
      )}
      <div className="text-xs text-[var(--utilitx-gray-600)] space-y-0.5">
        <p>Owner: {project?.owner ?? "You"}</p>
        <p>Last updated: {formatUpdatedAt(project?.updatedAt)}</p>
      </div>
    </div>
  )
}



