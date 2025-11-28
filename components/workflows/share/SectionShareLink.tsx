"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { useWorkspaceStore } from "@/stores/workspaceStore"
import { useProjectStore } from "@/zustand/projectStore"
import { buildSharedProject, persistSharedWorkarea } from "@/lib/share"

export default function SectionShareLink() {
  const currentProject = useWorkspaceStore((state) => state.currentProject)
  const demoProject = useProjectStore((state) => state.demoProject)
  const setProject = useProjectStore((state) => state.setProject)
  const [requirePasscode, setRequirePasscode] = useState(false)

  const shareProject = useMemo(
    () => buildSharedProject(currentProject, demoProject),
    [currentProject, demoProject],
  )
  const projectTarget = shareProject
  const shareUrl = useMemo(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://utilitx.app"
    return `${origin}/view/${shareProject.id}`
  }, [shareProject])

  const handleCopy = async () => {
    setProject(shareProject)
    persistSharedWorkarea(shareProject)
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast({ title: "Share link ready", description: "Paste the URL manually." })
      return
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast({ title: "Share link copied" })
    } catch (error) {
      console.error("Failed to copy link", error)
      toast({ title: "Copy failed", description: "Use your keyboard to copy." })
    }
  }

  const passcodeLabel = useMemo(
    () => (requirePasscode ? "Passcode required (demo)" : "Passcode optional"),
    [requirePasscode],
  )

  return (
    <section className="pb-6">
      <h2 className="text-lg font-semibold mb-1">Shareable Link</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Anyone with the link can view this Work Area. Use the toggle if you want to hint that a passcode is needed.
      </p>

      <div className="flex gap-2 mb-3">
        <Input value={shareUrl} readOnly />
        <Button variant="outline" onClick={handleCopy}>
          Copy
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{projectTarget.name}</p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Shared ID: {projectTarget.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={requirePasscode} onCheckedChange={(value) => setRequirePasscode(value)} />
          <span className="text-xs text-muted-foreground">{passcodeLabel}</span>
        </div>
      </div>
    </section>
  )
}

