"use client"

export const dynamic = "force-dynamic"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export default function PlaygroundPage() {
  const [file, setFile] = useState<File | null>(null)
  const [enableVision, setEnableVision] = useState(true)
  const [loading, setLoading] = useState(false)

  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<any>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [durationMs, setDurationMs] = useState<number | null>(null)

  async function callProcessAPI() {
    if (!file) return

    setLoading(true)
    setResult(null)
    setError(null)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("options", JSON.stringify({ enable_vision: enableVision }))

    const start = performance.now()

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_UTILITX_API_BASE_URL}/process`, {
        method: "POST",
        body: formData,
      })

      const elapsed = Math.round(performance.now() - start)
      setDurationMs(elapsed)
      setStatus(res.status)

      const text = await res.text()

      let parsed: any
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = text
      }

      if (!res.ok) {
        setError(parsed)
      } else {
        setResult(parsed)
      }
    } catch (err) {
      setError({
        message: "Network or fetch error",
        detail: String(err),
      })
    } finally {
      setLoading(false)
    }
  }

  const payload = result ?? error
  const requestId = useMemo(() => {
    if (!payload || typeof payload !== "object" || payload === null) return null

    if ("request_id" in payload) {
      return (payload as any).request_id ?? null
    }

    const system = (payload as any).system
    if (system && typeof system === "object") {
      return system.request_id ?? null
    }

    return null
  }, [payload])

  const shouldShowStatus = status !== null || durationMs !== null || result !== null || error !== null

  return (
    <main className="h-screen min-h-[calc(100vh-4rem)] w-full overflow-y-auto">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col gap-4 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--utilitx-gray-900)]">Playground</h1>
          <p className="text-sm text-[var(--utilitx-gray-600)]">
            Internal API playground for calling <code className="font-mono">/process</code>.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request</CardTitle>
            <CardDescription>Upload any file, toggle vision, and run the backend API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playground-file">File Upload</Label>
              <Input
                id="playground-file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="text-xs text-[var(--utilitx-gray-600)]">
                  Selected: <span className="font-mono">{file.name}</span> ({file.size} bytes)
                </div>
              ) : (
                <div className="text-xs text-[var(--utilitx-gray-600)]">No file selected.</div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="enable-vision">Enable Vision</Label>
                <div className="text-xs text-[var(--utilitx-gray-600)]">Sends options.enable_vision</div>
              </div>
              <Switch
                id="enable-vision"
                checked={enableVision}
                onCheckedChange={(v) => setEnableVision(Boolean(v))}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={callProcessAPI} disabled={loading}>
                {loading ? "Running…" : "Run API"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {shouldShowStatus && (
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>Raw request status and timing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div>
                  <span className="text-[var(--utilitx-gray-600)]">HTTP Status: </span>
                  <span className="font-mono">{status ?? "—"}</span>
                </div>
                <div>
                  <span className="text-[var(--utilitx-gray-600)]">Duration (ms): </span>
                  <span className="font-mono">{durationMs ?? "—"}</span>
                </div>
                <div>
                  <span className="text-[var(--utilitx-gray-600)]">request_id: </span>
                  <span className="font-mono">{requestId ?? "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {(result !== null || error !== null) && (
          <Card>
            <CardHeader>
              <CardTitle>Response</CardTitle>
              <CardDescription>Verbatim payload (no interpretation).</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="w-full max-h-[60vh] overflow-auto rounded-md border border-[var(--utilitx-gray-200)] bg-white p-4 text-xs leading-relaxed">
                {typeof payload === "string" ? payload : JSON.stringify(payload, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

