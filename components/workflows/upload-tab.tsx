"use client"

import { useEffect, useCallback } from "react"
import { useMemo, useState, useRef } from "react"
import type React from "react"
import type { LatLng, RequestRecord } from "@/lib/record-types"
import { encryptPayload, sealedToHash } from "@/lib/crypto"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import dynamic from "next/dynamic";

const MapWithDrawing = dynamic(() => import("@/components/map-with-drawing"), {
  ssr: false,
});

import type { MapBubble, GeorefShape } from "@/components/map-with-drawing";

import { UtilityOverviewPanel } from "@/components/utility-overview-panel"
import { UploadSection } from "@/components/upload/UploadSection"
import { useUploadSection } from "@/components/upload/UploadSectionContext"
import { utilityTypeOptions, recordTypeOptions, geometryTypeOptions } from "@/components/upload/upload-options"
import type { UtilityType, RecordType } from "@/components/dual-record-selector"
import { addFeatureToLayer } from "@/lib/esriUtils"
import { getUtilityColorsFromPath, getUtilityColorsFromUtilityType } from "@/lib/utility-colors"
import { getApwaColor } from "@/lib/apwaColors"
import { getRecordsLayerUrl } from "@/lib/getRecordsLayerUrl"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import type { GeometryType, GeorefMode, PendingDropMeta } from "@/lib/types"
import { RecordsTable } from "@/components/records-table"
import { Edit } from "lucide-react"
import EsriMap from "@/components/EsriMap";
import { uploadFilesToSupabase } from "@/lib/supabase"


type SelectedType = {
  utilityType: UtilityType
  recordType: RecordType
} | null

type Props = {
  records: RequestRecord[]
  setRecords: React.Dispatch<React.SetStateAction<RequestRecord[]>>
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
  onStartRecordDrawing?: (config: {
    georefMode: GeorefMode
    georefColor?: string
    pendingRecordMetadata?: any
    onGeorefComplete: (
      result: { type: "Point"; point: LatLng } | { type: "LineString" | "Polygon"; path: LatLng[] },
      metadata?: { utilityType?: string; fileUrl?: string; filePath?: string; notes?: string }
    ) => void
  }) => void
  onOpenIndex?: () => void
}

