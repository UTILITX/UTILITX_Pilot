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
}

export default function UploadTab({ records, setRecords, preloadedPolygon, preloadedAreaSqMeters, zoomToFeature }: Props) {
  const { toast } = useToast()
  const [polygon, setPolygon] = useState<LatLng[] | null>(null)
  const [areaSqMeters, setAreaSqMeters] = useState<number | null>(null)

  const [selectedType, setSelectedType] = useState<SelectedType>(null)
  const [orgName, setOrgName] = useState<string>("")
  const [files, setFiles] = useState<FileList | null>(null)
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

  const [pendingDrop, setPendingDrop] = useState<File[] | null>(null)
  const [pendingManualFiles, setPendingManualFiles] = useState<File[] | null>(null)
  const [focusPoint, setFocusPoint] = useState<LatLng | null>(null)

  const [isDraggingSide, setIsDraggingSide] = useState(false)
  const sideDragDepthRef = useRef(0)

  const [isDraggingAttach, setIsDraggingAttach] = useState(false)
  const attachDragDepthRef = useRef(0)

  const [selectedUtilityType, setSelectedUtilityType] = useState<UtilityType | null>(null)
  const [selectedRecordType, setSelectedRecordType] = useState<RecordType | null>(null)
  const [selectedGeometryType, setSelectedGeometryType] = useState<GeometryType | null>(null)

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [fileUrls, setFileUrls] = useState<Map<File, { url: string; path: string }>>(new Map())
  const [notes, setNotes] = useState<string>("")

  const [isGeometryComplete, setIsGeometryComplete] = useState(false)

  const [redrawTarget, setRedrawTarget] = useState<{ recordId: string; fileId: string } | null>(null)

  // Work area drawing mode
  const [isDrawingWorkArea, setIsDrawingWorkArea] = useState(false)
  const [isSelectingWorkArea, setIsSelectingWorkArea] = useState(false)
  const [drawCommand, setDrawCommand] = useState(0)

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

      toast({
        title: "Work area loaded",
        description: "The work area from the secure request has been loaded. You can now upload utility records.",
        variant: "default",
      })
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

    // Use APWA colors based on utility type
    const apwaColor = getApwaColor(selectedUtilityType)
    setGeorefColor(apwaColor)

    // Set the georeferencing mode based on selected geometry type
    // This will enable drawing mode on the map (toolbar stays hidden)
    const geoMode: GeorefMode = selectedGeometryType
    setGeorefMode(geoMode)

    // Drawing will be enabled automatically when georefMode changes
    // The map component will handle pm:create events and call onGeorefComplete
    // which will store geometry and trigger reactive refresh with correct colors
    
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
      const newRecord: RequestRecord = {
        id: crypto.randomUUID(),
        uploaderName: uploader,
        uploadedAt: now,
        recordTypeId: pendingDropMeta.type.id as any,
        recordTypePath: `${pendingDropMeta.type.utilityType} / ${pendingDropMeta.type.recordType}`,
        priority: pendingDropMeta.type.priority,
        orgName: pendingDropMeta.org.trim(),
        notes: pendingDropMeta.notes.trim() || undefined,
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
            savePromises.push(
              addFeatureToLayer(targetUrl, geometry, attributes)
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
      const newRecord: RequestRecord = {
        id: crypto.randomUUID(),
        uploaderName: uploader,
        uploadedAt: now,
        recordTypeId: pendingDropMeta.type.id as any,
        recordTypePath: `${pendingDropMeta.type.utilityType} / ${pendingDropMeta.type.recordType}`,
        priority: pendingDropMeta.type.priority,
        orgName: pendingDropMeta.org.trim(),
        notes: pendingDropMeta.notes.trim() || undefined,
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
      
      // Save to ArcGIS first, then update state after success + delay
      const savePromises: Promise<any>[] = [];
      for (const { file, urlData } of filesWithUrls) {
        if (urlData?.path) {
          const geometry = {
            type: result.type,
            coordinates: result.type === "LineString" 
              ? result.path.map((p) => [p.lng, p.lat])
              : result.type === "Point"
              ? [result.point.lng, result.point.lat]
              : [result.path.map((p) => [p.lng, p.lat])], // Polygon needs nested array
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
            geometry_type: result.type,
          }
          
          // Determine geometry type for routing
          const geometryType = result.type === "LineString" ? "Line" : result.type === "Point" ? "Point" : "Polygon";
          const targetUrl = getRecordsLayerUrl(geometryType);
          if (targetUrl) {
            savePromises.push(
              addFeatureToLayer(targetUrl, geometry, attributes)
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
            console.error(`No target layer URL found for geometry: ${geometryType}`);
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
      setFocusPoint(centroid)
      setPendingDropMeta(null)
      setGeorefMode("none")
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

  async function onAttachDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDraggingAttach(false)
    const droppedFiles = extractFiles(e.dataTransfer)

    // Upload files to Supabase storage
    try {
      toast({
        title: "Uploading files...",
        description: `Uploading ${droppedFiles.length} file(s) to storage...`,
      })

      const uploadResults = await uploadFilesToSupabase(droppedFiles)
      
      // Store files with their URLs
      setUploadedFiles((prev) => [...prev, ...droppedFiles])
      setFiles(e.dataTransfer.files)
      
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
        variant: "default",
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

  function completeUpload() {
    // Reset all form state for new upload
    setSelectedUtilityType(null)
    setSelectedRecordType(null)
    setSelectedGeometryType(null)
    setUploadedFiles([])
    setFileUrls(new Map())
    setFiles(null)
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

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Unified utility records workflow</h2>
          <p className="text-muted-foreground">
            Space-first Records: One unified workflow to define work areas, upload records, and share.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700">Upload</span>
          <span className="text-xs px-2 py-1 rounded bg-sky-50 text-sky-700">Share</span>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Left Column - Define Work Area and Attach Records */}
        <div className="space-y-4 md:col-span-1 md:h-[calc(100vh-12rem)] md:overflow-y-auto md:pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {/* Define Work Area - Step 1 */}
          <Card className="relative z-10 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                  1
                </span>
                Define Work Area
              </CardTitle>
              <CardDescription>Draw a polygon on the map to define your work area first.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Click on the map to start drawing your work area polygon. This defines the boundary for your utility
                records project.
              </div>

              {polygon && polygon.length >= 3 ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 p-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium text-sm">Work area defined</span>
                  </div>
                  <div className="mt-1 text-xs">
                    {polygon.length} vertices •{" "}
                    {typeof areaSqMeters === "number"
                      ? `${(areaSqMeters / 1_000_000).toFixed(3)} km²`
                      : "Area calculated"}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 p-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <span className="font-medium text-sm">Draw work area on map</span>
                  </div>
                  <div className="mt-1 text-xs">Click the button below to start drawing your polygon boundary</div>
                </div>
              )}

              {!polygon || polygon.length < 3 ? (
                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      setDrawCommand((c) => c + 1)
                      setIsDrawingWorkArea(true)
                      setIsSelectingWorkArea(false)
                      toast({
                        title: "Drawing mode activated",
                        description: "Click on the map to start drawing your work area polygon. Double-click to finish.",
                      })
                    }}
                    className="w-full"
                    disabled={isDrawingWorkArea}
                  >
                    {isDrawingWorkArea ? "Drawing... Click on map" : "Draw Work Area"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSelectingWorkArea(true)
                      setIsDrawingWorkArea(false)
                      toast({
                        title: "Selection mode activated",
                        description: "Click on an existing work area polygon on the map to select it.",
                      })
                    }}
                    className="w-full"
                    disabled={isSelectingWorkArea}
                  >
                    {isSelectingWorkArea ? "Selecting... Click on map" : "Select Existing Work Area"}
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPolygon(null)
                      setAreaSqMeters(null)
                      setIsDrawingWorkArea(false)
                    }}
                    className="flex-1"
                  >
                    Clear Work Area
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDrawCommand((c) => c + 1)
                      setIsDrawingWorkArea(true)
                      toast({
                        title: "Redraw mode activated",
                        description: "Click on the map to draw a new work area polygon.",
                      })
                    }}
                    className="flex-1"
                  >
                    Redraw
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attach Records - Step 2 */}
          <Card className="relative z-10 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold",
                    polygon && polygon.length >= 3 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400",
                  )}
                >
                  2
                </span>
                Attach Records
              </CardTitle>
              <CardDescription>
                {polygon && polygon.length >= 3
                  ? "Follow the steps to attach your utility records."
                  : "Define work area first, then attach records."}
              </CardDescription>
            </CardHeader>
            <CardContent
              className={cn("space-y-4", !polygon || polygon.length < 3 ? "opacity-50 pointer-events-none" : "")}
            >
              <div className="grid gap-3">
                <Label className="text-sm font-medium">Utility Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      value: "water",
                      label: "Water",
                    },
                    {
                      value: "wastewater",
                      label: "Wastewater",
                    },
                    {
                      value: "storm",
                      label: "Storm",
                    },
                    {
                      value: "gas",
                      label: "Gas",
                    },
                    {
                      value: "telecom",
                      label: "Telecom",
                    },
                    {
                      value: "electric",
                      label: "Electric",
                    },
                  ].map((utility) => (
                    <Button
                      key={utility.value}
                      variant="outline"
                      className={cn(
                        "h-auto p-3 flex items-center justify-center border-2 transition-all text-xs",
                        selectedUtilityType === utility.value
                          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                          : "hover:bg-muted",
                      )}
                      onClick={() => setSelectedUtilityType(utility.value as UtilityType)}
                    >
                      <span className="font-medium">{utility.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                <Label className="text-sm font-medium">Record Type</Label>
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
                      className={cn(
                        "h-auto p-3 flex items-center justify-center border-2 transition-all text-xs",
                        selectedRecordType === record.value
                          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                          : "hover:bg-muted",
                      )}
                      onClick={() => setSelectedRecordType(record.value as RecordType)}
                      disabled={!selectedUtilityType}
                    >
                      <span className="font-medium">{record.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                <Label className="text-sm font-medium">Geometry Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "point", label: "Point", icon: "●" },
                    { value: "line", label: "Line", icon: "━" },
                    { value: "polygon", label: "Polygon", icon: "▢" },
                  ].map((geometry) => (
                    <Button
                      key={geometry.value}
                      variant="outline"
                      className={cn(
                        "h-auto p-3 flex flex-col items-center gap-2 border-2 transition-all text-xs",
                        selectedGeometryType === geometry.value
                          ? "bg-primary/10 text-primary border-primary hover:bg-primary/20"
                          : "hover:bg-muted/50",
                      )}
                      onClick={() => setSelectedGeometryType(geometry.value as GeometryType)}
                      disabled={!selectedRecordType}
                    >
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-lg font-bold border",
                          selectedGeometryType === geometry.value
                            ? "bg-primary/20 text-primary border-primary"
                            : "bg-muted border-muted-foreground/20",
                        )}
                      >
                        {geometry.icon}
                      </div>
                      <span className="font-medium">{geometry.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {selectedUtilityType && selectedRecordType && selectedGeometryType && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 p-3 text-sm">
                  <span className="font-medium">Selection:</span>{" "}
                  <span className="font-medium">
                    {selectedUtilityType} • {selectedRecordType} • {selectedGeometryType}
                  </span>
                </div>
              )}

              <div className="grid gap-3">
                <Label htmlFor="upl-org">Organization</Label>
                <Input
                  id="upl-org"
                  placeholder="e.g., City of Example"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="upl-notes">Notes (optional)</Label>
                <Input
                  id="upl-notes"
                  placeholder="e.g., Emergency repair work, located near main intersection"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div
                className="relative grid gap-3 rounded-md"
                onDragEnter={(e) => e.preventDefault()}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => e.preventDefault()}
                onDrop={onAttachDrop}
              >
                <Label htmlFor="upload-file-input">Files (PDF/Images/CAD)</Label>
                <div
                  className={cn(
                    "rounded-md border p-2 transition-colors",
                    isDraggingAttach ? "border-emerald-500 bg-emerald-50/40" : "border-muted",
                  )}
                >
                  <Input
                    id="upload-file-input"
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,.dwg,.dxf,.tiff,.tif"
                    multiple
                    onChange={async (e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files)
                        
                        // Upload files to Supabase storage
                        try {
                          toast({
                            title: "Uploading files...",
                            description: `Uploading ${newFiles.length} file(s) to storage...`,
                          })

                          const uploadResults = await uploadFilesToSupabase(newFiles)
                          
                          // Store files with their URLs
                          setUploadedFiles((prev) => [...prev, ...newFiles])
                          setFiles(e.target.files)
                          
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
                            description: `${newFiles.length} file(s) uploaded to storage. Update metadata and click "Draw on Map" to georeference.`,
                            variant: "default",
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
                    }}
                  />
                  <div className="mt-1 text-xs text-muted-foreground">
                    Drag files here to start the flow, or use the picker.
                  </div>
                </div>
                {uploadedFiles.length > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    {uploadedFiles.length} file(s) uploaded: {uploadedFiles.map((f) => f.name).join(", ")}
                  </div>
                ) : files && files.length > 0 ? (
                  <div className="text-xs text-muted-foreground">{files.length} file(s) selected</div>
                ) : null}

                <div
                  className={cn(
                    "pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-md px-3 py-1 text-xs font-medium shadow-sm transition-opacity",
                    isDraggingAttach ? "opacity-100 bg-emerald-600 text-white" : "opacity-0",
                  )}
                  aria-hidden={!isDraggingAttach}
                >
                  Drop files to start flow
                </div>
              </div>

              <div
                className={cn(
                  "relative rounded-lg border-2 border-dashed p-8 text-center transition-all",
                  isDraggingAttach
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50",
                  selectedUtilityType && selectedRecordType && selectedGeometryType
                    ? "opacity-100"
                    : "opacity-50 pointer-events-none",
                )}
                onDragEnter={(e) => e.preventDefault()}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => e.preventDefault()}
                onDrop={onAttachDrop}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-muted p-3">
                    <svg
                      className="h-6 w-6 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Drop files here to upload</p>
                    <p className="text-xs text-muted-foreground">PDF, Images, CAD files supported</p>
                  </div>
                </div>

                {isDraggingAttach && (
                  <div className="absolute inset-0 rounded-lg bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center">
                    <div className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium">
                      Drop files to start upload flow
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
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
            </CardContent>
          </Card>

          {records.some((r) => Array.isArray(r.files) && r.files.some((f) => f.status === "Georeferenced")) && (
            <Card className="relative z-10 bg-white">
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => {
                    const georefRecord = records.find((r) => Array.isArray(r.files) && r.files.some((f) => f.status === "Georeferenced"))
                    if (georefRecord && Array.isArray(georefRecord.files)) {
                      const georeferencedFile = georefRecord.files.find((f) => f.status === "Georeferenced")
                      if (georeferencedFile) {
                        startRedrawGeometry({ recordId: georefRecord.id, fileId: georeferencedFile.id })
                      }
                    }
                  }}
                  className="w-full"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Redraw Geometry
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Map */}
        <Card className="relative z-10 bg-white md:col-span-2">
          <CardHeader>
            <CardTitle>Work Area</CardTitle>
            <CardDescription>Single map for drawing, georeferencing, and sharing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="aspect-[4/3] w-full rounded-md border">
              <MapWithDrawing
                mode="draw"
                polygon={memoPolygon}
                onPolygonChange={handlePolygonChange}
                onWorkAreaSelected={(path, area) => {
                  setPolygon(path)
                  setAreaSqMeters(area ?? null)
                  setIsSelectingWorkArea(false) // Disable selection mode after work area is selected
                  toast({
                    title: "Work area selected",
                    description: "Selected work area from the map. You can now upload records.",
                  })
                }}
                georefMode={georefMode}
                georefColor={georefColor}
                onGeorefComplete={handleGeorefComplete}
                pickPointActive={georefMode === "point"}
                pickZoom={16}
                bubbles={memoBubbles}
                shapes={memoShapes}
                enableDrop
                onDropFilesAt={handleDropFilesAt}
                focusPoint={focusPoint}
                focusZoom={16}
                zoomToFeature={zoomToFeature}
                shouldStartWorkAreaDraw={drawCommand}
              />
            </div>

            {records.length > 0 && <UtilityOverviewPanel records={records} className="mt-4" />}

            <div className="flex flex-col gap-3">
              {/* Polygon summary + actions (remove + secure link) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-sm">
                <div className="text-muted-foreground">
                  {polygon && polygon.length >= 3 ? (
                    <div className="flex flex-wrap gap-2">
                      <span className="font-medium text-foreground">Polygon saved:</span>
                      <span>{polygon.length} vertices</span>
                      {typeof areaSqMeters === "number" ? (
                        <span>• Area: {(areaSqMeters / 1_000_000).toFixed(3)} km²</span>
                      ) : null}
                    </div>
                  ) : (
                    "No polygon yet. You can still georeference files."
                  )}
                </div>
                <div className="flex gap-2">
                  {polygon && polygon.length >= 3 ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPolygon(null)
                        setAreaSqMeters(null)
                      }}
                    >
                      Remove polygon
                    </Button>
                  ) : null}
                  <Button onClick={() => setGenOpen(true)} disabled={!polygon || polygon.length < 3}>
                    Generate secure sharing link
                  </Button>
                </div>
              </div>

              {/* Complete Upload button */}
              <div className="flex justify-end">
                <Button onClick={handleCompleteUpload} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Complete Upload & Start New
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secure link dialogs */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate secure sharing link</DialogTitle>
            <DialogDescription>
              Set details and a passcode. We encrypt the request in the URL for a secure share.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="share-title">Work ID / Project Name (optional)</Label>
              <Input
                id="share-title"
                placeholder="e.g., Main St. Corridor — Phase 2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="share-deadline">Deadline (optional)</Label>
              <Input id="share-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="share-passcode">Passcode (required)</Label>
              <Input
                id="share-passcode"
                type="password"
                placeholder="Set a passcode to protect this link"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>
              Cancel
            </Button>
            <Button onClick={generateSecureLink}>Create link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Secure link ready</DialogTitle>
            <DialogDescription>
              The receiver will open the platform with your polygon preloaded and can contribute records.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="secure-link">Secure link</Label>
            <Input id="secure-link" value={linkUrl} readOnly onFocus={(e) => e.currentTarget.select()} />
            <div className="text-xs text-muted-foreground">Tip: We already copied this link to your clipboard.</div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(linkUrl).catch(() => {})
              }}
            >
              Copy link
            </Button>
            <Button
              onClick={() => {
                window.open(linkUrl, "_blank", "noopener,noreferrer")
              }}
            >
              Open link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

function hasFiles(dt: DataTransfer | null | undefined) {
  if (!dt) return false
  if (dt.types) {
    for (const t of Array.from(dt.types)) {
      if (t === "Files") return true
    }
  }
  return (dt.files && dt.files.length > 0) || (dt.items && dt.items.length > 0)
}

function extractFiles(dt: DataTransfer | null): File[] {
  if (!dt) return []
  if (dt.items && dt.items.length) {
    const files: File[] = []
    for (const item of Array.from(dt.items)) {
      if (item.kind === "file") {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
    return files
  }
  return Array.from(dt.files || [])
}

function centroidOfPath(path: LatLng[]): LatLng {
  if (!path.length) return { lat: 0, lng: 0 }
  const sum = path.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 })
  return { lat: sum.lat / path.length, lng: sum.lng / path.length }
}
