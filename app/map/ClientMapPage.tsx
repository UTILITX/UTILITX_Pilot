"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import nextDynamic from "next/dynamic"
import type { RequestRecord, LatLng } from "@/lib/record-types"
import type { GeorefMode } from "@/lib/types"
import { loadStagedRecords, saveStagedRecords } from "@/lib/storage"
import { fetchAllRecordsFromEsri, fetchAllWorkAreasFromEsri, type IndexedRecord } from "@/lib/fetchAllEsriData"
import { WorkAreaAnalysisDrawer } from "@/components/work-areas/WorkAreaAnalysisDrawer"
import { NavigationPanel } from "@/components/navigation/NavigationPanel"
import Topbar from "@/components/Topbar"
import { computeWorkAreaCompleteness } from "@/lib/completeness"
import { queryRecordsInPolygon } from "@/lib/esri-records"
import RegionSearch from "@/components/RegionSearch"
import { UploadSectionProvider } from "@/components/upload/UploadSectionContext"
import { useArcGISAuth } from "@/contexts/ArcGISAuthContext"

// Dynamically import map components to avoid SSR issues with Leaflet
const MapWithDrawing = nextDynamic(() => import("@/components/map-with-drawing"), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100">Loading map...</div>
})

const BottomDrawer = nextDynamic(() => import("@/components/BottomDrawer"), {
  ssr: false
})

const LeftWorkspacePanel = nextDynamic(() => import("@/components/map/LeftWorkspacePanel"), {
  ssr: false
})

const FloatingTools = nextDynamic(() => import("@/components/map/FloatingTools"), {
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
  // ============================================
  // ALL HOOKS MUST BE DECLARED FIRST (before any returns)
  // ============================================
  
  const router = useRouter()
  const { accessToken, isAuthenticated, isLoading, login } = useArcGISAuth()
  
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

  // Navigation mode state (for left sidebar navigation)
  const [navigationMode, setNavigationMode] = useState<"workareas" | "records" | "insights" | "share" | "settings">("workareas")
  const [navigationPanelOpen, setNavigationPanelOpen] = useState(false)

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

  // Check authentication on mount
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Trigger client-side login flow
      login().catch(console.error);
    }
  }, [isLoading, isAuthenticated, login])

  // When navigation mode changes, open the navigation panel (unless a work area is selected)
  useEffect(() => {
    if (!analysisOpen && !selectedWorkAreaForAnalysis) {
      setNavigationPanelOpen(true)
    }
  }, [navigationMode, analysisOpen, selectedWorkAreaForAnalysis])

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

const handleSelectProject = (id: string) => {
  const workArea = workAreas.find((w) => w.id === id)
  if (workArea) {
    setSelectedWorkArea(workArea)
    // Persist selection to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("utilitx-current-work-area", workArea.id)
    }
    // Open the work area analysis drawer
    setSelectedWorkAreaForAnalysis({
      id: workArea.id,
      name: workArea.name,
      polygon: null, // Will be loaded when work area is clicked on map or geometry is fetched
      data: workArea,
    })
    setAnalysisOpen(true)
    setNavigationPanelOpen(false)
  }
}

