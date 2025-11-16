"use client"

import { useEffect, useState } from "react"
import UploadTab from "@/components/workflows/upload-tab"
import type { RequestRecord, LatLng } from "@/lib/record-types"
import { loadStagedRecords, saveStagedRecords } from "@/lib/storage"
import BottomDrawer from "@/components/BottomDrawer"
import { Button } from "@/components/ui/button"
import { List } from "lucide-react"
import { fetchAllRecordsFromEsri, fetchAllWorkAreasFromEsri, type IndexedRecord } from "@/lib/fetchAllEsriData"
import { WorkAreaAnalysisDrawer } from "@/components/work-areas/WorkAreaAnalysisDrawer"
import { computeWorkAreaCompleteness } from "@/lib/completeness"
import { queryRecordsInPolygon } from "@/lib/esri-records"
import LeftWorkspacePanel from "@/components/map/LeftWorkspacePanel"
import ModeSelector from "@/components/map/ModeSelector"
import { zoomToEsriFeature } from "@/lib/zoomToFeature"

type PreloadedRequest = {
  createdAt: string
  polygon: LatLng[]
  areaSqMeters?: number
  title?: string
  deadline?: string
  records?: RequestRecord[]
}

export default function MapPage() {
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

  // Work Area Analysis Drawer state
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [selectedWorkAreaForAnalysis, setSelectedWorkAreaForAnalysis] = useState<{
    id?: string
    name?: string
    polygon?: LatLng[] | null
    data?: any
  } | null>(null)
  const [completenessLoading, setCompletenessLoading] = useState(false)

  // Panel mode state (view/upload)
  const [panelMode, setPanelMode] = useState<"view" | "upload">("view")

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

  // Map instance would be used for direct map access if needed
  // Currently using zoomToFeature prop instead
  
  const handleWorkAreaSelect = (workArea: any) => {
    // Zoom to work area and highlight it
    if (workArea.geometry) {
      setZoomToFeature(workArea)
      setTimeout(() => setZoomToFeature(null), 100)
    }
    // Store for potential analysis drawer (Task 4)
    setSelectedWorkAreaForAnalysis({
      id: workArea.id,
      name: workArea.name,
      polygon: workArea.geometry ? convertGeometryToPolygon(workArea.geometry) : null,
      data: workArea,
    })
  }

  const handleRecordSelect = (record: IndexedRecord) => {
    // Zoom to record and highlight it
    if (record.geometry) {
      setZoomToFeature(record)
      setTimeout(() => setZoomToFeature(null), 100)
    }
    // Call existing onRecordSelect callback if needed (for Task 4 drawer)
    // For now, just zoom/highlight
  }

  const handleBasemapToggle = (basemap: "Streets" | "Imagery" | "Topographic" | "DarkGray") => {
    // This will be wired to BasemapToggle component
    // For now, we'll let BasemapToggle handle it directly
    // In the future, we can create a shared basemap state
    console.log("Basemap toggle requested:", basemap)
  }

  const handleLayerToggle = (layer: string, enabled: boolean) => {
    // This will toggle APWA layers on/off
    // Will be implemented in EsriMap in a future update
    console.log("Layer toggle:", layer, enabled)
  }

  return (
    <div className="fixed inset-y-0 left-20 right-0 top-16 overflow-hidden" data-fullscreen-map style={{ margin: 0, padding: 0 }}>
      {/* Map Container - Full Bleed - Base layer */}
      <div className="absolute inset-0 z-0">
        <UploadTab
            records={records}
            setRecords={setRecords}
            preloadedPolygon={preloadedPolygon}
            preloadedAreaSqMeters={preloadedAreaSqMeters}
            zoomToFeature={zoomToFeature}
            fullscreenMap={true}
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

      {/* Thin Mode Selector Panel - between sidebar and drawer */}
      <ModeSelector mode={panelMode} onModeChange={setPanelMode} />

      {/* Left Workspace Panel - positioned over map */}
      <LeftWorkspacePanel
        workAreas={workAreas}
        records={esriRecords}
        onWorkAreaSelect={handleWorkAreaSelect}
        onRecordSelect={handleRecordSelect}
        onToggleBasemap={handleBasemapToggle}
        onToggleLayer={handleLayerToggle}
        mode={panelMode}
        onModeChange={setPanelMode}
        uploadRecords={records}
        uploadSetRecords={setRecords}
        uploadPolygon={preloadedPolygon}
        uploadAreaSqMeters={preloadedAreaSqMeters}
        uploadZoomToFeature={zoomToFeature}
        uploadOnWorkAreaClick={(workArea) => {
          setSelectedWorkAreaForAnalysis({
            id: workArea.id,
            name: workArea.name,
            polygon: workArea.geometry ? convertGeometryToPolygon(workArea.geometry) : null,
            data: workArea,
          })
        }}
        uploadOnOpenWorkAreaAnalysis={async (workArea) => {
          const polygon = workArea.geometry ? convertGeometryToPolygon(workArea.geometry) : null
          setSelectedWorkAreaForAnalysis({
            id: workArea.id,
            name: workArea.name,
            polygon,
            data: { ...workArea, completenessLoading: true },
          })
          setCompletenessLoading(true)
          setAnalysisOpen(true)
          try {
            if (!polygon || polygon.length < 3) {
              setCompletenessLoading(false)
              return
            }
            const recordFeatures = await queryRecordsInPolygon(polygon)
            const completeness = computeWorkAreaCompleteness({ records: recordFeatures })
            setSelectedWorkAreaForAnalysis({
              id: workArea.id,
              name: workArea.name,
              polygon,
              data: { ...workArea, records: recordFeatures, ...completeness },
            })
          } catch (error) {
            console.error("❌ Error computing work area completeness:", error)
          } finally {
            setCompletenessLoading(false)
          }
        }}
      />

      {/* Floating action button to open drawer */}
      <Button
        onClick={() => setDrawerOpen(true)}
        className="fixed top-20 right-2 z-[3000] shadow-lg hover:shadow-xl transition-shadow"
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
    </div>
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

