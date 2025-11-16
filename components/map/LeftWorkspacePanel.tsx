"use client"

import { useState } from "react"
import { ChevronLeft, MapPin, FolderOpen, Layers, Upload as UploadIcon } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getApwaColor } from "@/lib/apwaColors"
import type { IndexedRecord } from "@/lib/fetchAllEsriData"
import { cn } from "@/lib/utils"
import type { UtilityType, RecordType } from "@/components/dual-record-selector"
import type { GeometryType } from "@/lib/types"

interface WorkArea {
  id: string
  name: string
  region?: string
  owner?: string
  createdBy?: string
  date?: string
  notes?: string
  records?: any[]
  geometry?: any
}

interface LeftWorkspacePanelProps {
  workAreas?: WorkArea[]
  records?: IndexedRecord[]
  onWorkAreaSelect?: (workArea: WorkArea) => void
  onRecordSelect?: (record: IndexedRecord) => void
  onToggleBasemap?: (basemap: "Streets" | "Imagery" | "Topographic" | "DarkGray") => void
  onToggleLayer?: (layer: string, enabled: boolean) => void
  mode?: "view" | "upload" // Panel mode: view shows work areas/records/layers, upload shows upload workflow
  onModeChange?: (mode: "view" | "upload") => void
  // Upload workflow props
  uploadRecords?: any[]
  uploadSetRecords?: any
  uploadPolygon?: any
  uploadAreaSqMeters?: number | null
  uploadZoomToFeature?: any
  uploadOnWorkAreaClick?: any
  uploadOnOpenWorkAreaAnalysis?: any
  map?: any // Leaflet map instance (optional, for direct map access)
}