export default function UploadTab({
  records,
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
  onOpenIndex,
}: Props) {
  const { toast } = useToast()
  const [polygon, setPolygon] = useState<LatLng[] | null>(null)
  const [areaSqMeters, setAreaSqMeters] = useState<number | null>(null)

  const [selectedType, setSelectedType] = useState<SelectedType>(null)
  const [orgName, setOrgName] = useState<string>("")
  const [uploaderName, setUploaderName] = useState<string>("")

  // New: secure sharing link flow
  const [genOpen, setGenOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [title, setTitle] = useState("")
  const [deadline, setDeadline] = useState<string>("")
  const [passcode, setPasscode] = useState("")

  // Georeference state
  const [georefMode, setGeorefMode] = useState<GeorefMode>("none")
  const [georefColor, setGeorefColor] = useState<string | undefined>(undefined)
  const [target, setTarget] = useState<{ recordId: string; fileId: string } | null>(null)
  const [picked, setPicked] = useState<LatLng | null>(null)
  const [pendingDropMeta, setPendingDropMeta] = useState<PendingDropMeta | null>(null)
  const [pendingRecordMetadata, setPendingRecordMetadata] = useState<any>(null)

  const [focusPoint, setFocusPoint] = useState<LatLng | null>(null)

  const [isDraggingSide, setIsDraggingSide] = useState(false)
  const sideDragDepthRef = useRef(0)

  const {
    selectedUtilityType,
    setSelectedUtilityType,
    selectedRecordType,
    setSelectedRecordType,
    selectedGeometryType,
    setSelectedGeometryType,
    uploadedFiles,
    setUploadedFiles,
    files,
    setFiles,
    fileUrls,
    setFileUrls,
    isDraggingAttach,
    onAttachDrop,
    onAttachDragOver,
    onAttachDragLeave,
    onFileInputChange,
    resetUploadFlow,
  } = useUploadSection()
  const [notes, setNotes] = useState<string>("")

  const [isGeometryComplete, setIsGeometryComplete] = useState(false)

  const [redrawTarget, setRedrawTarget] = useState<{ recordId: string; fileId: string } | null>(null)

  // Work area drawing mode
  const [isDrawingWorkArea, setIsDrawingWorkArea] = useState(false)
  const [isSelectingWorkArea, setIsSelectingWorkArea] = useState(false)
  const [drawCommand, setDrawCommand] = useState(0)
  
  // Record drawing mode (for georeferencing)
  const [recordDrawCommand, setRecordDrawCommand] = useState(0)

  const usingExternalMap = Boolean(onStartWorkAreaDraw || onStartRecordDrawing)

  // Map overlays from records
  const { bubbles, shapes } = useMemo(() => {
    const b: MapBubble[] = []
    const s: GeorefShape[] = []

    const getLabelFromPath = (path?: string) => {
      if (!path || typeof path !== "string") return "Unnamed Record";

      const parts = path.split("/").map((p) => p.trim());
      return parts[parts.length - 1] || path;
    }

    for (const rec of records) {
      // Determine record label - handle both upload records and Esri records
      const recordLabel = getLabelFromPath(
        rec.recordTypePath || 
        rec.file_url || 
        rec.attributes?.record_type || 
        "Record"
      );

      // Try to extract utility type from record path or use fallback
      const colors = getUtilityColorsFromPath(rec.recordTypePath || rec.attributes?.record_type || "")

      // Safely handle records with or without files
      const fileList = Array.isArray(rec.files) ? rec.files : [];

      for (const f of fileList) {
        if (f.status !== "Georeferenced") continue

        // Generate file link - store filePath for generating fresh signed URLs
        // For private buckets, we'll generate a fresh signed URL when the popup opens
        let fileLink = ""
        if (f.filePath) {
          // Store filePath in data attribute so we can generate fresh signed URL on click
          const filePathEscaped = f.filePath.replace(/"/g, '&quot;')
          fileLink = `<br><a href="#" onclick="window.generateSignedUrl('${filePathEscaped}', this); return false;" data-file-path="${filePathEscaped}" style="color: #ff6600; text-decoration: underline; font-weight: 500; cursor: pointer;">📄 Open PDF</a>`
        } else if (f.fileUrl) {
          // Fallback to direct URL if filePath not available
          fileLink = `<br><a href="${f.fileUrl}" target="_blank" rel="noopener noreferrer" style="color: #ff6600; text-decoration: underline; font-weight: 500;">📄 Open PDF</a>`
        }
        
        const baseDesc = `${rec.recordTypePath} • P${rec.priority}
${rec.orgName ? `Org: ${rec.orgName} • ` : ""}Uploaded ${formatDistanceToNow(new Date(rec.uploadedAt), { addSuffix: true })}${fileLink}`

        if (f.geomType === "Point" || (!f.geomType && typeof f.lat === "number" && typeof f.lng === "number")) {
          const pos = f.geomType === "Point" && f.path?.[0] ? f.path[0] : { lat: f.lat as number, lng: f.lng as number }

          b.push({
            id: f.id,
            position: pos,
            title: f.name,
            description: baseDesc,
            recordLabel,
            size: 28,
            filePath: f.filePath,
            fileUrl: f.fileUrl,
            fileName: f.name,
            recordTypePath: rec.recordTypePath,
            source: rec.recordTypePath,
            orgName: rec.orgName,
            uploadedBy: rec.uploaderName,
            uploadedAt: rec.uploadedAt,
            processedDate: f.georefAt || rec.uploadedAt,
          })
        } else if (f.geomType === "LineString" && f.path && f.path.length >= 2) {
          s.push({
            id: f.id,
            type: "LineString",
            path: f.path,
            title: f.name,
            description: `${rec.recordTypePath} • P${rec.priority}`,
            strokeColor: colors.stroke,
          })
          const centroid = centroidOfPath(f.path)
          b.push({
            id: `${f.id}-bubble`,
            position: centroid,
            title: f.name,
            description: baseDesc,
            recordLabel,
            size: 28,
            filePath: f.filePath,
            fileUrl: f.fileUrl,
            fileName: f.name,
            recordTypePath: rec.recordTypePath,
            source: rec.recordTypePath,
            orgName: rec.orgName,
            uploadedBy: rec.uploaderName,
            uploadedAt: rec.uploadedAt,
            processedDate: f.georefAt || rec.uploadedAt,
          })
        } else if (f.geomType === "Polygon" && f.path && f.path.length >= 3) {
          s.push({
            id: f.id,
            type: "Polygon",
            path: f.path,
            title: f.name,
            description: `${rec.recordTypePath} • P${rec.priority}`,
            strokeColor: colors.stroke,
            fillColor: colors.fill,
          })
          const centroid = centroidOfPath(f.path)
          b.push({
            id: `${f.id}-bubble`,
            position: centroid,
            title: f.name,
            description: baseDesc,
            recordLabel,
            size: 28,
            filePath: f.filePath,
            fileUrl: f.fileUrl,
            fileName: f.name,
            recordTypePath: rec.recordTypePath,
            source: rec.recordTypePath,
            orgName: rec.orgName,
            uploadedBy: rec.uploaderName,
            uploadedAt: rec.uploadedAt,
            processedDate: f.georefAt || rec.uploadedAt,
          })
        }
      }
    }
    return { bubbles: b, shapes: s }
  }, [records])

  const totalFiles = useMemo(() => records.reduce((acc, r) => acc + (Array.isArray(r.files) ? r.files.length : 0), 0), [records])

  useEffect(() => {
    if (preloadedPolygon && preloadedPolygon.length >= 3) {
      setPolygon(preloadedPolygon)
      setAreaSqMeters(preloadedAreaSqMeters || null)
      setIsDrawingWorkArea(false)
      setIsSelectingWorkArea(false)

      toast({
        title: "Work area loaded",
        description: "The work area from the secure request has been loaded. You can now upload utility records.",
        variant: "default",
      })
    } else if (!preloadedPolygon || preloadedPolygon.length < 3) {
      setPolygon(preloadedPolygon ?? null)
      setAreaSqMeters(null)
    }
  }, [preloadedPolygon, preloadedAreaSqMeters, toast])

  // Upload-side actions
  function addFilesToQueue() {
    if (!polygon || polygon.length < 3) {
      toast({ title: "Draw a polygon", description: "Define the work area first.", variant: "destructive" })
      return
    }
    if (!selectedType?.utilityType || !selectedType?.recordType) {
      toast({
        title: "Select record type",
        description: "Choose both utility type and record type.",
        variant: "destructive",
      })
      return
    }

    const hasUploadedFiles = records.some((record) => Array.isArray(record.files) && record.files.length > 0)
    if (!hasUploadedFiles) {
      toast({
        title: "Upload files first",
        description: "Drop files on the map or drag them to the side panel.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Upload flow started",
      description: "Your files are ready for processing with the selected utility and record types.",
      variant: "default",
    })
  }

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

    // Set up the selected type
    setSelectedType({
      utilityType: selectedUtilityType,
      recordType: selectedRecordType,
    })

    // Set up pending drop meta with uploaded files
    setPendingDropMeta({
      files: uploadedFiles,
      type: {
        utilityType: selectedUtilityType,
        recordType: selectedRecordType,
      },
      org: orgName || "Organization",
      name: uploaderName || "",
      notes: notes,
    })

    // Create pending record metadata for ArcGIS save
    // Get the first file's URL (or null if no files uploaded yet)
    const firstFile = uploadedFiles[0]
    const firstFileUrlData = firstFile ? fileUrls.get(firstFile) : null
    const recordId = crypto.randomUUID()
    
    const pendingRecordMetadata = {
      utility_type: selectedUtilityType,
      record_type: selectedRecordType,
      organization: orgName || "Organization",
      notes: notes || null,
      file_url: firstFileUrlData ? `Records_Private/${firstFileUrlData.path}` : null,
      record_id: recordId,
      source: orgName || null,
      processed_date: new Date().toISOString(),
      Creator: uploaderName || "Uploader",
    }

    // Use APWA colors based on utility type
    const apwaColor = getApwaColor(selectedUtilityType)
    setGeorefColor(apwaColor)

    // Set the georeferencing mode based on selected geometry type
    const geoMode: GeorefMode = selectedGeometryType
    setGeorefMode(geoMode)

    // Store pending record metadata (will be passed to map)
    setPendingRecordMetadata(pendingRecordMetadata)

    if (onStartRecordDrawing) {
      onStartRecordDrawing({
        georefMode: geoMode,
        georefColor: apwaColor,
        pendingRecordMetadata,
        onGeorefComplete: (result, metadata) => {
          handleGeorefComplete(result, metadata)
        },
      })
    } else {
      // Increment record draw command to trigger drawing mode in the embedded map
      setRecordDrawCommand((c) => c + 1)
    }

    if (geoMode === "point") {
      toast({ title: "Point georeference", description: "Click on the map to place the files." })
    } else if (geoMode === "line") {
      toast({ title: "Line georeference", description: "Draw a line on the map for the files." })
    } else if (geoMode === "polygon") {
      toast({ title: "Polygon georeference", description: "Draw a polygon on the map for the files." })
    }
  }

  function startGeoreference(payload: { recordId: string; fileId: string }) {
    setTarget(payload)
    const rec = records.find((r) => r.id === payload.recordId)
    if (rec && selectedType?.utilityType) {
      const apwaColor = getApwaColor(selectedType.utilityType)
      setGeorefColor(apwaColor)
    } else {
      setGeorefColor(undefined)
    }
    setGeorefMode("point")
  }

  function startRedrawGeometry(payload: { recordId: string; fileId: string }) {
    const record = records.find((r) => r.id === payload.recordId)
    const file = Array.isArray(record?.files) ? record.files.find((f) => f.id === payload.fileId) : undefined

    if (!record || !file) return

    setRedrawTarget(payload)

    // Set color based on record type
    const utilityType = record.recordTypePath.split(" / ")[0]
    const apwaColor = getApwaColor(utilityType)
    setGeorefColor(apwaColor)

    // Set geometry mode based on existing geometry
    if (file.geomType === "Point") {
      setGeorefMode("point")
      toast({ title: "Redraw point", description: "Click on the map to place the new point location." })
    } else if (file.geomType === "LineString") {
      setGeorefMode("line")
      toast({ title: "Redraw line", description: "Draw a new line on the map, double-click to finish." })
    } else if (file.geomType === "Polygon") {
      setGeorefMode("polygon")
      toast({ title: "Redraw polygon", description: "Draw a new polygon on the map." })
    }

    // Focus on existing geometry if available
    if (file.lat && file.lng) {
      setFocusPoint({ lat: file.lat, lng: file.lng })
    } else if (file.path && file.path.length > 0) {
      setFocusPoint(file.path[0])
    }
  }

  async function handleDropFilesAt(latlng: LatLng, droppedFiles: File[]) {
    // Upload files to Supabase storage
    try {
      toast({
        title: "Uploading files...",
        description: `Uploading ${droppedFiles.length} file(s) to storage...`,
      })

      const uploadResults = await uploadFilesToSupabase(droppedFiles)
      
      // Store files with their URLs
      setUploadedFiles((prev) => [...prev, ...droppedFiles])
      
      // Store file URLs in map
      setFileUrls((prev) => {
        const newMap = new Map(prev)
        uploadResults.forEach((result) => {
          newMap.set(result.file, { url: result.url, path: result.path })
        })
        return newMap
      })

      toast({
        title: "Files uploaded",
        description: `${droppedFiles.length} file(s) uploaded to storage. Update metadata and click "Draw on Map" to georeference.`,
      })
    } catch (error: any) {
      console.error("Error uploading files to Supabase:", error)
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload files to storage. Please try again.",
        variant: "destructive",
      })
    }
  }

  async function handleGeorefComplete(
    result: { type: "Point"; point: LatLng } | { type: "LineString" | "Polygon"; path: LatLng[] },
    metadata?: { utilityType?: string; fileUrl?: string; filePath?: string; notes?: string }
  ) {
    if (redrawTarget) {
      const now = new Date().toISOString()
      const uploader = "Current User" // You might want to get this from context/auth

      setRecords((prev) =>
        prev.map((record) => {
          if (record.id === redrawTarget.recordId) {
            const fileList = Array.isArray(record.files) ? record.files : [];
            return {
              ...record,
              files: fileList.map((file) => {
                if (file.id === redrawTarget.fileId) {
                  if (result.type === "Point") {
                    return {
                      ...file,
                      geomType: "Point",
                      path: [result.point],
                      lat: result.point.lat,
                      lng: result.point.lng,
                      georefAt: now,
                      georefBy: uploader,
                      // Preserve existing fileUrl and filePath if they exist
                      fileUrl: file.fileUrl,
                      filePath: file.filePath,
                    }
                  } else {
                    return {
                      ...file,
                      geomType: result.type,
                      path: result.path,
                      lat: result.path[0]?.lat,
                      lng: result.path[0]?.lng,
                      georefAt: now,
                      georefBy: uploader,
                      // Preserve existing fileUrl and filePath if they exist
                      fileUrl: file.fileUrl,
                      filePath: file.filePath,
                    }
                  }
                }
                return file
              }),
            }
          }
          return record
        }),
      )

      setRedrawTarget(null)
      setGeorefMode("none")
      setPendingRecordMetadata(null)

      if (result.type === "Point") {
        setFocusPoint(result.point)
      } else {
        setFocusPoint(result.path[0])
      }

      toast({
        title: "Geometry redrawn",
        description: `File geometry has been updated with new ${result.type.toLowerCase()}.`,
      })
      return
    }

    // Existing code for regular georeferencing
    if (!target && pendingDropMeta && result.type === "Point") {
      const now = new Date().toISOString()
      const uploader = pendingDropMeta.name.trim() || "Uploader"
      
      // Get file URLs for all files
      const filesWithUrls = pendingDropMeta.files.map((f) => {
        const fileUrlData = fileUrls.get(f)
        if (!fileUrlData) {
          console.warn(`⚠️ File ${f.name} does not have a Supabase URL. It may not have been uploaded.`)
        } else {
          console.log(`✅ File ${f.name} uploaded to Supabase:`, fileUrlData.url)
        }
        return {
          file: f,
          urlData: fileUrlData,
        }
      })
      
      // Prepare the new record (but don't add to state yet - wait for ArcGIS save)
      // Note: pendingDropMeta.type only has utilityType and recordType, not id/priority
      // Use a default recordTypeId and priority for now
      const newRecord: RequestRecord = {
        id: crypto.randomUUID(),
        uploaderName: uploader,
        uploadedAt: now,
        recordTypeId: "lm-water-asbuilts" as any, // Default - could be improved with mapping
        recordTypePath: `${pendingDropMeta.type.utilityType} / ${pendingDropMeta.type.recordType}`,
        priority: 1, // Default priority
        orgName: pendingDropMeta.org.trim(),
        notes: pendingDropMeta.notes?.trim() || undefined,
        files: filesWithUrls.map(({ file, urlData }) => ({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          status: "Georeferenced",
          geomType: "Point",
          path: [result.point], // Store point as single-item path array
          lat: result.point.lat,
          lng: result.point.lng,
          georefAt: now,
          georefBy: uploader,
          fileUrl: urlData?.url,
          filePath: urlData?.path,
        })),
      }
      
      // Save to ArcGIS first, then update state after success + delay
      const savePromises: Promise<any>[] = [];
      for (const { file, urlData } of filesWithUrls) {
        if (urlData?.path) {
          const geometry = {
            type: "Point",
            coordinates: [result.point.lng, result.point.lat],
          }
          const storagePath = `Records_Private/${urlData.path}`
          const attributes = {
            Creator: uploader,
            processed_date: now,
            source: pendingDropMeta.org?.trim() || null,
            file_url: storagePath,
            notes: pendingDropMeta.notes?.trim() || null,
            utility_type: pendingDropMeta.type?.utilityType || null,
            record_type: pendingDropMeta.type?.recordType || null,
            geometry_type: "Point",
          }
          
          // Save to ArcGIS Point layer
          const targetUrl = getRecordsLayerUrl("Point");
          if (targetUrl) {
            // Try to get token from client-side auth
            let authToken: string | null = null;
            try {
              const { getArcGISToken } = await import('@/lib/auth/get-token');
              authToken = getArcGISToken();
            } catch (error) {
              console.warn("Could not get token from client-side auth, using API key fallback");
            }
            
            savePromises.push(
              addFeatureToLayer(targetUrl, geometry, attributes, authToken)
                .then((saveResult) => {
                  console.log(`✅ Feature added successfully:`, saveResult)
                  return saveResult
                })
                .catch((err) => {
                  console.error("Error saving record to ArcGIS:", err)
                  throw err
                })
            )
          } else {
            console.error("No target layer URL found for geometry: Point");
          }
        }
      }
      
      // Wait for all ArcGIS saves to complete, then add 500ms delay for commit, then update state
      Promise.all(savePromises)
        .then(() => {
          // Wait 500ms to ensure ArcGIS response is committed
          return new Promise(resolve => setTimeout(resolve, 500))
        })
        .then(() => {
          // Now update state - this triggers reactive refresh with stable data
          setRecords((prev) => [newRecord, ...prev])
        })
        .catch((err) => {
          console.error("Error during ArcGIS save, updating state anyway:", err)
          // Update state even on error so user sees their drawing
          setRecords((prev) => [newRecord, ...prev])
        })
      
      setFocusPoint(result.point)
      setPendingDropMeta(null)
      setGeorefMode("none")
      setPendingRecordMetadata(null)
      setIsGeometryComplete(true)
      toast({
        title: "Files georeferenced",
        description: `${pendingDropMeta.files.length} file(s) saved with a point geometry.`,
      })
      return
    }

    if (target && result.type === "Point") {
      const now = new Date().toISOString()
      const by = uploaderName.trim() || "Uploader"
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== target.recordId) return r
          return {
            ...r,
            recordTypePath: selectedType
              ? `${selectedType.utilityType} / ${selectedType.recordType}`
              : r.recordTypePath,
            files: Array.isArray(r.files) ? r.files.map((f) =>
              f.id === target.fileId
                ? {
                    ...f,
                    status: "Georeferenced",
                    geomType: "Point",
                    path: [result.point], // Store point as single-item path array
                    lat: result.point.lat,
                    lng: result.point.lng,
                    georefAt: now,
                    georefBy: by,
                    // Preserve existing fileUrl and filePath if they exist
                    fileUrl: f.fileUrl,
                    filePath: f.filePath,
                  }
                : f,
            ) : [],
          }
        }),
      )
      setFocusPoint(result.point)
      setTarget(null)
      setGeorefMode("none")
      setPendingRecordMetadata(null)
      toast({
        title: "Georeferenced",
        description: "Point saved for the file.",
      })
      return
    }

    if (!target && pendingDropMeta && (result.type === "LineString" || result.type === "Polygon")) {
      const centroid = centroidOfPath(result.path)
      const now = new Date().toISOString()
      const uploader = pendingDropMeta.name.trim() || "Uploader"
      
      // Get file URLs for all files
      const filesWithUrls = pendingDropMeta.files.map((f) => {
        const fileUrlData = fileUrls.get(f)
        if (!fileUrlData) {
          console.warn(`⚠️ File ${f.name} does not have a Supabase URL. It may not have been uploaded.`)
        } else {
          console.log(`✅ File ${f.name} uploaded to Supabase:`, fileUrlData.url)
        }
        return {
          file: f,
          urlData: fileUrlData,
        }
      })
      
      // Prepare the new record (but don't add to state yet - wait for ArcGIS save)
      // Note: pendingDropMeta.type only has utilityType and recordType, not id/priority
      // Use a default recordTypeId and priority for now
      const newRecord: RequestRecord = {
        id: crypto.randomUUID(),
        uploaderName: uploader,
        uploadedAt: now,
        recordTypeId: "lm-water-asbuilts" as any, // Default - could be improved with mapping
        recordTypePath: `${pendingDropMeta.type.utilityType} / ${pendingDropMeta.type.recordType}`,
        priority: 1, // Default priority
        orgName: pendingDropMeta.org.trim(),
        notes: pendingDropMeta.notes?.trim() || undefined,
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
          georefBy: uploader,
          fileUrl: urlData?.url,
          filePath: urlData?.path,
        })),
      }
      
      // Add to state immediately (optimistically) so user sees the record right away
      console.log("📝 Adding record to state optimistically");
      setRecords((prev) => [newRecord, ...prev])
      
      // Note: ArcGIS save now happens in handleRecordDrawing() in EsriMap.tsx
      // with full metadata. No need to save here again to avoid duplicates.
      console.log("ℹ️ ArcGIS save handled by handleRecordDrawing in EsriMap");
      setFocusPoint(centroid)
      setPendingDropMeta(null)
      setPendingRecordMetadata(null) // Reset metadata after save
      setGeorefMode("none")
      setPendingRecordMetadata(null)
      setIsGeometryComplete(true)
      toast({
        title: "Files georeferenced",
        description: `${pendingDropMeta.files.length} file(s) saved with a ${result.type === "LineString" ? "line" : "polygon"} geometry.`,
      })
      return
    }

    const centroid = centroidOfPath(result.path)
    const now = new Date().toISOString()
    const by = uploaderName.trim() || "Uploader"
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== target.recordId) return r
        return {
          ...r,
          // Update the record type path to include utility type if we have selectedType
          recordTypePath: selectedType ? `${selectedType.utilityType} / ${selectedType.recordType}` : r.recordTypePath,
          files: Array.isArray(r.files) ? r.files.map((f) =>
            f.id === target.fileId
              ? {
                  ...f,
                  status: "Georeferenced",
                  geomType: result.type,
                  path: result.path,
                  lat: centroid.lat,
                  lng: centroid.lng,
                  georefAt: now,
                  georefBy: by,
                  // Preserve existing fileUrl and filePath if they exist
                  fileUrl: f.fileUrl,
                  filePath: f.filePath,
                }
              : f,
          ) : [],
        }
      }),
    )
    setFocusPoint(centroid)
    setTarget(null)
    setGeorefMode("none")
    toast({
      title: "Georeferenced",
      description: `${result.type === "LineString" ? "Line" : "Polygon"} saved for the file.`,
    })
  }

  function completeUpload() {
    // Reset all form state for new upload
    resetUploadFlow()
    setOrgName("")
    setNotes("")
    setUploaderName("")
    setIsGeometryComplete(false)
    setSelectedType(null)
    setGeorefMode("none")
    setGeorefColor(undefined)
    setFocusPoint(null)

    // Clear file input
    const el = document.getElementById("upload-file-input") as HTMLInputElement | null
    if (el) el.value = ""

    toast({
      title: "Upload completed",
      description: "Ready to start a new upload. Select utility type, record type, and upload files.",
    })
  }


  async function generateSecureLink() {
    if (!polygon || polygon.length < 3) {
      toast({ title: "Draw a polygon", description: "Please outline the area of interest.", variant: "destructive" })
      return
    }
    if (!passcode.trim()) {
      toast({ title: "Add a passcode", description: "Set a passcode to protect the link.", variant: "destructive" })
      return
    }
    const payload = {
      createdAt: new Date().toISOString(),
      polygon,
      areaSqMeters: areaSqMeters ?? undefined,
      title: title.trim() || undefined,
      deadline: deadline || undefined,
      records,
    }
    try {
      const sealed = await encryptPayload(passcode.trim(), payload)
      const url = `${window.location.origin}/share#${sealedToHash(sealed)}`
      await navigator.clipboard.writeText(url).catch(() => {})
      setLinkUrl(url)
      setGenOpen(false)
      setLinkOpen(true)
      toast({ title: "Secure link generated", description: "Link copied to clipboard. Share it with the receiver." })
    } catch {
      toast({ title: "Failed to create link", description: "Please try again.", variant: "destructive" })
    }
  }

  function handleCancelGeoref() {
    setTarget(null)
    setRedrawTarget(null)
    setGeorefMode("none")
    setGeorefColor(undefined)
  }

  const handleCompleteUpload = () => {
    completeUpload()
  }

  // Memoize props passed to the map
  const memoPolygon = useMemo(() => polygon, [polygon])
  const memoBubbles = useMemo(() => bubbles, [bubbles])
  const memoShapes = useMemo(() => shapes, [shapes])

  // Wrap onPolygonChange in useCallback
  const handlePolygonChange = useCallback((path: LatLng[], area?: number) => {
    setPolygon(path)
    setAreaSqMeters(area ?? null)
    setIsDrawingWorkArea(false)
    // Reset drawCommand to 0 so enableWorkAreaDrawing becomes false and draw mode is disabled
    setDrawCommand(0)
  }, [])

  // Step 3: Upload flow UI removed - now lives in Work Area panel
  // All functionality remains intact via UploadSectionContext
  return (
    <div className="p-4 text-xs text-muted-foreground space-y-2">
      <p>Uploads now live in the Work Area panel.</p>
      <p>Select a Work Area on the map to view completeness and attach records.</p>
    </div>
  )
}

function centroidOfPath(path: LatLng[]): LatLng {
  if (!path.length) return { lat: 0, lng: 0 }
  const sum = path.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 })
  return { lat: sum.lat / path.length, lng: sum.lng / path.length }
}
