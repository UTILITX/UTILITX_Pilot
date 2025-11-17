"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import type { RequestRecord, LatLng } from "@/lib/record-types"
import type { GeorefMode } from "@/lib/types"
import { loadStagedRecords, saveStagedRecords } from "@/lib/storage"
import { fetchAllRecordsFromEsri, fetchAllWorkAreasFromEsri, type IndexedRecord } from "@/lib/fetchAllEsriData"
import { WorkAreaAnalysisDrawer } from "@/components/work-areas/WorkAreaAnalysisDrawer"
import { computeWorkAreaCompleteness } from "@/lib/completeness"
import { queryRecordsInPolygon } from "@/lib/esri-records"

// Dynamically import map components to avoid SSR issues with Leaflet
const MapWithDrawing = dynamic(() => import("@/components/map-with-drawing"), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100">Loading map...</div>
})

const BottomDrawer = dynamic(() => import("@/components/BottomDrawer"), {
  ssr: false
})

const LeftWorkspacePanel = dynamic(() => import("@/components/map/LeftWorkspacePanel"), {
  ssr: false
})

const FloatingTools = dynamic(() => import("@/components/map/FloatingTools"), {
  ssr: false
})

type PreloadedRequest = {
  createdAt: string
  polygon: LatLng[]
  areaSqMeters?: number
  title?: string
  deadline?: string
  records?: RequestRecord[]
}

type RecordDrawingConfig = {
  georefMode: GeorefMode
  georefColor?: string
  pendingRecordMetadata?: any
  onGeorefComplete?: (
    result: { type: "Point"; point: LatLng } | { type: "LineString" | "Polygon"; path: LatLng[] },
    metadata?: { utilityType?: string; fileUrl?: string; filePath?: string; notes?: string }
  ) => void
}

export default function MapPage() {
  // Shared records state for the unified workflow (used by UploadTab)
  const [records, setRecords] = useState<RequestRecord[]>([])
  const [preloadedPolygon, setPreloadedPolygon] = useState<LatLng[] | null>(null)
  const [preloadedAreaSqMeters, setPreloadedAreaSqMeters] = useState<number | null>(null)

  const [zoomToFeature, setZoomToFeature] = useState<null | { feature: any; version: number }>(null)
  const [zoomSequence, setZoomSequence] = useState(0)
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

  // Work Area Analysis Drawer state
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [selectedWorkAreaForAnalysis, setSelectedWorkAreaForAnalysis] = useState<{
    id?: string
    name?: string
    polygon?: LatLng[] | null
    data?: any
  } | null>(null)
  const [completenessLoading, setCompletenessLoading] = useState(false)

  // Bottom Drawer (Project Index) state
  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false)

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

  const [workAreaDrawCommand, setWorkAreaDrawCommand] = useState(0)
  const [workAreaSelectionEnabled, setWorkAreaSelectionEnabled] = useState(false)
  const [recordDrawingConfig, setRecordDrawingConfig] = useState<RecordDrawingConfig | null>(null)
  const [recordDrawCommand, setRecordDrawCommand] = useState(0)

  const startWorkAreaDraw = () => {
    setWorkAreaSelectionEnabled(false)
    setWorkAreaDrawCommand((c) => c + 1)
  }

  const startWorkAreaSelection = () => {
    setWorkAreaSelectionEnabled(true)
  }

  const clearWorkArea = () => {
    setPreloadedPolygon(null)
    setPreloadedAreaSqMeters(null)
    setWorkAreaSelectionEnabled(false)
  }

const startRecordDrawing = (config: RecordDrawingConfig) => {
  setRecordDrawingConfig(config)
  setWorkAreaSelectionEnabled(false)
  setRecordDrawCommand((c) => c + 1)
}