export default function LeftWorkspacePanel({
  workAreas = [],
  records = [],
  onWorkAreaSelect,
  onRecordSelect,
  onToggleBasemap,
  onToggleLayer,
  mode = "view",
  onModeChange,
  uploadRecords = [],
  uploadSetRecords,
  uploadPolygon,
  uploadAreaSqMeters,
  uploadZoomToFeature,
  uploadOnWorkAreaClick,
  uploadOnOpenWorkAreaAnalysis,
}: LeftWorkspacePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeBasemap, setActiveBasemap] = useState<"Streets" | "Imagery" | "Topographic" | "DarkGray">("Streets")
  const [layersEnabled, setLayersEnabled] = useState<Record<string, boolean>>({
    Water: true,
    Wastewater: true,
    Storm: true,
    Gas: true,
    Telecom: true,
    Electric: true,
  })

  const handleBasemapToggle = (basemap: "Streets" | "Imagery" | "Topographic" | "DarkGray") => {
    setActiveBasemap(basemap)
    onToggleBasemap?.(basemap)
  }

  const handleLayerToggle = (layer: string, enabled: boolean) => {
    setLayersEnabled((prev) => ({ ...prev, [layer]: enabled }))
    onToggleLayer?.(layer, enabled)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A"
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  const truncateText = (text: string | null | undefined, maxLength: number = 60) => {
    if (!text) return ""
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  return (
    <>
      {/* Collapse/Expand Toggle Button - Always visible */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`
          absolute top-8 z-[2001]
          h-8 w-8 rounded-full
          bg-white border border-gray-200 shadow-lg
          flex items-center justify-center
          hover:bg-gray-50 transition-all
          ${isCollapsed ? "translate-x-[-340px]" : "translate-x-0"}
        `}
        style={{ left: '480px' }}
        aria-label={isCollapsed ? "Expand drawer" : "Collapse drawer"}
      >
        <ChevronLeft
          className={`h-4 w-4 text-gray-700 transition-transform ${
            isCollapsed ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Full-Height Drawer */}
      <div
        className={`
          absolute top-0 z-[2000]
          w-[360px] h-full
          bg-white border-r border-gray-200 shadow-xl
          flex flex-col
          transition-all duration-300 ease-in-out
          ${isCollapsed ? "translate-x-[-340px] opacity-0 pointer-events-none" : "translate-x-0 opacity-100"}
        `}
        style={{ left: '120px', margin: 0, padding: 0 }}
      >
        {/* Tabs - Carto-style at top */}
        {mode === "view" ? (
          <Tabs defaultValue="work-areas" className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b border-gray-200 bg-white px-4 py-3 h-auto">
              <TabsTrigger
                value="work-areas"
                className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-[#011e31] data-[state=active]:text-[#011e31] rounded-none"
              >
                <MapPin className="h-4 w-4 mr-1.5" />
                Work Areas
              </TabsTrigger>
              <TabsTrigger
                value="records"
                className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-[#011e31] data-[state=active]:text-[#011e31] rounded-none"
              >
                <FolderOpen className="h-4 w-4 mr-1.5" />
                Records
              </TabsTrigger>
              <TabsTrigger
                value="layers"
                className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-[#011e31] data-[state=active]:text-[#011e31] rounded-none"
              >
                <Layers className="h-4 w-4 mr-1.5" />
                Layers
              </TabsTrigger>
            </TabsList>

            {/* Scrollable Content Area */}
            <ScrollArea className="flex-1">
              {/* Work Areas Tab */}
              <TabsContent value="work-areas" className="p-4 space-y-2 m-0">
              {workAreas.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-8">
                  No work areas found
                </div>
              ) : (
                workAreas.map((workArea) => (
                  <div
                    key={workArea.id}
                    onClick={() => onWorkAreaSelect?.(workArea)}
                    className="border border-gray-200 rounded-xl p-3 hover:shadow-sm cursor-pointer bg-white transition-shadow"
                  >
                    <div className="font-medium text-gray-900 mb-1">{workArea.name}</div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>Records: {workArea.records?.length || 0}</div>
                      <div>Updated: {formatDate(workArea.date)}</div>
                      {workArea.region && <div>Region: {workArea.region}</div>}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Records Tab */}
            <TabsContent value="records" className="p-4 space-y-2 m-0">
              {records.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-8">
                  No records found
                </div>
              ) : (
                records.map((record) => {
                  const utilityColor = getApwaColor(record.utilityType || undefined)
                  return (
                    <div
                      key={record.id}
                      onClick={() => onRecordSelect?.(record)}
                      className="border border-gray-200 rounded-xl p-3 hover:shadow-sm cursor-pointer bg-white transition-shadow"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                          style={{ backgroundColor: utilityColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {record.utilityType || "Unknown"}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {record.recordType || "No type"}
                          </div>
                        </div>
                      </div>
                      {record.notes && (
                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {truncateText(record.notes, 80)}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-2">
                        {record.geometryType} • {record.organization || "Unknown org"}
                      </div>
                    </div>
                  )
                })
              )}
            </TabsContent>

            {/* Layers Tab */}
            <TabsContent value="layers" className="p-4 space-y-4 m-0">
              {/* Basemaps Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Basemaps</h3>
                <div className="space-y-2">
                  {(["Streets", "Imagery", "Topographic"] as const).map((basemap) => (
                    <div
                      key={basemap}
                      onClick={() => handleBasemapToggle(basemap)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <span className="text-sm text-gray-700">{basemap}</span>
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${
                          activeBasemap === basemap
                            ? "border-[#011e31] bg-[#011e31]"
                            : "border-gray-300"
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* APWA Layers Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">APWA Layers</h3>
                <div className="space-y-2">
                  {(["Water", "Wastewater", "Storm", "Gas", "Telecom", "Electric"] as const).map(
                    (layer) => {
                      const color = getApwaColor(layer)
                      return (
                        <div
                          key={layer}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm text-gray-700">{layer}</span>
                          </div>
                          <Switch
                            checked={layersEnabled[layer] ?? true}
                            onCheckedChange={(checked) => handleLayerToggle(layer, checked)}
                          />
                        </div>
                      )
                    }
                  )}
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        ) : (
          /* Upload Mode - Show upload workflow */
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Step 1: Define Work Area */}
              <Card className="border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                      1
                    </span>
                    Define Work Area
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Draw a polygon on the map to define your work area first.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {uploadPolygon && uploadPolygon.length >= 3 ? (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 p-2 text-xs">
                      <div className="font-medium">Work area defined</div>
                      <div className="mt-1">
                        {uploadPolygon.length} vertices
                        {uploadAreaSqMeters && ` • ${(uploadAreaSqMeters / 1_000_000).toFixed(3)} km²`}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 p-2 text-xs">
                      <div className="font-medium">Draw work area on map</div>
                      <div className="mt-1">Click on the map to start drawing your polygon boundary</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 2: Attach Records */}
              <Card className="border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span
                      className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold",
                        uploadPolygon && uploadPolygon.length >= 3
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-400"
                      )}
                    >
                      2
                    </span>
                    Attach Records
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {uploadPolygon && uploadPolygon.length >= 3
                      ? "Follow the steps to attach your utility records."
                      : "Define work area first, then attach records."}
                  </CardDescription>
                </CardHeader>
                <CardContent
                  className={cn(
                    "space-y-3 pt-0",
                    !uploadPolygon || uploadPolygon.length < 3 ? "opacity-50 pointer-events-none" : ""
                  )}
                >
                  {/* Utility Type Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Utility Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "water", label: "Water" },
                        { value: "wastewater", label: "Wastewater" },
                        { value: "storm", label: "Storm" },
                        { value: "gas", label: "Gas" },
                        { value: "telecom", label: "Telecom" },
                        { value: "electric", label: "Electric" },
                      ].map((utility) => (
                        <Button
                          key={utility.value}
                          variant="outline"
                          size="sm"
                          className="h-auto py-2 text-xs"
                        >
                          {utility.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Record Type Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Record Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "as built", label: "As Built" },
                        { value: "permit", label: "Permit" },
                        { value: "locate", label: "Locate" },
                        { value: "other", label: "Other" },
                      ].map((record) => (
                        <Button
                          key={record.value}
                          variant="outline"
                          size="sm"
                          className="h-auto py-2 text-xs"
                        >
                          {record.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Geometry Type Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Geometry Type</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "point", label: "Point", icon: "●" },
                        { value: "line", label: "Line", icon: "━" },
                        { value: "polygon", label: "Polygon", icon: "▢" },
                      ].map((geometry) => (
                        <Button
                          key={geometry.value}
                          variant="outline"
                          size="sm"
                          className="h-auto py-2 text-xs flex flex-col gap-1"
                        >
                          <span className="text-base">{geometry.icon}</span>
                          <span>{geometry.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Files (PDF/Images/CAD)</Label>
                    <div className="rounded-md border-2 border-dashed border-gray-300 p-4 text-center">
                      <UploadIcon className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                      <p className="text-xs text-gray-600 mb-1">Drop files here or click to browse</p>
                      <p className="text-xs text-gray-400">PDF, Images, CAD files supported</p>
                    </div>
                  </div>

                  {/* Draw on Map Button */}
                  <Button className="w-full" size="sm" disabled>
                    Draw on Map
                  </Button>
                </CardContent>
              </Card>

              {/* Records Summary */}
              {uploadRecords && uploadRecords.length > 0 && (
                <Card className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Uploaded Records</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-xs text-gray-600">
                      {uploadRecords.length} record(s) uploaded
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </>
  )
}
