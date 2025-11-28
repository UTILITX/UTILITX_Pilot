"use client"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import MapWithDrawing, { type MapBubble, type GeorefShape } from "@/components/map-with-drawing"
import { RecordsTable } from "@/components/records-table"
import type { RequestRecord, LatLng } from "@/lib/record-types"
import { getUtilityColorsFromPath } from "@/lib/utility-colors"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { encryptPayload, sealedToHash } from "@/lib/crypto"

type Props = {
  // In the workspace, we may get either legacy RequestRecord objects (with files)
  // or IndexedRecord objects from Esri (without files). We treat them generically here.
  records: any[]
  currentWorkArea?: {
    id?: string
    name?: string
  } | null
}

export default function ShareTab({ records, currentWorkArea }: Props) {
  const { toast } = useToast()
  const [polygon, setPolygon] = useState<LatLng[] | null>(null)
  const [areaSqMeters, setAreaSqMeters] = useState<number | null>(null)

  const [genOpen, setGenOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [deadline, setDeadline] = useState<string>("")
  const [passcode, setPasscode] = useState("")

  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")

  // Prefill Work ID / Project Name from the active work area, but don't
  // overwrite anything the user has already typed.
  useEffect(() => {
    if (!currentWorkArea) return
    if (title.trim()) return
    const defaultTitle = currentWorkArea.name || currentWorkArea.id
    if (defaultTitle) {
      setTitle(defaultTitle)
    }
  }, [currentWorkArea, title])

  // Some environments pass full RequestRecord objects with files;
  // others pass lightweight IndexedRecord objects from Esri.
  // Detect whether we actually have file-backed records available.
  const hasFileBackedRecords = useMemo(
    () => records.some((r) => Array.isArray((r as RequestRecord).files) && (r as RequestRecord).files.length > 0),
    [records],
  )

  const { bubbles, shapes } = useMemo(() => {
    // If we don't have file-backed records, skip generating bubbles/shapes.
    // The map will still support drawing a polygon, which is the primary need.
    if (!hasFileBackedRecords) {
      return { bubbles: [] as MapBubble[], shapes: [] as GeorefShape[] }
    }

    const b: MapBubble[] = []
    const s: GeorefShape[] = []

    const getLabelFromPath = (path?: string) => {
      const parts = (path ?? "").split("/").map((p) => p.trim())
      return parts[2] || path || "Record"
    }

    for (const rec of records as RequestRecord[]) {
      const colors = getUtilityColorsFromPath(rec.recordTypePath)
      const recordLabel = getLabelFromPath(rec.recordTypePath)

      for (const f of Array.isArray(rec.files) ? rec.files : []) {
        if (f.status !== "Georeferenced") continue

        const baseDesc = `${rec.recordTypePath} • P${rec.priority}${
          rec.orgName
            ? `
Org: ${rec.orgName}`
            : ""
        }
Uploaded ${formatDistanceToNow(new Date(rec.uploadedAt), { addSuffix: true })}`

        if (f.geomType === "Point" || (!f.geomType && typeof f.lat === "number" && typeof f.lng === "number")) {
          const pos = f.geomType === "Point" && f.path?.[0] ? f.path[0] : { lat: f.lat as number, lng: f.lng as number }
          b.push({
            id: f.id,
            position: pos,
            title: f.name,
            description: baseDesc,
            recordLabel,
            size: 28,
          })
        } else if (f.geomType === "LineString" && f.path && f.path.length >= 2) {
          s.push({
            id: f.id,
            type: "LineString",
            path: f.path,
            title: f.name,
            description: `${rec.recordTypePath} • P${rec.priority}`,
            strokeColor: colors.stroke,
          })
          const centroid = centroidOfPath(f.path)
          b.push({
            id: `${f.id}-bubble`,
            position: centroid,
            title: f.name,
            description: baseDesc,
            recordLabel,
            size: 28,
          })
        } else if (f.geomType === "Polygon" && f.path && f.path.length >= 3) {
          s.push({
            id: f.id,
            type: "Polygon",
            path: f.path,
            title: f.name,
            description: `${rec.recordTypePath} • P${rec.priority}`,
            strokeColor: colors.stroke,
            fillColor: colors.fill,
          })
          const centroid = centroidOfPath(f.path)
          b.push({
            id: `${f.id}-bubble`,
            position: centroid,
            title: f.name,
            description: baseDesc,
            recordLabel,
            size: 28,
          })
        }
      }
    }
    return { bubbles: b, shapes: s }
  }, [records, hasFileBackedRecords])

  const totalFiles = useMemo(
    () =>
      records.reduce(
        (acc, r) => acc + (Array.isArray((r as RequestRecord).files) ? (r as RequestRecord).files.length : 0),
        0,
      ),
    [records],
  )

  async function generateSecureLink() {
    if (!polygon || polygon.length < 3) {
      toast({ title: "Draw a polygon", description: "Please outline the area of interest.", variant: "destructive" })
      return
    }
    const cleanPasscode = passcode.trim()
    if (cleanPasscode.length < 6) {
      toast({
        title: "Add a longer passcode",
        description: "Use at least 6 characters to protect the link (letters, numbers, or symbols).",
        variant: "destructive",
      })
      return
    }
    const payload = {
      version: 1,
      createdAt: new Date().toISOString(),
      polygon,
      areaSqMeters: areaSqMeters ?? undefined,
      title: title.trim() || undefined,
      deadline: deadline || undefined,
      workArea: currentWorkArea
        ? {
            id: currentWorkArea.id,
            name: currentWorkArea.name,
          }
        : undefined,
      records,
    }
    try {
      const sealed = await encryptPayload(cleanPasscode, payload)
      const url = `${window.location.origin}/share#${sealedToHash(sealed)}`
      await navigator.clipboard.writeText(url).catch(() => {})
      setLinkUrl(url)
      setGenOpen(false)
      setLinkOpen(true)
      toast({ title: "Secure link generated", description: "Link copied to clipboard. Share it with the receiver." })
    } catch {
      toast({ title: "Failed to create link", description: "Please try again.", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Space-first Records & Sharing</h2>
          <p className="text-muted-foreground">
            Define work areas, see what's there, and generate secure links for your team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded bg-sky-50 text-sky-700">Share</span>
        </div>
      </header>

      <div className="space-y-4">
        <Card className="relative z-10 bg-white">
          <CardHeader>
            <CardTitle>Area of Interest</CardTitle>
            <CardDescription>
              Neutral bubbles (same as list) mark each record; lines/polygons use utility colors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="aspect-[4/3] w-full rounded-md border">
              <MapWithDrawing
                mapId="share-map"
                mode="draw"
                bubbles={bubbles}
                shapes={shapes}
                polygon={polygon}
                onPolygonChange={(path, area) => {
                  setPolygon(path)
                  setAreaSqMeters(area ?? null)
                }}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-sm">
              <div className="text-muted-foreground">
                {polygon && polygon.length >= 3 ? (
                  <div className="flex flex-wrap gap-2">
                    <span className="font-medium text-foreground">Polygon saved:</span>
                    <span>{polygon.length} vertices</span>
                    {typeof areaSqMeters === "number" ? (
                      <span>• Area: {(areaSqMeters / 1_000_000).toFixed(3)} km²</span>
                    ) : null}
                  </div>
                ) : (
                  "No polygon yet."
                )}
              </div>
              <div className="flex gap-2">
                {polygon && polygon.length >= 3 ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPolygon(null)
                      setAreaSqMeters(null)
                    }}
                  >
                    Remove polygon
                  </Button>
                ) : null}
                <Button variant="default" onClick={() => setGenOpen(true)} disabled={!polygon || polygon.length < 3}>
                  Generate secure sharing link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative z-10 bg-white">
          <CardHeader>
            <CardTitle>What’s There</CardTitle>
            <CardDescription>Files you’ve staged so far for this space.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {hasFileBackedRecords ? (
              <RecordsTable records={records as RequestRecord[]} showOrg />
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                {records.length === 0 ? (
                  <div>No files yet.</div>
                ) : (
                  <>
                    <div className="font-medium text-[var(--utilitx-gray-900)]">
                      {records.length} record{records.length === 1 ? "" : "s"} in this project.
                    </div>
                    <ul className="space-y-1 text-xs">
                      {records.slice(0, 6).map((r, idx) => (
                        <li key={(r as any).id ?? idx}>
                          <span className="font-semibold">
                            {(r as any).utilityType || (r as any).utility || "Utility"}
                          </span>
                          {": "}
                          {(r as any).recordType || (r as any).type || "Record"}
                          {(r as any).organization ? ` • ${(r as any).organization}` : ""}
                        </li>
                      ))}
                      {records.length > 6 && <li>…and more.</li>}
                    </ul>
                  </>
                )}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {records.length} record group(s), {totalFiles} file(s)
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate secure link</DialogTitle>
            <DialogDescription>
              Set details and a passcode. We encrypt the request in the URL for a secure share.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="share-title">Work ID / Project Name (optional)</Label>
              <Input
                id="share-title"
                placeholder="e.g., Main St. Corridor — Phase 2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="share-deadline">Deadline (optional)</Label>
              <Input id="share-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="share-passcode">Passcode (required)</Label>
              <Input
                id="share-passcode"
                type="password"
                placeholder="Set a passcode to protect this link"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>
              Cancel
            </Button>
            <Button onClick={generateSecureLink}>Create link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Secure link ready</DialogTitle>
            <DialogDescription>
              Share this link. The receiver will open the platform with your polygon preloaded.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="secure-link">Secure link</Label>
            <Input id="secure-link" value={linkUrl} readOnly onFocus={(e) => e.currentTarget.select()} />
            <div className="text-xs text-muted-foreground">Tip: We already copied this link to your clipboard.</div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(linkUrl).catch(() => {})
              }}
            >
              Copy link
            </Button>
            <Button
              onClick={() => {
                window.open(linkUrl, "_blank", "noopener,noreferrer")
              }}
            >
              Open link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function centroidOfPath(path: LatLng[]): LatLng {
  if (!path.length) return { lat: 0, lng: 0 }
  const sum = path.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 })
  return { lat: sum.lat / path.length, lng: sum.lng / path.length }
}
