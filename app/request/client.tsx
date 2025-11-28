"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import MapWithDrawing from "@/components/map-with-drawing"
import ShareDrawer from "@/components/workflows/share-drawer"
import type { LatLng } from "@/lib/record-types"

export default function RequestPageClient() {
  const router = useRouter()
  const { toast } = useToast()
  const [polygon, setPolygon] = useState<LatLng[] | null>(null)
  const [areaSqMeters, setAreaSqMeters] = useState<number | null>(null)
  const [title, setTitle] = useState("")
  const [deadline, setDeadline] = useState<string>("")
  const [passcode, setPasscode] = useState<string>("")

  const shareDemoId = "magic-link-demo"
  const copyDemoViewLink = () => {
    if (typeof window === "undefined") {
      return shareDemoId
    }
    const origin = window.location.origin
    const url = `${origin}/view/${shareDemoId}`
    navigator.clipboard.writeText(url).catch(() => {})
    toast({ title: "Demo link copied", description: "View the shared work area in a new tab." })
    router.push(`/view/${shareDemoId}`)
    return shareDemoId
  }

  function generateSecureLink() {
    if (!polygon || polygon.length < 3) {
      toast({ title: "Draw a polygon", description: "Please outline the area of interest.", variant: "destructive" })
      return
    }
    if (!passcode.trim()) {
      toast({ title: "Add a passcode", description: "Set a passcode to protect the link.", variant: "destructive" })
      return
    }
    copyDemoViewLink()
  }

  function generateLocalDemoLink() {
    if (!polygon || polygon.length < 3) {
      toast({ title: "Draw a polygon", description: "Please outline the area of interest.", variant: "destructive" })
      return
    }
    copyDemoViewLink()
  }

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6 space-y-4 relative z-10 bg-white">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">UTILITX — Request Utility Records</h1>
          <p className="text-muted-foreground">
            Define the area, set an optional deadline, then generate a passcode-protected link for your team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded bg-sky-50 text-sky-700">Request</span>
        </div>
      </header>

      <Card className="relative z-10 bg-white">
        <CardHeader>
          <CardTitle>Area of Interest</CardTitle>
          <CardDescription>Draw a polygon for the request. Recipients will see this boundary.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-[4/3] w-full rounded-md border">
            <MapWithDrawing
              mode="draw"
              polygon={polygon}
              onPolygonChange={(path, area) => {
                setPolygon(path)
                setAreaSqMeters(area ?? null)
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="req-title">Work ID / Project Name (optional)</Label>
              <Input
                id="req-title"
                placeholder="e.g., Main St. Corridor — Phase 2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="req-deadline">Deadline (optional)</Label>
              <Input id="req-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="req-pass">Passcode (required for secure link)</Label>
              <Input
                id="req-pass"
                type="password"
                placeholder="Set a passcode to protect this link"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between">
            <div className="text-sm text-muted-foreground">
              {polygon && polygon.length >= 3
                ? `Polygon with ${polygon.length} vertices${typeof areaSqMeters === "number" ? ` • Area: ${(areaSqMeters / 1_000_000).toFixed(3)} km²` : ""}`
                : "No polygon yet."}
            </div>
            <div className="flex gap-2">
              <Button onClick={generateSecureLink}>Generate secure link</Button>
              <Button variant="outline" onClick={generateLocalDemoLink} title="Stores in this browser only">
                Generate local demo link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ShareDrawer />
    </main>
  )
}

