"use client"

import type { RequestRecord } from "@/lib/record-types"
import type { ProjectHeaderProps } from "./ProjectHeader"
import type { ProjectMetricsProps } from "./ProjectMetrics"
import type { ProjectCoverageProps } from "./ProjectCoverage"
import { ProjectHeader } from "./ProjectHeader"
import { ProjectMetrics } from "./ProjectMetrics"
import { ProjectCoverage } from "./ProjectCoverage"
import { ProjectQuickActions } from "./ProjectQuickActions"

export interface ProjectHQProps {
  project?: ProjectHeaderProps["project"]
  workArea?: ProjectMetricsProps["workArea"]
  records?: RequestRecord[]
  onRenameProject?: (name: string) => void
  onUploadRecord?: () => void
  onAddWorkArea?: () => void
  onShareProject?: () => void
  onZoomToArea?: () => void
}

export function ProjectHQ({
  project,
  workArea,
  records = [],
  onRenameProject,
  onUploadRecord,
  onAddWorkArea,
  onShareProject,
  onZoomToArea,
}: ProjectHQProps) {
  return (
    <div className="bg-white/80 border border-[var(--utilitx-gray-200)] rounded-2xl shadow-sm p-4 space-y-5">
      <ProjectHeader project={project} onRename={onRenameProject} />
      <ProjectMetrics workArea={workArea} records={records} />
      <ProjectCoverage records={records} />
      <ProjectQuickActions
        onUploadRecords={onUploadRecord}
        onAddWorkArea={onAddWorkArea}
        onShareProject={onShareProject}
        onZoomToArea={onZoomToArea}
      />
    </div>
  )
}