const handleRecordGeorefComplete = (
  result: { type: "Point"; point: LatLng } | { type: "LineString" | "Polygon"; path: LatLng[] },
  metadata?: { utilityType?: string; fileUrl?: string; filePath?: string; notes?: string }
) => {
  recordDrawingConfig?.onGeorefComplete?.(result, metadata)
  setRecordDrawingConfig(null)
}

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
            setRecords((prev: RequestRecord[]) => [...parsed.records!, ...prev])
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
    <>
      <div className="relative h-full w-full overflow-hidden bg-white">
        <div className="absolute inset-0 z-0">
          <MapWithDrawing
            mode="draw"
            polygon={preloadedPolygon}
            onPolygonChange={(path, area) => {
              setPreloadedPolygon(path)
              setPreloadedAreaSqMeters(area ?? null)
              setWorkAreaSelectionEnabled(false)
            }}
            shouldStartWorkAreaDraw={workAreaDrawCommand}
            enableWorkAreaSelection={workAreaSelectionEnabled}
            onWorkAreaSelected={(path, area) => {
              setPreloadedPolygon(path)
              setPreloadedAreaSqMeters(area ?? null)
              setWorkAreaSelectionEnabled(false)
            }}
            georefMode={recordDrawingConfig?.georefMode ?? "none"}
            georefColor={recordDrawingConfig?.georefColor}
            onGeorefComplete={handleRecordGeorefComplete}
            pickPointActive={recordDrawingConfig?.georefMode === "point"}
            shouldStartRecordDraw={recordDrawCommand}
            pendingRecordMetadata={recordDrawingConfig?.pendingRecordMetadata}
            zoomToFeature={zoomToFeature}
            onWorkAreaClick={(workArea) => {
              setSelectedWorkAreaForAnalysis({
                id: workArea.id,
                name: workArea.name,
                polygon: workArea.geometry ? convertGeometryToPolygon(workArea.geometry) : null,
                data: workArea,
              })
            }}
            onOpenWorkAreaAnalysis={async (workArea) => {
              const polygon = workArea.geometry ? convertGeometryToPolygon(workArea.geometry) : null

              setSelectedWorkAreaForAnalysis({
                id: workArea.id,
                name: workArea.name,
                polygon,
                data: {
                  ...workArea,
                  completenessLoading: true,
                },
              })
              setCompletenessLoading(true)
              setAnalysisOpen(true)

              try {
                if (!polygon || polygon.length < 3) {
                  console.warn("No valid polygon on work area, cannot compute completeness.")
                  setCompletenessLoading(false)
                  return
                }

                const recordFeatures = await queryRecordsInPolygon(polygon)
                const completeness = computeWorkAreaCompleteness({ records: recordFeatures })

                setSelectedWorkAreaForAnalysis({
                  id: workArea.id,
                  name: workArea.name,
                  polygon,
                  data: {
                    ...workArea,
                    records: recordFeatures,
                    ...completeness,
                  },
                })
              } catch (error) {
                console.error("❌ Error computing work area completeness:", error)
              } finally {
                setCompletenessLoading(false)
              }
            }}
          >
            <FloatingTools />
          </MapWithDrawing>
        </div>

        <div className="relative z-10 flex h-full w-full items-start justify-start pointer-events-none">
          <div className="pointer-events-auto">
            <LeftWorkspacePanel
              mode="upload"
              records={records}
              setRecords={setRecords}
              preloadedPolygon={preloadedPolygon}
              preloadedAreaSqMeters={preloadedAreaSqMeters}
              zoomToFeature={zoomToFeature}
              onWorkAreaClick={(workArea) => {
                setSelectedWorkAreaForAnalysis({
                  id: workArea.id,
                  name: workArea.name,
                  polygon: workArea.geometry ? convertGeometryToPolygon(workArea.geometry) : null,
                  data: workArea,
                })
              }}
              onOpenWorkAreaAnalysis={(workArea) => {
                setSelectedWorkAreaForAnalysis({
                  id: workArea.id,
                  name: workArea.name,
                  polygon: workArea.geometry ? convertGeometryToPolygon(workArea.geometry) : null,
                  data: {
                    ...workArea,
                    completenessLoading: true,
                  },
                })
                setAnalysisOpen(true)
              }}
              onStartWorkAreaDraw={startWorkAreaDraw}
              onStartWorkAreaSelection={startWorkAreaSelection}
              onClearWorkArea={clearWorkArea}
              onStartRecordDrawing={startRecordDrawing}
              onOpenIndex={() => setBottomDrawerOpen(true)}
            />
          </div>
        </div>
      </div>

      <WorkAreaAnalysisDrawer
        open={analysisOpen}
        onOpenChange={setAnalysisOpen}
        workAreaId={selectedWorkAreaForAnalysis?.id}
        workAreaName={selectedWorkAreaForAnalysis?.name}
        polygon={selectedWorkAreaForAnalysis?.polygon || preloadedPolygon}
        records={records}
        data={selectedWorkAreaForAnalysis?.data}
        loading={completenessLoading}
      />

      <BottomDrawer
        isOpen={bottomDrawerOpen}
        onClose={() => setBottomDrawerOpen(false)}
        records={esriRecords}
        workAreas={workAreas}
        selectedWorkArea={selectedWorkArea}
        onSelectWorkArea={(id) =>
          setSelectedWorkArea(workAreas.find((w: { id: string }) => w.id === id) || null)
        }
        onZoomToRecord={(rec) => {
          setZoomSequence((prev: number) => {
            const newVersion = prev + 1
            setZoomToFeature({ feature: rec, version: newVersion })
            setTimeout(() => setZoomToFeature(null), 150)
            return newVersion
          })
        }}
        onZoomToWorkArea={(wa) => {
          setZoomSequence((prev: number) => {
            const newVersion = prev + 1
            setZoomToFeature({ feature: wa, version: newVersion })
            setTimeout(() => setZoomToFeature(null), 150)
            return newVersion
          })
        }}
      />
    </>
  )
}

// Helper function to convert Esri geometry to LatLng polygon
function convertGeometryToPolygon(geometry: any): LatLng[] | null {
  if (!geometry) return null

  try {
    // Handle GeoJSON Polygon
    if (geometry.type === "Polygon" && geometry.coordinates && geometry.coordinates[0]) {
      return geometry.coordinates[0].map((coord: number[]) => ({
        lat: coord[1],
        lng: coord[0],
      }))
    }

    // Handle ArcGIS rings format
    if (geometry.rings && geometry.rings[0]) {
      return geometry.rings[0].map((coord: number[]) => ({
        lat: coord[1],
        lng: coord[0],
      }))
    }
  } catch (error) {
    console.warn("Error converting geometry to polygon:", error)
  }

  return null
}

