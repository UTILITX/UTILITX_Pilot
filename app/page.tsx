"use client"

import { useEffect, useState } from "react"
import UploadTab from "@/components/workflows/upload-tab"
import type { RequestRecord, LatLng } from "@/lib/record-types"
import { loadStagedRecords, saveStagedRecords } from "@/lib/storage"
import BottomDrawer from "@/components/BottomDrawer"
import { Button } from "@/components/ui/button"
import { List } from "lucide-react"
import { fetchAllRecordsFromEsri, fetchAllWorkAreasFromEsri, type IndexedRecord } from "@/lib/fetchAllEsriData"

type PreloadedRequest = {
  createdAt: string
  polygon: LatLng[]
  areaSqMeters?: number
  title?: string
  deadline?: string
  records?: RequestRecord[]
}

export default function Page() {
  // Shared records state for the unified workflow (used by UploadTab)
  const [records, setRecords] = useState<RequestRecord[]>([])
  const [preloadedPolygon, setPreloadedPolygon] = useState<LatLng[] | null>(null)
  const [preloadedAreaSqMeters, setPreloadedAreaSqMeters] = useState<number | null>(null)

  // Bottom drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [zoomToFeature, setZoomToFeature] = useState<any | null>(null)
  const [selectedWorkArea, setSelectedWorkArea] = useState<{
    id: string
    name: string
    region?: string
    owner?: string
    createdBy?: string
    date?: string
    notes?: string
    records?: any[]
  } | null>(null)

  // Esri data for drawer (separate from workflow records)
  const [esriRecords, setEsriRecords] = useState<IndexedRecord[]>([])
  const [workAreas, setWorkAreas] = useState<
    Array<{
      id: string
      name: string
      region?: string
      owner?: string
      createdBy?: string
      date?: string
      notes?: string
      records?: any[]
    }>
  >([])

  // Load Esri data on mount (for Project Index drawer)
  useEffect(() => {
    // Don't run during SSR
    if (typeof window === "undefined") return;

    async function loadData() {
      try {
        const [r, wa] = await Promise.all([
          fetchAllRecordsFromEsri(),
          fetchAllWorkAreasFromEsri(),
        ]);

        console.log("📥 Loaded records from Esri:", r.length);
        console.log("📥 Loaded work areas from Esri:", wa.length);
        if (r.length > 0) {
          console.log("🔎 Sample Esri record:", r[0]);
        }

        setEsriRecords(r);
        setWorkAreas(wa);
      } catch (err) {
        console.error("❌ Failed to load Esri data:", err);
      }
    }

    loadData();
  }, []);

  // Load staged records for workflow (separate from Esri data)
  useEffect(() => {
    const initial = loadStagedRecords()
    if (initial.length) setRecords(initial)

    const preloadedData = sessionStorage.getItem("preloadedRequest")
    if (preloadedData) {
      try {
        const parsed: PreloadedRequest = JSON.parse(preloadedData)
        if (parsed.polygon && parsed.polygon.length >= 3) {
          setPreloadedPolygon(parsed.polygon)
          setPreloadedAreaSqMeters(parsed.areaSqMeters || null)

          // If there are existing records in the request, merge them
          if (parsed.records && parsed.records.length > 0) {
            setRecords((prev) => [...parsed.records!, ...prev])
          }
        }
        // Clear the session storage after loading
        sessionStorage.removeItem("preloadedRequest")
      } catch (e) {
        console.warn("Failed to parse preloaded request data:", e)
      }
    }
  }, [])

  useEffect(() => {
    saveStagedRecords(records)
  }, [records])

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6 relative z-10 bg-white">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">UTILITX — The trusted basemap</h1>
        <p className="text-muted-foreground">
          🗺️ Define your work area on the map → 📤 Upload utility records → 📍 Mark their locations → 🔗 Share with your
          team. Everything in one unified workflow.
        </p>
      </header>

      <section aria-labelledby="unified-workflow">
        <h2 id="unified-workflow" className="sr-only">
          Unified utility records workflow
        </h2>
        <UploadTab
          records={records}
          setRecords={setRecords}
          preloadedPolygon={preloadedPolygon}
          preloadedAreaSqMeters={preloadedAreaSqMeters}
          zoomToFeature={zoomToFeature}
        />
      </section>

      {/* Floating action button to open drawer */}
      <Button
        onClick={() => setDrawerOpen(true)}
        className="fixed top-20 right-4 z-50 shadow-lg hover:shadow-xl transition-shadow"
        variant="default"
        size="default"
      >
        <List className="mr-2 h-4 w-4" />
        Project Index
      </Button>

      <BottomDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        records={esriRecords}
        workAreas={workAreas}
        selectedWorkArea={selectedWorkArea}
        onSelectWorkArea={(id) =>
          setSelectedWorkArea(workAreas.find((w) => w.id === id) || null)
        }
        onZoomToRecord={(rec) => {
          // Set the feature to zoom to (with geometry)
          setZoomToFeature(rec);
          // Clear after a short delay to allow re-zooming to the same feature
          setTimeout(() => setZoomToFeature(null), 100);
        }}
        onZoomToWorkArea={(wa) => {
          // Set the work area feature to zoom to (with geometry)
          setZoomToFeature(wa);
          // Clear after a short delay to allow re-zooming to the same feature
          setTimeout(() => setZoomToFeature(null), 100);
        }}
      />
    </main>
  )
}
