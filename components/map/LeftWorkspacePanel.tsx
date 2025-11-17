"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { RecordsTable } from "@/components/tables/RecordsTable"
import { WorkAreasTable } from "@/components/tables/WorkAreasTable"
import UploadTab from "@/components/workflows/upload-tab"
import type { RequestRecord, LatLng } from "@/lib/record-types"
import type { IndexedRecord } from "@/lib/fetchAllEsriData"
import type { GeorefMode } from "@/lib/types"
import { useState } from "react"
import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

type Mode = "view" | "upload"

interface WorkArea {
  id: string
  name: string
  region?: string
  owner?: string
  createdBy?: string
  date?: string
  notes?: string
  records?: any[]
}

type RecordDrawingRequest = {
  georefMode: GeorefMode
  georefColor?: string
  pendingRecordMetadata?: any
  onGeorefComplete?: (result: any, metadata?: any) => void
}

interface LeftWorkspacePanelProps {
  mode: Mode
  // View mode props
  esriRecords?: IndexedRecord[]
  workAreas?: WorkArea[]
  selectedWorkArea?: WorkArea | null
  onSelectWorkArea?: (id: string | null) => void
  onZoomToRecord?: (record: IndexedRecord) => void
  onZoomToWorkArea?: (workArea: WorkArea) => void
  onOpenIndex?: () => void
  // Upload mode props
  records?: RequestRecord[]
  setRecords?: React.Dispatch<React.SetStateAction<RequestRecord[]>>
  preloadedPolygon?: LatLng[] | null
  preloadedAreaSqMeters?: number | null
  zoomToFeature?: any | null
  onWorkAreaClick?: (workArea: {
    id?: string
    name?: string
    [key: string]: any
  }) => void
  onOpenWorkAreaAnalysis?: (workArea: {
    id?: string
    name?: string
    geometry?: any
    [key: string]: any
  }) => void
  onStartWorkAreaDraw?: () => void
  onStartWorkAreaSelection?: () => void
  onClearWorkArea?: () => void
  onStartRecordDrawing?: (request: RecordDrawingRequest) => void
}

export default function LeftWorkspacePanel({
  mode,
  esriRecords = [],
  workAreas = [],
  selectedWorkArea = null,
  onSelectWorkArea,
  onZoomToRecord,
  onZoomToWorkArea,
  onOpenIndex,
  records = [],
  setRecords,
  preloadedPolygon,
  preloadedAreaSqMeters,
  zoomToFeature,
  onWorkAreaClick,
  onOpenWorkAreaAnalysis,
  onStartWorkAreaDraw,
  onStartWorkAreaSelection,
  onClearWorkArea,
  onStartRecordDrawing,
}: LeftWorkspacePanelProps) {
  // Filter state for RecordsTable (lifted to persist across tab switches)
  const [utilityFilter, setUtilityFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [orgFilter, setOrgFilter] = useState<string>("all")
  const [geometryFilter, setGeometryFilter] = useState<string>("all")
  const [hasFileFilter, setHasFileFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  return (
    <div className="fixed left-[72px] top-[56px] h-[calc(100vh-64px)] w-[420px] bg-white shadow-xl rounded-r-2xl z-30 flex flex-col overflow-hidden border-r border-[var(--utilitx-gray-200)]" data-panel="project-index">
      {mode === "view" ? (
        <div className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-[var(--utilitx-gray-200)]">
            <h2 className="font-semibold text-lg text-[var(--utilitx-gray-900)]">Project Index</h2>
          </div>
          <Tabs defaultValue="workareas" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-3 mx-4 mt-3 mb-2">
              <TabsTrigger value="workareas">Work Areas</TabsTrigger>
              <TabsTrigger value="records">Records</TabsTrigger>
              <TabsTrigger value="layers">Layers</TabsTrigger>
            </TabsList>

            <TabsContent value="workareas" className="flex-1 overflow-hidden flex flex-col mt-0 px-4">
              <div className="flex-1 overflow-y-auto">
                <WorkAreasTable
                  workAreas={workAreas}
                  onSelectWorkArea={(id) => onSelectWorkArea?.(id)}
                  onZoomToWorkArea={(wa) => onZoomToWorkArea?.(wa)}
                />
              </div>
            </TabsContent>

            <TabsContent value="records" className="flex-1 overflow-hidden flex flex-col mt-0 px-4">
              <div className="flex-1 overflow-y-auto">
                <RecordsTable
                  records={esriRecords}
                  onZoomToRecord={(rec) => onZoomToRecord?.(rec)}
                  utilityFilter={utilityFilter}
                  setUtilityFilter={setUtilityFilter}
                  typeFilter={typeFilter}
                  setTypeFilter={setTypeFilter}
                  orgFilter={orgFilter}
                  setOrgFilter={setOrgFilter}
                  geometryFilter={geometryFilter}
                  setGeometryFilter={setGeometryFilter}
                  hasFileFilter={hasFileFilter}
                  setHasFileFilter={setHasFileFilter}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              </div>
            </TabsContent>

            <TabsContent value="layers" className="flex-1 overflow-hidden flex flex-col mt-0 px-4">
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 text-sm text-[var(--utilitx-gray-600)]">
                  <p className="font-medium mb-2">Map Layers</p>
                  <p className="text-xs">Layer controls coming soon...</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          {/* Index Button at bottom */}
          <div className="px-4 py-3 border-t border-[var(--utilitx-gray-200)]">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                onOpenIndex?.()
              }}
            >
              <BookOpen className="h-4 w-4" />
              Index
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-hidden">
          <style
            dangerouslySetInnerHTML={{
              __html: `
                .upload-drawer-wrapper [class*="md:grid-cols-3"] {
                  grid-template-columns: 1fr !important;
                }
              `,
            }}
          />
          <div className="flex-1 overflow-y-auto">
            {setRecords ? (
              <div className="p-4 upload-drawer-wrapper">
                <UploadTab
                  records={records}
                  setRecords={setRecords}
                  preloadedPolygon={preloadedPolygon}
                  preloadedAreaSqMeters={preloadedAreaSqMeters}
                  zoomToFeature={zoomToFeature}
                  onWorkAreaClick={onWorkAreaClick}
                  onOpenWorkAreaAnalysis={onOpenWorkAreaAnalysis}
                  onStartWorkAreaDraw={onStartWorkAreaDraw}
                  onStartWorkAreaSelection={onStartWorkAreaSelection}
                  onClearWorkArea={onClearWorkArea}
                  onStartRecordDrawing={onStartRecordDrawing}
                />
              </div>
            ) : (
              <div className="p-4 text-sm text-[var(--utilitx-gray-600)]">
                Upload functionality requires setRecords prop.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
