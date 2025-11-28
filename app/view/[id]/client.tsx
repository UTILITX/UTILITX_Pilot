"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import MapWithDrawing from "@/components/map-with-drawing"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useProjectStore } from "@/zustand/projectStore"
import { SharedWorkareaPayload } from "@/lib/share"
import { centroidOfPath } from "@/lib/geometry-utils"

export default function MagicLinkViewerClient() {
  const params = useParams()
  const projectId = params?.id ?? ""
  const getProjectById = useProjectStore((state) => state.getProjectById)
  const demoProject = useProjectStore((state) => state.demoProject)
  const [fallbackPayload, setFallbackPayload] = useState<SharedWorkareaPayload | null>(null)

  useEffect(() => {
    setFallbackPayload(null)
    if (!projectId || typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem("shared-workarea")
      if (!raw) return
      const parsed = JSON.parse(raw) as SharedWorkareaPayload
      if (parsed.projectId !== projectId) return
      if (!parsed.polygon || parsed.polygon.length < 3) return
      setFallbackPayload(parsed)
    } catch (error) {
      console.warn("Failed to load shared workarea", error)
    }
  }, [projectId])

  const project = useMemo(() => {
    if (!projectId) return demoProject
    if (fallbackPayload && fallbackPayload.projectId === projectId) {
      return {
        ...demoProject,
        id: fallbackPayload.projectId,
        polygon: fallbackPayload.polygon,
        records: fallbackPayload.records,
      }
    }
    return getProjectById(projectId) ?? demoProject
  }, [projectId, fallbackPayload, demoProject, getProjectById])

  const { bubbles, shapes } = useMemo(
    () => ({
      bubbles: project.bubbles,
      shapes: project.shapes,
    }),
    [project],
  )

  const filesCount = project.records.reduce((total, record) => total + (record.files || 0), 0)

  return (
    <main className="min-h-screen bg-slate-50 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Public map viewer</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                {project.region} • {(project.areaSqMeters / 1000).toFixed(0)} ha • ID: {project.id}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/">Back to UTILITX</Link>
            </Button>
          </div>
        </header>

        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="aspect-[4/3] w-full">
            <MapWithDrawing
              mode="view"
              polygon={project.polygon}
              bubbles={bubbles}
              shapes={shapes}
              readOnly
            />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Records on file</p>
            <p className="text-3xl font-semibold">{project.summary.records}</p>
            <p className="text-sm text-muted-foreground">{filesCount} total files</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.recordTypes.map((type) => (
                <Badge key={type} variant="outline">
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Record snapshots</p>
                <p className="text-xs text-muted-foreground">Read-only view of recent contributions</p>
              </div>
              <Badge variant="secondary">Read-only</Badge>
            </div>
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 mt-3">
              {project.records.length ? (
                project.records.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between border-b border-border/70 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-semibold">{record.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.organization} • {record.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded by {record.uploadedBy} •{" "}
                        {record.uploadedAt ? new Date(record.uploadedAt).toLocaleDateString() : "Date unknown"}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-slate-900">{record.files} files</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No records available yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

