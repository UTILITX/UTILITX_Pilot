"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { WorkAreaCompletenessPanel } from "./WorkAreaCompletenessPanel"
import type { LatLng, RequestRecord } from "@/lib/record-types"
import { FileText, Download, AlertCircle } from "lucide-react"
import { UploadSection } from "@/components/upload/UploadSection"
import { useUploadSection } from "@/components/upload/UploadSectionContext"
import { utilityTypeOptions, recordTypeOptions, geometryTypeOptions } from "@/components/upload/upload-options"
import { useToast } from "@/hooks/use-toast"
import { getApwaColor } from "@/lib/apwaColors"
import type { GeorefMode } from "@/lib/types"
import type { LatLng, RequestRecord } from "@/lib/record-types"
import type React from "react"

type RecordDrawingConfig = {
  georefMode: GeorefMode
  georefColor?: string
  pendingRecordMetadata?: any
  onGeorefComplete?: (
    result: { type: "Point"; point: LatLng } | { type: "LineString" | "Polygon"; path: LatLng[] },
    metadata?: { utilityType?: string; fileUrl?: string; filePath?: string; notes?: string }
  ) => void
}

type WorkAreaAnalysisDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workAreaId?: string
  workAreaName?: string
  polygon?: LatLng[] | null
  records?: RequestRecord[]
  data?: any
  loading?: boolean
  onStartRecordDrawing?: (config: RecordDrawingConfig) => void
  setRecords?: React.Dispatch<React.SetStateAction<RequestRecord[]>>
}

