 "use client"

import { cn } from "@/lib/utils"
import { ProjectHeader } from "@/components/project/ProjectHeader"

type PanelMode = "overview" | "records" | "insights" | "share" | "settings"

interface LeftWorkspacePanelProps {
  currentProject?: {
    id: string
    name?: string
    geometry?: any
    [key: string]: any
  } | null
  setPanelMode?: (mode: PanelMode) => void
  selectedMode?: PanelMode
  onRenameWorkArea: (newName: string) => void
  onUploadRecord: () => void
  onDrawGeometry: () => void
  onZoomToArea: () => void
}

export default function LeftWorkspacePanel({
  currentProject = null,
  setPanelMode,
  selectedMode = "overview",
  onRenameWorkArea,
  onUploadRecord,
  onDrawGeometry,
  onZoomToArea,
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
      <div className="px-4 pt-6 pb-2">
        {isProjectSelected ? (
          <ProjectHeader
            workArea={currentProject}
            onRename={onRenameWorkArea}
            onUploadRecord={onUploadRecord}
            onDrawGeometry={onDrawGeometry}
            onZoomToArea={onZoomToArea}
          />
        ) : (
          <div className="text-sm text-[var(--utilitx-gray-600)]">
            Select a project above
          </div>
        )}
      </div>

      <div className="mx-4 border-t border-[var(--utilitx-gray-200)] my-4" />

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.mode}
            disabled={!isProjectSelected}
            className={cn(
              "w-full text-left py-2.5 px-3 rounded-md text-sm font-medium transition-colors",
              !isProjectSelected && "opacity-40 cursor-not-allowed",
              selectedMode === item.mode
                ? "bg-[var(--utilitx-gray-100)] text-[var(--utilitx-gray-900)]"
                : isProjectSelected && "text-[var(--utilitx-gray-700)] hover:bg-[var(--utilitx-gray-50)] hover:text-[var(--utilitx-blue-600)]"
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
