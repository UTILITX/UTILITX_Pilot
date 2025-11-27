"use client"

import { cn } from "@/lib/utils"
import type { RequestRecord } from "@/lib/record-types"
import { ProjectHQ } from "@/components/project-hq/ProjectHQ"

type PanelMode = "overview" | "records" | "insights" | "share" | "settings"

interface LeftWorkspacePanelProps {
  currentProject?: {
    id: string
    name?: string
    geometry?: any
    owner?: string
    updatedAt?: string
    duration?: { start?: string; end?: string }
    [key: string]: any
  } | null
  setPanelMode?: (mode: PanelMode) => void
  selectedMode?: PanelMode
  onRenameWorkArea: (newName: string) => void
  onUploadRecord: () => void
  onAddWorkArea: () => void
  onShareProject: () => void
  onZoomToArea: () => void
  records?: RequestRecord[]
}

export default function LeftWorkspacePanel({
  currentProject = null,
  setPanelMode,
  selectedMode = "overview",
  onRenameWorkArea,
  onUploadRecord,
  onAddWorkArea,
  onShareProject,
  onZoomToArea,
  records = [],
}: LeftWorkspacePanelProps) {
  const navItems: Array<{ mode: PanelMode; label: string }> = [
    { mode: "overview", label: "Overview" },
    { mode: "records", label: "Records" },
    { mode: "insights", label: "Insights" },
    { mode: "share", label: "Share" },
    { mode: "settings", label: "Settings" },
  ]

  const isProjectSelected = !!currentProject

  return (
    <aside
      data-left-workspace-panel=""
      className="fixed left-[72px] top-[56px] h-[calc(100vh-64px)] w-[300px] bg-white shadow-xl rounded-r-2xl z-30 flex flex-col border-r border-[var(--utilitx-gray-200)]"
    >
      <div className="px-4 pt-6 pb-2 space-y-3">
        {isProjectSelected ? (
          <ProjectHQ
            project={{
              name: currentProject?.name ?? currentProject?.id,
              owner: currentProject?.owner,
              updatedAt: currentProject?.updatedAt,
            }}
            workArea={currentProject}
            records={records}
            onRenameProject={onRenameWorkArea}
            onUploadRecord={onUploadRecord}
            onAddWorkArea={onAddWorkArea}
            onShareProject={onShareProject}
            onZoomToArea={onZoomToArea}
          />
        ) : (
          <div className="text-sm text-[var(--utilitx-gray-600)]">Select a project above</div>
        )}
      </div>

      <div className="mx-4 border-t border-[var(--utilitx-gray-200)] my-2" />

      {/* Navigation */}
      <nav className="mt-auto flex flex-col gap-1 px-2 pb-4">
        {navItems.map((item) => (
          <button
            key={item.mode}
            disabled={!isProjectSelected}
            className={cn(
              "w-full text-left py-2 px-3 rounded-full text-sm font-semibold transition-colors",
              "border border-transparent",
              !isProjectSelected && "opacity-40 cursor-not-allowed",
              selectedMode === item.mode
                ? "bg-[var(--utilitx-blue)] text-white border-[var(--utilitx-blue)] shadow-sm"
                : isProjectSelected && "bg-white text-[var(--utilitx-gray-700)] hover:bg-white/80 hover:border-[var(--utilitx-gray-200)]"
            )}
            onClick={() => {
              if (isProjectSelected && setPanelMode) {
                setPanelMode(item.mode)
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[var(--utilitx-gray-200)] mt-auto">
        <div className="text-xs text-[var(--utilitx-gray-600)] font-medium">UTILITX</div>
      </div>
    </aside>
  )
}