export function WorkAreaAnalysisDrawer({
  open,
  onOpenChange,
  workAreaId,
  workAreaName,
  polygon,
  records = [],
  data,
  loading = false,
  onStartRecordDrawing,
  setRecords,
}: WorkAreaAnalysisDrawerProps) {
  const { toast } = useToast()
  
  // Extract gaps from data
  const gaps = React.useMemo(() => {
    if (data?.gaps && Array.isArray(data.gaps)) {
      return data.gaps
    }
    return []
  }, [data])

  const {
    selectedUtilityType,
    setSelectedUtilityType,
    selectedRecordType,
    setSelectedRecordType,
    selectedGeometryType,
    setSelectedGeometryType,
    uploadedFiles,
    files,
    fileUrls,
    isDraggingAttach,
    onAttachDrop,
    onAttachDragOver,
    onAttachDragLeave,
    onFileInputChange,
    setUploadedFiles,
    setFiles,
  } = useUploadSection()

  const [isGeometryComplete, setIsGeometryComplete] = React.useState(false)

  function startDrawingGeometry() {
    if (!selectedUtilityType || !selectedRecordType || !selectedGeometryType) {
      toast({
        title: "Complete selection",
        description: "Please select utility type, record type, and geometry type first.",
        variant: "destructive",
      })
      return
    }

    if (uploadedFiles.length === 0) {
      toast({
        title: "No files uploaded",
        description: "Please upload files first before drawing geometry.",
        variant: "destructive",
      })
      return
    }

    // Verify all files have been uploaded to Supabase
    const missingUrls = uploadedFiles.filter((f) => !fileUrls.has(f))
    if (missingUrls.length > 0) {
      toast({
        title: "Files not uploaded",
        description: `Please wait for ${missingUrls.length} file(s) to finish uploading to storage before drawing.`,
        variant: "destructive",
      })
      return
    }

    // Create pending record metadata for ArcGIS save
    const firstFile = uploadedFiles[0]
    const firstFileUrlData = firstFile ? fileUrls.get(firstFile) : null
    const recordId = crypto.randomUUID()
    
    const pendingRecordMetadata = {
      utility_type: selectedUtilityType,
      record_type: selectedRecordType,
      organization: workAreaName || "Organization",
      notes: null,
      file_url: firstFileUrlData ? `Records_Private/${firstFileUrlData.path}` : null,
      record_id: recordId,
      source: workAreaName || null,
      processed_date: new Date().toISOString(),
      Creator: "Uploader",
    }

    // Use APWA colors based on utility type
    const apwaColor = getApwaColor(selectedUtilityType)

    // Set the georeferencing mode based on selected geometry type
    const geoMode: GeorefMode = selectedGeometryType

    if (onStartRecordDrawing) {
      onStartRecordDrawing({
        georefMode: geoMode,
        georefColor: apwaColor,
        pendingRecordMetadata,
        onGeorefComplete: (result, metadata) => {
          // Handle georef complete - update records if setRecords is available
          if (setRecords && result.type === "Point") {
            const now = new Date().toISOString()
            const filesWithUrls = uploadedFiles.map((f) => {
              const fileUrlData = fileUrls.get(f)
              return { file: f, urlData: fileUrlData }
            })
            
            const newRecord: RequestRecord = {
              id: recordId,
              uploaderName: "Uploader",
              uploadedAt: now,
              recordTypeId: "lm-water-asbuilts" as any,
              recordTypePath: `${selectedUtilityType} / ${selectedRecordType}`,
              priority: 1,
              orgName: workAreaName || "Organization",
              files: filesWithUrls.map(({ file, urlData }) => ({
                id: crypto.randomUUID(),
                name: file.name,
                size: file.size,
                type: file.type,
                status: "Georeferenced",
                geomType: "Point",
                path: [result.point],
                lat: result.point.lat,
                lng: result.point.lng,
                georefAt: now,
                georefBy: "Uploader",
                fileUrl: urlData?.url,
                filePath: urlData?.path,
              })),
            }
            
            setRecords((prev) => [newRecord, ...prev])
            setIsGeometryComplete(true)
            toast({
              title: "Files georeferenced",
              description: `${uploadedFiles.length} file(s) saved with a point geometry.`,
            })
          } else if (setRecords && (result.type === "LineString" || result.type === "Polygon")) {
            const centroid = result.path.length > 0 
              ? { 
                  lat: result.path.reduce((sum, p) => sum + p.lat, 0) / result.path.length,
                  lng: result.path.reduce((sum, p) => sum + p.lng, 0) / result.path.length,
                }
              : { lat: 0, lng: 0 }
            const now = new Date().toISOString()
            const filesWithUrls = uploadedFiles.map((f) => {
              const fileUrlData = fileUrls.get(f)
              return { file: f, urlData: fileUrlData }
            })
            
            const newRecord: RequestRecord = {
              id: recordId,
              uploaderName: "Uploader",
              uploadedAt: now,
              recordTypeId: "lm-water-asbuilts" as any,
              recordTypePath: `${selectedUtilityType} / ${selectedRecordType}`,
              priority: 1,
              orgName: workAreaName || "Organization",
              files: filesWithUrls.map(({ file, urlData }) => ({
                id: crypto.randomUUID(),
                name: file.name,
                size: file.size,
                type: file.type,
                status: "Georeferenced",
                geomType: result.type,
                path: result.path,
                lat: centroid.lat,
                lng: centroid.lng,
                georefAt: now,
                georefBy: "Uploader",
                fileUrl: urlData?.url,
                filePath: urlData?.path,
              })),
            }
            
            setRecords((prev) => [newRecord, ...prev])
            setIsGeometryComplete(true)
            toast({
              title: "Files georeferenced",
              description: `${uploadedFiles.length} file(s) saved with a ${result.type === "LineString" ? "line" : "polygon"} geometry.`,
            })
          }
        },
      })
    }

    if (geoMode === "point") {
      toast({ title: "Point georeference", description: "Click on the map to place the files." })
    } else if (geoMode === "line") {
      toast({ title: "Line georeference", description: "Draw a line on the map for the files." })
    } else if (geoMode === "polygon") {
      toast({ title: "Polygon georeference", description: "Draw a polygon on the map for the files." })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="group w-full sm:w-[420px] lg:w-[480px] overflow-y-auto p-6 bg-white border-l border-[var(--utilitx-gray-200)] animate-slideInRight animate-fadeIn"
        style={{ boxShadow: "var(--utilitx-shadow-md)" }}
      >
        {/* Wrap all content in a div to avoid ref issues */}
        <div>
          <SheetHeader className="mb-4 animate-slideUpFade">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-semibold text-[var(--utilitx-gray-900)]">
                {workAreaName ?? workAreaId ?? "Work Area"}
              </SheetTitle>
              {data?.recordCount !== undefined && (
                <Badge variant="secondary" className="ml-2 bg-[var(--utilitx-light-blue)] text-[var(--utilitx-gray-900)]">
                  {data.recordCount} records
                </Badge>
              )}
            </div>
            <SheetDescription className="text-sm text-[var(--utilitx-gray-600)]">
              Data coverage & completeness summary
            </SheetDescription>
          </SheetHeader>

          {/* Arrow Indicator */}
          <div className="flex items-center gap-2 mb-4 animate-slideUpFade" style={{ animationDelay: "0.1s" }}>
            <span className="text-xs text-[var(--utilitx-gray-600)]">Summary</span>
            <svg
              className="h-3 w-3 text-[var(--utilitx-gray-600)] transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="mb-3 text-xs text-[var(--utilitx-gray-600)] animate-pulse">
              Calculating completeness for this work area…
            </div>
          )}

          {/* Summary Section */}
          <div className="mb-6 animate-slideUpFade" style={{ animationDelay: "0.15s" }}>
            <WorkAreaCompletenessPanel
              workAreaId={workAreaId}
              workAreaName={workAreaName}
              polygon={polygon}
              records={records}
              data={data}
              className="border-0 shadow-none"
            />
          </div>

          <div className="mb-6 animate-slideUpFade" style={{ animationDelay: "0.2s" }}>
            <div
              className="bg-white rounded-xl p-4 border border-[var(--utilitx-gray-200)]"
              style={{ boxShadow: "var(--utilitx-shadow-light)" }}
            >
              <div className="mb-4">
                <h3 className="text-sm font-medium text-[var(--utilitx-gray-900)]">Upload Records</h3>
                <p className="text-xs text-[var(--utilitx-gray-600)]">
                  Drop files, pick categories, and keep this work area up to date.
                </p>
              </div>
              <UploadSection
                utilityTypes={utilityTypeOptions}
                recordTypes={recordTypeOptions}
                geometryTypes={geometryTypeOptions}
                selectedUtilityType={selectedUtilityType}
                selectedRecordType={selectedRecordType}
                selectedGeometryType={selectedGeometryType}
                onUtilityTypeSelect={setSelectedUtilityType}
                onRecordTypeSelect={setSelectedRecordType}
                onGeometryTypeSelect={setSelectedGeometryType}
                onAttachDrop={onAttachDrop}
                onAttachDragOver={onAttachDragOver}
                onAttachDragLeave={onAttachDragLeave}
                isDraggingAttach={isDraggingAttach}
                onFileInputChange={onFileInputChange}
                uploadedFiles={uploadedFiles}
                files={files}
              />
              <div className="flex items-center gap-2 mt-4">
                <Button
                  onClick={startDrawingGeometry}
                  disabled={
                    !selectedUtilityType || !selectedRecordType || !selectedGeometryType || uploadedFiles.length === 0
                  }
                  className="flex-1"
                >
                  Draw on Map
                </Button>
                {uploadedFiles.length > 0 && !isGeometryComplete && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadedFiles([])
                      setFiles(null)
                    }}
                  >
                    Clear Files
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-[var(--utilitx-gray-200)] my-5" />

          {/* Data Gaps Section */}
          <div className="mb-6 animate-slideUpFade" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-[var(--utilitx-gray-600)]" />
              <h3 className="text-sm font-medium text-[var(--utilitx-gray-700)]">Data Gaps</h3>
            </div>
            {gaps.length > 0 && gaps[0] !== "No data gaps identified" ? (
              <ul className="space-y-2">
                {gaps.map((gap, i) => (
                  <li
                    key={i}
                    className="px-3 py-2 bg-red-50 text-red-700 rounded-md text-xs border border-red-100 hover:bg-red-100 transition-colors duration-200"
                  >
                    {gap}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-2 bg-green-50 text-green-700 rounded-md text-xs border border-green-100">
                No data gaps identified
              </div>
            )}
          </div>

          <div className="h-px bg-[var(--utilitx-gray-200)] my-5" />

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3 animate-slideUpFade" style={{ animationDelay: "0.35s" }}>
            <Button
              className="w-full bg-[var(--utilitx-blue)] hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
              onClick={() => {
                // TODO: Implement view records functionality
                console.log("View records for work area:", workAreaId)
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              View Records
            </Button>
            <Button
              variant="outline"
              className="w-full border-[var(--utilitx-gray-200)] text-[var(--utilitx-gray-900)] hover:bg-[var(--utilitx-gray-100)] transition-all duration-200"
              onClick={() => {
                // TODO: Implement export functionality
                console.log("Export summary for work area:", workAreaId)
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Summary
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

