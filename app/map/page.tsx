"use client"

import { useEffect, useState } from "react"
import type { RequestRecord, LatLng } from "@/lib/record-types"
import { loadStagedRecords, saveStagedRecords } from "@/lib/storage"
import { fetchAllRecordsFromEsri, fetchAllWorkAreasFromEsri, type IndexedRecord } from "@/lib/fetchAllEsriData"
import { WorkAreaAnalysisDrawer } from "@/components/work-areas/WorkAreaAnalysisDrawer"
import { computeWorkAreaCompleteness } from "@/lib/completeness"
import { queryRecordsInPolygon } from "@/lib/esri-records"
import MapWithDrawing from "@/components/map-with-drawing"
import ModeSelector from "@/components/map/ModeSelector"
import LeftWorkspacePanel from "@/components/map/LeftWorkspacePanel"
import BottomDrawer from "@/components/BottomDrawer"

type PreloadedRequest = {
  createdAt: string
  polygon: LatLng[]
  areaSqMeters?: number
  title?: string
  deadline?: string
  records?: RequestRecord[]
}

export default function MapPage() {
  // Panel mode state
  const [panelMode, setPanelMode] = useState<"view" | "upload">("view")

  // Shared records state for the unified workflow (used by UploadTab)
  const [records, setRecords] = useState<RequestRecord[]>([])
  const [preloadedPolygon, setPreloadedPolygon] = useState<LatLng[] | null>(null)
  const [preloadedAreaSqMeters, setPreloadedAreaSqMeters] = useState<number | null>(null)

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
      {/* Full-screen map behind all UI */}
      <div className="fixed inset-x-0 top-16 bottom-0 z-0">
        <MapWithDrawing
          mode="draw"
          polygon={preloadedPolygon}
          onPolygonChange={(path, area) => {
            setPreloadedPolygon(path)
            setPreloadedAreaSqMeters(area ?? null)
          }}
          zoomToFeature={zoomToFeature}
          onWorkAreaClick={(workArea) => {
            // Store work area data (for potential future use)
            setSelectedWorkAreaForAnalysis({
              id: workArea.id,
              name: workArea.name,
              polygon: workArea.geometry ? convertGeometryToPolygon(workArea.geometry) : null,
              data: workArea,
            })
          }}
          onOpenWorkAreaAnalysis={async (workArea) => {
            // Open the analysis drawer directly from Leaflet popup
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

              // Query records within the polygon
              const recordFeatures = await queryRecordsInPolygon(polygon)
              
              // Compute completeness
              const completeness = computeWorkAreaCompleteness({ records: recordFeatures })

              // Update with computed data
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

              console.log("✅ Computed completeness for work area", {
                workArea: workArea.name,
                recordCount: recordFeatures.length,
                completeness,
              })
            } catch (error) {
              console.error("❌ Error computing work area completeness:", error)
            } finally {
              setCompletenessLoading(false)
            }
          }}
        />
      </div>

      {/* Mode Selector - vertical strip between sidebar and panel */}
      <ModeSelector mode={panelMode} onModeChange={setPanelMode} />

      {/* Left Workspace Panel - drawer overlay */}
      <LeftWorkspacePanel
        mode={panelMode}
        esriRecords={esriRecords}
        workAreas={workAreas}
        selectedWorkArea={selectedWorkArea}
        onSelectWorkArea={(id) =>
          setSelectedWorkArea(workAreas.find((w: { id: string }) => w.id === id) || null)
        }
        onZoomToRecord={(rec) => {
          // Set the feature to zoom to (with geometry)
          setZoomToFeature(rec)
          // Clear after a short delay to allow re-zooming to the same feature
          setTimeout(() => setZoomToFeature(null), 100)
        }}
        onZoomToWorkArea={(wa) => {
          // Set the work area feature to zoom to (with geometry)
          setZoomToFeature(wa)
          // Clear after a short delay to allow re-zooming to the same feature
          setTimeout(() => setZoomToFeature(null), 100)
        }}
        records={records}
        setRecords={setRecords}
        preloadedPolygon={preloadedPolygon}
        preloadedAreaSqMeters={preloadedAreaSqMeters}
        zoomToFeature={zoomToFeature}
        onOpenIndex={() => setBottomDrawerOpen(true)}
        onWorkAreaClick={(workArea) => {
          // Store work area data (for potential future use)
          setSelectedWorkAreaForAnalysis({
            id: workArea.id,
            name: workArea.name,
            polygon: workArea.geometry ? convertGeometryToPolygon(workArea.geometry) : null,
            data: workArea,
          })
        }}
        onOpenWorkAreaAnalysis={async (workArea) => {
          // Open the analysis drawer directly from Leaflet popup
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

            // Query records within the polygon
            const recordFeatures = await queryRecordsInPolygon(polygon)
            
            // Compute completeness
            const completeness = computeWorkAreaCompleteness({ records: recordFeatures })

            // Update with computed data
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

            console.log("✅ Computed completeness for work area", {
              workArea: workArea.name,
              recordCount: recordFeatures.length,
              completeness,
            })
          } catch (error) {
            console.error("❌ Error computing work area completeness:", error)
          } finally {
            setCompletenessLoading(false)
          }
        }}
      />

      {/* Work Area Analysis Drawer */}
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

      {/* Bottom Drawer - Project Index */}
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
          setZoomToFeature(rec)
          setTimeout(() => setZoomToFeature(null), 100)
        }}
        onZoomToWorkArea={(wa) => {
          setZoomToFeature(wa)
          setTimeout(() => setZoomToFeature(null), 100)
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

