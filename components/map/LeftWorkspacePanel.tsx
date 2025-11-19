"use client"

import { cn } from "@/lib/utils"

type NavigationMode = "workareas" | "records" | "insights" | "share" | "settings"

interface LeftWorkspacePanelProps {
  selectedMode?: NavigationMode
  onSelect?: (mode: NavigationMode) => void
  selectedWorkArea?: {
    id: string
    name: string
    [key: string]: any
  } | null
}

export default function LeftWorkspacePanel({
  selectedMode = "workareas",
  onSelect,
  selectedWorkArea = null,
}: LeftWorkspacePanelProps) {
  const navItems: Array<{ mode: NavigationMode; label: string }> = [
    { mode: "workareas", label: "Work Areas" },
    { mode: "records", label: "Records" },
    { mode: "insights", label: "Insights" },
    { mode: "share", label: "Share" },
    { mode: "settings", label: "Settings" },
  ]

  return (
    <aside className="fixed left-[72px] top-[56px] h-[calc(100vh-64px)] w-[256px] bg-white shadow-xl rounded-r-2xl z-30 flex flex-col border-r border-[var(--utilitx-gray-200)]">
      {/* Project Header */}
      <div className="px-4 py-6 border-b border-[var(--utilitx-gray-200)]">
        <h2 className="text-xs text-[var(--utilitx-gray-600)] mb-1">Project</h2>
        {selectedWorkArea ? (
          <p className="text-lg font-semibold text-[var(--utilitx-gray-900)]">
            {selectedWorkArea.name || selectedWorkArea.id}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No Project Selected</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.mode}
            className={cn(
              "w-full text-left py-2.5 px-3 rounded-md text-sm font-medium transition-colors",
              selectedMode === item.mode
                ? "bg-[var(--utilitx-gray-100)] text-[var(--utilitx-gray-900)]"
                : "text-[var(--utilitx-gray-700)] hover:bg-[var(--utilitx-gray-50)]"
            )}
            onClick={() => onSelect?.(item.mode)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[var(--utilitx-gray-200)]">
        <div className="text-xs text-[var(--utilitx-gray-600)] font-medium">UTILITX</div>
      </div>
    </aside>
  )
}