// Handle panel mode changes from left sidebar
const handleSetPanelMode = (mode: "overview" | "records" | "insights" | "share" | "settings") => {
  if (!selectedWorkArea) return // Don't open panels if no project selected
  
  if (mode === "overview") {
    // Open work area analysis panel
    setSelectedWorkAreaForAnalysis({
      id: selectedWorkArea.id,
      name: selectedWorkArea.name,
      polygon: null,
      data: selectedWorkArea,
    })
    setAnalysisOpen(true)
    setNavigationPanelOpen(false)
  } else {
    // For other modes, update navigation mode and open navigation panel
    const navMode = mode === "records" ? "records" : 
                   mode === "insights" ? "insights" : 
                   mode === "share" ? "share" : "settings"
    setNavigationMode(navMode)
    setNavigationPanelOpen(true)
    setAnalysisOpen(false)
  }
}

  // Load Esri data on mount (for Project Index drawer)
  useEffect(() => {
    // Don't run during SSR
    if (typeof window === "undefined") return;

    async function loadData() {
      try {
        const [r, wa] = await Promise.all([
          fetchAllRecordsFromEsri(accessToken),
          fetchAllWorkAreasFromEsri(accessToken),
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
  }, [accessToken]);

  // Restore saved project on page load
  useEffect(() => {
    if (!workAreas || workAreas.length === 0) return;
    if (typeof window === "undefined") return;
    if (selectedWorkArea) return; // Don't restore if already selected

    const savedId = localStorage.getItem("utilitx-current-work-area");
    if (!savedId) return;

    const wa = workAreas.find((w) => w.id === savedId);
    if (wa) {
      console.log("🔄 Restoring saved project:", savedId);
      // Restore the saved project state
      setSelectedWorkArea(wa);
      setSelectedWorkAreaForAnalysis({
        id: wa.id,
        name: wa.name,
        polygon: null, // Will be loaded when work area is clicked on map or geometry is fetched
        data: wa,
      });
      setAnalysisOpen(true);
      setNavigationPanelOpen(false);
    }
  }, [workAreas, selectedWorkArea]);

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

  // ============================================
  // MEMOIZED COMPONENTS (before return)
  // ============================================
  
  // Memoize MapWithDrawing to prevent remounts on state changes
  // MUST be at component top level (not inside JSX) per Rules of Hooks
  const MemoizedMapWithDrawing = useMemo(() => (
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
      selectedWorkArea={selectedWorkArea}
      arcgisToken={accessToken}
      georefMode={recordDrawingConfig?.georefMode ?? "none"}
      georefColor={recordDrawingConfig?.georefColor}
      onGeorefComplete={handleRecordGeorefComplete}
      pickPointActive={recordDrawingConfig?.georefMode === "point"}
      shouldStartRecordDraw={recordDrawCommand}
      pendingRecordMetadata={recordDrawingConfig?.pendingRecordMetadata}
      zoomToFeature={zoomToFeature}
      onWorkAreaSelect={(workArea) => {
        console.log("🖱️ Work area selected from click:", workArea.id);
        // Update selected work area and open analysis panel
        const workAreaToSelect = {
          id: workArea.id,
          name: workArea.name || workArea.id,
          region: workArea.region,
          owner: workArea.owner,
          createdBy: workArea.createdBy,
          date: workArea.date,
          notes: workArea.notes,
        };
        handleSelectProject(workArea.id);
      }}
      onWorkAreaClick={(workArea) => {
        setSelectedWorkAreaForAnalysis({
          id: workArea.id,
          name: workArea.name,
          polygon: workArea.geometry ? convertGeometryToPolygon(workArea.geometry) : null,
          data: workArea,
        })
      }}
      onNewWorkAreaCreated={(newWorkArea) => {
        // Immediately make new work area the selected project
        console.log("🎉 New work area created, setting as active:", newWorkArea.id);
        
        // Add to work areas list if not already there
        const workAreaToAdd = {
          id: newWorkArea.id,
          name: newWorkArea.name || newWorkArea.id,
          region: newWorkArea.region,
          owner: newWorkArea.owner,
          createdBy: newWorkArea.created_by || newWorkArea.createdBy,
          date: newWorkArea.timestamp || newWorkArea.date,
          notes: newWorkArea.notes,
        };
        
        setWorkAreas((prev) => {
          if (prev.find((wa) => wa.id === newWorkArea.id)) {
            return prev;
          }
          return [...prev, workAreaToAdd];
        });
        
        // Set as selected work area AND open analysis panel
        setSelectedWorkArea(workAreaToAdd);
        setSelectedWorkAreaForAnalysis({
          id: workAreaToAdd.id,
          name: workAreaToAdd.name,
          polygon: newWorkArea.geometry ? convertGeometryToPolygon(newWorkArea.geometry) : null,
          data: workAreaToAdd,
        });
        setAnalysisOpen(true);
        setNavigationPanelOpen(false);
        
        // Persist to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("utilitx-current-work-area", workAreaToAdd.id);
        }
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
      <RegionSearch />
    </MapWithDrawing>
  ), [
    preloadedPolygon,
    workAreaDrawCommand,
    workAreaSelectionEnabled,
    selectedWorkArea,
    accessToken,
    recordDrawingConfig,
    recordDrawCommand,
    zoomToFeature,
    // Note: Inline callbacks are recreated on each render, but that's acceptable
    // The main benefit is preventing full component remount when these values don't change
  ])

  // ============================================
  // CONDITIONAL RETURNS (after all hooks)
  // ============================================

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-700">Checking authentication...</div>
        </div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-700 mb-4">Authentication required</div>
          <button
            onClick={() => login().catch(console.error)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Sign in with ArcGIS
          </button>
        </div>
      </div>
    )
  }

  return (
    <UploadSectionProvider>
      <div className="flex flex-col h-full w-full">
        <Topbar
          workAreas={workAreas}
          selectedWorkArea={selectedWorkArea}
          handleSelectProject={handleSelectProject}
          onCreateNew={startWorkAreaDraw}
        />
        <div className="relative flex-1 w-full overflow-hidden bg-white">
        <div className="absolute inset-0 z-[5]">
          {/* Memoized MapWithDrawing - prevents remounts on state changes */}
          {MemoizedMapWithDrawing}
        </div>

        <div className="relative z-10 flex h-full w-full items-start justify-start pointer-events-none">
          <div className="pointer-events-auto">
            <LeftWorkspacePanel
              currentProject={selectedWorkArea}
              setPanelMode={handleSetPanelMode}
              selectedMode={analysisOpen ? "overview" : navigationMode === "workareas" ? "overview" : navigationMode}
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
        onStartRecordDrawing={startRecordDrawing}
        setRecords={setRecords}
      />

      <NavigationPanel
        open={navigationPanelOpen && !analysisOpen}
        onOpenChange={setNavigationPanelOpen}
        mode={navigationMode}
        esriRecords={esriRecords}
        workAreas={workAreas}
        onSelectWorkArea={(id) => {
          const workArea = workAreas.find((w) => w.id === id)
          if (workArea) {
            setSelectedWorkAreaForAnalysis({
              id: workArea.id,
              name: workArea.name,
              polygon: null, // Will be loaded when work area is clicked on map
              data: workArea,
            })
            setAnalysisOpen(true)
            setNavigationPanelOpen(false)
          }
        }}
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
      </div>
    </UploadSectionProvider>
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

