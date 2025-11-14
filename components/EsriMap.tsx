"use client";

import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

import * as EL from "esri-leaflet";
import { useToast } from "@/hooks/use-toast";
import { addFeatureToLayer } from "@/lib/esriUtils";
import { getRecordsLayerUrl } from "@/lib/getRecordsLayerUrl";
import { getSignedUrl, getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { LatLng } from "@/lib/record-types";
import type { GeorefMode } from "@/lib/types";
import type { MapBubble, GeorefShape } from "@/components/map-with-drawing";
import { WorkAreaPopup } from "@/components/WorkAreaPopup";
import { RecordPopup } from "@/components/RecordPopup";
import { getApwaColor } from "@/lib/apwaColors";
import { getFeatureGeometry } from "@/lib/geoUtils";
import { zoomToEsriFeature } from "@/lib/zoomToFeature";

// Note: Supabase client initialization is handled via singleton pattern in lib/supabase-client.ts
// This prevents multiple GoTrueClient instances and eliminates duplication warnings

declare module "leaflet" {
  interface Map {
    pm: any;
  }
}

// Helper function to render React component to DOM element for Leaflet popup
function renderReactPopup(component: React.ReactElement): HTMLElement {
  const div = document.createElement("div");
  const root = createRoot(div);
  root.render(component);
  return div;
}

type EsriMapProps = {
  mode?: "draw" | "view";
  polygon?: LatLng[] | null;
  onPolygonChange?: (path: LatLng[], area?: number) => void;
  enableWorkAreaDrawing?: boolean;
  shouldStartRecordDraw?: number;
  enableWorkAreaSelection?: boolean;
  onWorkAreaSelected?: (path: LatLng[], area?: number) => void;
  georefMode?: GeorefMode;
  georefColor?: string;
  onGeorefComplete?: (
    result: { type: "Point"; point: LatLng } | { type: "LineString" | "Polygon"; path: LatLng[] },
    metadata?: { fileUrl?: string; filePath?: string; notes?: string; utilityType?: string }
  ) => void;
  pickPointActive?: boolean;
  pickZoom?: number;
  bubbles?: MapBubble[];
  shapes?: GeorefShape[];
  enableDrop?: boolean;
  onDropFilesAt?: (latlng: LatLng, files: File[]) => void;
  focusPoint?: LatLng | null;
  focusZoom?: number;
  center?: LatLng;
  zoom?: number;
  zoomToFeature?: any | null; // Esri feature geometry to zoom to
  pendingRecordMetadata?: any;
};

export default function EsriMap({
  mode = "draw",
  polygon,
  onPolygonChange,
  enableWorkAreaDrawing = false,
  shouldStartRecordDraw = 0,
  enableWorkAreaSelection = false,
  onWorkAreaSelected,
  georefMode = "none",
  georefColor,
  onGeorefComplete,
  pickPointActive = false,
  pickZoom = 20,
  bubbles = [],
  shapes = [],
  enableDrop = false,
  onDropFilesAt,
  focusPoint,
  focusZoom = 20,
  center,
  zoom,
  zoomToFeature,
  pendingRecordMetadata,
}: EsriMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const workAreasLayerRef = useRef<any>(null);
  const recordsLayerRefInternal = useRef<any>(null);
  const recordsPointLayerRef = useRef<any>(null);
  const recordsLineLayerRef = useRef<any>(null);
  const recordsPolygonLayerRef = useRef<any>(null);
  const currentPolygonLayerRef = useRef<L.Polygon | null>(null);
  const currentGeorefLayerRef = useRef<L.Layer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const shapesGroupRef = useRef<L.LayerGroup | null>(null);
  const isDrawingWorkAreaRef = useRef(false);
  const isDrawingRecordRef = useRef(false);
  const hasActiveWorkAreaRef = useRef(false);
  const drawingSessionActiveRef = useRef(false);
  const enableWorkAreaDrawingRef = useRef(enableWorkAreaDrawing);
  const georefModeRef = useRef(georefMode);
  const pendingRecordMetadataRef = useRef(pendingRecordMetadata);
  const recordSavedToArcGISRef = useRef(false);
  const toastRef = useRef<any>(null);

  // Dedicated initialization effect - runs once on mount
  useEffect(() => {
    // Guard: ensure map initializes only once
    if (mapRef.current) return;

    // Check if container exists
    const mapContainer = document.getElementById("map");
    if (!mapContainer) {
      console.error("Map container not found");
      return;
    }

    // Ensure container has dimensions
    if (mapContainer.clientWidth === 0 || mapContainer.clientHeight === 0) {
      // Wait a bit for container to get dimensions
      setTimeout(() => {
        if (mapContainer.clientWidth > 0 && mapContainer.clientHeight > 0) {
          initializeMap();
        }
      }, 100);
      return;
    }

    initializeMap();

    function initializeMap() {
      // Initialize map with default values (no prop dependencies)
      const map = L.map("map", {
        center: [43.7, -79.4], // Toronto default
        zoom: 12,
        minZoom: 3,
        maxZoom: 19, // Proper maxZoom for Esri vector basemaps (fixes Leaflet-Geoman pm:create issue)
        wheelDebounceTime: 25, // smoother zoom
        wheelPxPerZoomLevel: 60,
      });

      mapRef.current = map;

      // Wait for map to be ready before adding layers
      map.whenReady(() => {
        // Fix squished map layout first
        map.invalidateSize();
        
        // Wait a bit more to ensure map is fully rendered
        setTimeout(() => {
          // Check if map container is still valid
          if (!map.getContainer() || !map.getContainer().parentElement) {
            console.error("Map container is not valid");
            return;
          }

          // Check if map panes are initialized
          if (!map.getPane('mapPane') || !map.getPane('tilePane')) {
            console.error("Map panes not initialized");
            return;
          }

          // Define basemap layers using ArcGIS basemapLayer
          // Note: basemapLayer shows a deprecation warning but is fully functional.
          // Vector.vectorBasemapLayer is not yet available in the current esri-leaflet version.
          // When upgrading esri-leaflet, migrate to: EL.Vector.vectorBasemapLayer("ArcGIS:Streets", { apiKey })
          const apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY!
          
          const basemaps: Record<string, L.TileLayer> = {
            Imagery: EL.basemapLayer("Imagery", {
              apikey: apiKey,
              maxZoom: 19,
            }),
            Streets: EL.basemapLayer("Streets", {
              apikey: apiKey,
              maxZoom: 19,
            }),
            Topographic: EL.basemapLayer("Topographic", {
              apikey: apiKey,
              maxZoom: 19,
            }),
          };
  
          // Add default basemap - wait a bit more to ensure panes are ready
          setTimeout(() => {
            try {
              if (map.getPane('tilePane') && map.getContainer()) {
                const defaultBasemap = basemaps.Streets;
                defaultBasemap.addTo(map);
                
                // Make the map adopt the basemap's maxZoom when it loads
                defaultBasemap.on("load", () => {
                  const tileMax = (defaultBasemap.options as any).maxZoom ?? 19;
                  map.setMaxZoom(tileMax);
                });
              }
            } catch (err) {
              console.error("Error adding basemap:", err);
            }

            // Add layer control after basemap is added
    setTimeout(() => {
              try {
                if (L.control && L.control.layers && map.getContainer() && map.getPane('mapPane')) {
                  const layerControl = L.control.layers(basemaps, undefined, {
                    position: "topright" as const,
                    collapsed: false,
                  });
                  if (layerControl) {
                    layerControl.addTo(map);
                    
                    // Update map maxZoom when basemap changes
                    map.on("baselayerchange", (e: any) => {
                      const newBasemap = e.layer;
                      const tileMax = (newBasemap.options as any).maxZoom ?? 19;
                      map.setMaxZoom(tileMax);
                    });
                  }
                }
              } catch (err) {
                console.error("Error adding layer control:", err);
                // Continue without layer control - not critical
              }
            }, 100);
    }, 100);
  
          // Add hosted WorkAreas layer (polygons) - "workarea" layer
          // Wait a bit more to ensure map is fully ready
          setTimeout(() => {
            try {
              if (map.getPane('overlayPane') && map.getContainer()) {
    const workAreas = EL.featureLayer({
      url: process.env.NEXT_PUBLIC_WORKAREA_LAYER_URL!,
      apikey: process.env.NEXT_PUBLIC_ARCGIS_API_KEY!,
      style: () => ({ color: "#0077ff", weight: 2, fillOpacity: 0.15 }),
      onEachFeature: (feature: any, layer: L.Layer) => {
        const props = feature.properties || {};
        
        // Format work area ID (use OBJECTID or work_area_id, format as WA-XXXX)
        const workAreaId = props.work_area_id 
          ? `WA-${String(props.work_area_id).padStart(4, '0')}` 
          : props.OBJECTID 
          ? `WA-${String(props.OBJECTID).padStart(4, '0')}` 
          : undefined;
        
        // Format date
        const date = props.timestamp || props.created_date || props.date;
        
        // Create popup content using React component
        const popupContent = renderReactPopup(
          <WorkAreaPopup
            workAreaId={workAreaId}
            region={props.region}
            owner={props.owner}
            createdBy={props.created_by || props.createdBy}
            date={date}
            notes={props.notes}
            onViewRecords={() => {
              // TODO: Implement view records functionality
              console.log("View records for work area:", workAreaId);
            }}
            onCreatedByClick={(name) => {
              // TODO: Implement user profile/view functionality
              console.log("View profile for:", name);
            }}
          />
        );
        
        layer.bindPopup(popupContent, {
          className: "custom-popup",
          maxWidth: 400,
        });
      },
    }).addTo(map);

                workAreasLayerRef.current = workAreas;
              }
            } catch (err) {
              console.error("Error adding work areas layer:", err);
            }
          }, 200);

          // Add hosted Records layers - Point, Line, and Polygon
          // Wait longer to ensure map is fully stable
          setTimeout(() => {
            try {
              // Ensure map is fully ready and not in a transition
              if (!map.getPane('overlayPane') || !map.getContainer()) {
                console.warn("Map not ready for records layers");
                return;
              }
              
              // Wait for map to be fully loaded and stable
              // Check if map is in a transition state (if available)
              const isTransitioning = (map as any)._zoomTransitioning || false;
              
              if (isTransitioning) {
                // Wait for zoom to complete
                map.once('zoomend', () => {
                  setTimeout(() => addRecordsLayers(), 200);
                });
                return;
              }
              
              // Add a delay to ensure map is stable before adding layers
              setTimeout(() => addRecordsLayers(), 100);
              
              // Helper function to create a records layer with consistent styling
              function createRecordsLayer(url: string, geometryType: "Point" | "Line" | "Polygon") {
                const layer = EL.featureLayer({
                  url: url,
                  apikey: process.env.NEXT_PUBLIC_ARCGIS_API_KEY!,
                  pointToLayer: geometryType === "Point" ? (feature: any, latlng: any) => {
                    const props = feature.properties || {};
                    const utilityType = props.utility_type;
                    const color = getApwaColor(utilityType);
                    return L.circleMarker(latlng, { 
                      radius: 6, 
                      color: color, 
                      fillColor: color,
                      fillOpacity: 0.8,
                      weight: 2,
                    });
                  } : undefined,
                  style: geometryType !== "Point" ? (feature: any) => {
                    const props = feature.properties || {};
                    const utilityType = props.utility_type;
                    const color = getApwaColor(utilityType);
                    
                    if (geometryType === "Line") {
                      return {
                        color: color,
                        weight: 3,
                        opacity: 1,
                      };
                    } else if (geometryType === "Polygon") {
                      return {
                        color: color,
                        fillColor: color,
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.5,
                      };
                    }
                    return {};
                  } : undefined,
                  onEachFeature: (feature: any, layer: L.Layer) => {
                    const props = feature.properties || {};
                    
                    // Format record ID (use OBJECTID or record_id, format as R-XXXXX)
                    const recordId = props.record_id 
                      ? `R-${String(props.record_id).padStart(5, '0')}` 
                      : props.OBJECTID 
                      ? `R-${String(props.OBJECTID).padStart(5, '0')}` 
                      : undefined;
                    
                    // Format processed date (prioritize processed_date as that's what we save)
                    const processedDate = props.processed_date || props.timestamp || props.created_date || props.date;
                    
                    // Get file path/URL for download/view
                    let filePath = props.file_path || props.filePath;
                    const fileUrl = props.file_url || props.fileUrl;
                    
                    // If file_url is a storage path (contains "Records_Private/"), extract the path
                    if (fileUrl && fileUrl.includes("Records_Private/")) {
                      filePath = fileUrl.replace("Records_Private/", "");
                    } else if (fileUrl && !fileUrl.startsWith("http")) {
                      filePath = fileUrl;
                    }
                    
                    // Create popup content using React component
                    const popupContent = renderReactPopup(
                      <RecordPopup
                        recordId={recordId}
                        source={props.source}
                        processedDate={processedDate}
                        uploadedBy={props.Creator || props.created_by || props.uploaded_by || props.createdBy}
                        utilityType={props.utility_type}
                        recordType={props.record_type}
                        organization={props.source}
                        notes={props.notes}
                        filePath={filePath}
                        fileUrl={fileUrl && fileUrl.startsWith("http") ? fileUrl : undefined}
                        onViewFile={async () => {
                          if (filePath) {
                            try {
                              const signedUrl = await getSignedUrl(filePath, 3600);
                              window.open(signedUrl, "_blank");
                            } catch (error: any) {
                              console.error("Error generating signed URL:", error);
                              alert(`Failed to open file: ${error.message}`);
                            }
                          } else if (fileUrl && fileUrl.startsWith("http")) {
                            window.open(fileUrl, "_blank");
                          }
                        }}
                        onDownload={async () => {
                          if (filePath) {
                            try {
                              const signedUrl = await getSignedUrl(filePath, 3600);
                              const link = document.createElement("a");
                              link.href = signedUrl;
                              link.download = props.file_name || "download";
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            } catch (error: any) {
                              console.error("Error generating signed URL:", error);
                              alert(`Failed to download file: ${error.message}`);
                            }
                          } else if (fileUrl && fileUrl.startsWith("http")) {
                            const link = document.createElement("a");
                            link.href = fileUrl;
                            link.download = props.file_name || "download";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }
                        }}
                        onUploadedByClick={(name) => {
                          console.log("View profile for:", name);
                        }}
                      />
                    );
                    
                    layer.bindPopup(popupContent, {
                      className: "custom-popup",
                      maxWidth: 400,
                    });
                  },
                });
                return layer;
              }
              
              function addRecordsLayers() {
                try {
                  if (!map.getPane('overlayPane') || !map.getContainer()) {
                    console.warn("Map not ready for records layers (retry)");
                    return;
                  }
                  
                  // Add Point layer
                  if (process.env.NEXT_PUBLIC_RECORDS_POINT_LAYER_URL) {
                    const pointLayer = createRecordsLayer(process.env.NEXT_PUBLIC_RECORDS_POINT_LAYER_URL, "Point");
                    pointLayer.addTo(map);
                    recordsPointLayerRef.current = pointLayer;
                    
                    // Add delayed zoom after layer loads (wait for Map Pane init)
                    pointLayer.on("load", () => {
                      console.log("Records Point layer loaded");
                      setTimeout(() => {
                        try {
                          // Ensure map pane is ready
                          if (!map.getPane('mapPane') || !map.getContainer()) {
                            console.warn("Map not ready for zoom, retrying...");
                            return;
                          }
                          
                          const features: any[] = [];
                          pointLayer.eachFeature((layer: any) => {
                            if (layer.feature?.geometry) features.push(layer.feature);
                          });
                          if (features.length > 0 && zoomToFeature?.geometry) {
                            console.log("Zooming to feature from Point layer");
                            if (zoomToFeature?.geometry) {
                              zoomToEsriFeature(map, zoomToFeature);
                            } else {
                              console.warn("Skipping zoom — feature missing geometry:", zoomToFeature);
                            }
                          }
                        } catch (err) {
                          console.warn("Error zooming after Point layer load:", err);
                        }
                      }, 400);
                    });
                  }
                  
                  // Add Line layer
                  if (process.env.NEXT_PUBLIC_RECORDS_LINE_LAYER_URL) {
                    const lineLayer = createRecordsLayer(process.env.NEXT_PUBLIC_RECORDS_LINE_LAYER_URL, "Line");
                    lineLayer.addTo(map);
                    recordsLineLayerRef.current = lineLayer;
                    
                    // Add delayed zoom after layer loads (wait for Map Pane init)
                    lineLayer.on("load", () => {
                      console.log("Records Line layer loaded");
                      setTimeout(() => {
                        try {
                          // Ensure map pane is ready
                          if (!map.getPane('mapPane') || !map.getContainer()) {
                            console.warn("Map not ready for zoom, retrying...");
                            return;
                          }
                          
                          const features: any[] = [];
                          lineLayer.eachFeature((layer: any) => {
                            if (layer.feature?.geometry) features.push(layer.feature);
                          });
                          if (features.length > 0 && zoomToFeature?.geometry) {
                            console.log("Zooming to feature from Line layer");
                            if (zoomToFeature?.geometry) {
                              zoomToEsriFeature(map, zoomToFeature);
                            } else {
                              console.warn("Skipping zoom — feature missing geometry:", zoomToFeature);
                            }
                          }
                        } catch (err) {
                          console.warn("Error zooming after Line layer load:", err);
                        }
                      }, 400);
                    });
                  }
                  
                  // Add Polygon layer
                  if (process.env.NEXT_PUBLIC_RECORDS_POLYGON_LAYER_URL) {
                    const polygonLayer = createRecordsLayer(process.env.NEXT_PUBLIC_RECORDS_POLYGON_LAYER_URL, "Polygon");
                    polygonLayer.addTo(map);
                    recordsPolygonLayerRef.current = polygonLayer;
                    
                    // Add delayed zoom after layer loads (wait for Map Pane init)
                    polygonLayer.on("load", () => {
                      console.log("Records Polygon layer loaded");
                      setTimeout(() => {
                        try {
                          // Ensure map pane is ready
                          if (!map.getPane('mapPane') || !map.getContainer()) {
                            console.warn("Map not ready for zoom, retrying...");
                            return;
                          }
                          
                          const features: any[] = [];
                          polygonLayer.eachFeature((layer: any) => {
                            if (layer.feature?.geometry) features.push(layer.feature);
                          });
                          if (features.length > 0 && zoomToFeature?.geometry) {
                            console.log("Zooming to feature from Polygon layer");
                            if (zoomToFeature?.geometry) {
                              zoomToEsriFeature(map, zoomToFeature);
                            } else {
                              console.warn("Skipping zoom — feature missing geometry:", zoomToFeature);
                            }
                          }
                        } catch (err) {
                          console.warn("Error zooming after Polygon layer load:", err);
                        }
                      }, 400);
                    });
                  }
                  
                  // Keep legacy layer reference for backward compatibility
                  recordsLayerRefInternal.current = recordsPointLayerRef.current || recordsLineLayerRef.current || recordsPolygonLayerRef.current;
                  
                } catch (layerErr) {
                  console.error("Error creating records layers:", layerErr);
                }
              }
            } catch (err) {
              console.error("Error adding records layers:", err);
            }
          }, 300);

          // Create groups for bubbles and shapes - wait for map to be fully ready
          setTimeout(() => {
            try {
              if (map.getPane('overlayPane') && map.getContainer()) {
                const markersGroup = L.layerGroup().addTo(map);
                markersGroupRef.current = markersGroup;

                const shapesGroup = L.layerGroup().addTo(map);
                shapesGroupRef.current = shapesGroup;
              }
            } catch (err) {
              console.error("Error creating layer groups:", err);
            }
          }, 300);

          // Get toast function - we'll use a ref to avoid calling useToast in useEffect
          const showToast = (options: any) => {
            // We'll use a simple approach - try to get toast from window or use console
            if (typeof window !== "undefined" && (window as any).toast) {
              (window as any).toast(options);
            } else {
              console.log("Toast:", options.title, options.description);
            }
          };

          // Enable drawing controls based on mode - wait for map to be fully ready
          setTimeout(() => {
            try {
              if (mode === "draw" && map.getContainer() && map.getPane('mapPane')) {
                if (enableWorkAreaDrawing) {
                  // Work area drawing: hide draw buttons, only show Edit/Erase
                  // Drawing is controlled programmatically
                  map.pm.addControls({
                    position: "topleft",
                    drawMarker: false,
                    drawPolyline: false,
                    drawPolygon: false,
                    drawRectangle: false,
                    drawCircle: false,
                    drawCircleMarker: false,
                    editMode: true,      // ✏️ enable edit mode (move / edit vertices)
                    dragMode: false,
                    cutPolygon: false,
                    removalMode: true,   // 🗑️ allows erase/delete
                    oneBlock: true,      // groups icons into one compact block
                  });
                  
                  // Only enable draw mode if explicitly requested AND we are starting a fresh drawing session.
                  if (enableWorkAreaDrawing === true) {
                    if (drawingSessionActiveRef.current === false && hasActiveWorkAreaRef.current === false) {
                      console.log("🔥 enableDraw called from INIT_BLOCK", {
                        enableWorkAreaDrawing,
                        drawingSessionActive: drawingSessionActiveRef.current,
                        hasActiveWorkArea: hasActiveWorkAreaRef.current,
                      });
                      map.pm.enableDraw("Polygon");
                      drawingSessionActiveRef.current = true;
                      hasActiveWorkAreaRef.current = true;
                    }
                  }
                } else if (georefMode !== "none") {
                  // Record drawing: hide draw buttons, only show Edit/Erase
                  // Drawing is controlled programmatically via "Draw on Map" button
                  map.pm.addControls({
                    position: "topleft",
                    drawMarker: false,
                    drawPolyline: false,
                    drawPolygon: false,
                    drawRectangle: false,
                    drawCircle: false,
                    drawCircleMarker: false,
                    editMode: true,      // ✏️ enable edit mode (move / edit vertices)
                    dragMode: false,
                    cutPolygon: false,
                    removalMode: true,   // 🗑️ allows erase/delete
                    oneBlock: true,      // groups icons into one compact block
                  });

                  // Enable the appropriate drawing mode programmatically
                  if (georefMode === "point") {
                    map.pm.enableDraw("Marker");
                  } else if (georefMode === "line") {
                    map.pm.enableDraw("Line");
                  } else if (georefMode === "polygon") {
                    map.pm.enableDraw("Polygon");
                  }
                } else {
                  // Hide all draw buttons - only show Edit and Erase for professional cleanup
                  map.pm.addControls({
                    position: "topleft",
                    drawMarker: false,
                    drawPolyline: false,
                    drawPolygon: false,
                    drawRectangle: false,
                    drawCircle: false,
                    drawCircleMarker: false,
                    editMode: true,      // ✏️ enable edit mode (move / edit vertices)
                    dragMode: false,
                    cutPolygon: false,
                    removalMode: true,   // 🗑️ allows erase/delete
                    oneBlock: true,      // groups icons into one compact block
                  });
                  map.pm.disableDraw();
                }

                // Disable drawing when edit mode is enabled to prevent overlap
                const handleEditModeToggle = (e: any) => {
                  if (e.enabled) {
                    map.pm.disableDraw();
                  }
                };
                map.on("pm:globaleditmodetoggled", handleEditModeToggle);
              }
            } catch (err) {
              console.error("Error setting up drawing controls:", err);
            }
          }, 400);

          // Handle work area drawing (polygons and rectangles only)
          const handleWorkAreaDrawing = async (e: any) => {
            if (isDrawingRecordRef.current) return; // Don't handle if we're drawing a record

      const layer = e.layer;
      const geojson = layer.toGeoJSON();
      const geometry = geojson.geometry;

            // Work areas are only polygons (rectangles are also polygons in GeoJSON)
            if (geometry.type !== "Polygon") {
              return;
            }

            // Mark that we're starting to draw a work area
            isDrawingWorkAreaRef.current = true;
            hasActiveWorkAreaRef.current = true;

            // Convert GeoJSON coordinates to LatLng[]
            // Polygon: [[[lng, lat], [lng, lat], ...]] (first ring is exterior)
            const coordinates = geometry.coordinates[0]; // First ring
            const path: LatLng[] = coordinates.map((coord: number[]) => ({
              lat: coord[1],
              lng: coord[0],
            }));

            // Calculate area (rough approximation)
            let area = 0;
            for (let i = 0; i < path.length - 1; i++) {
              area += path[i].lng * path[i + 1].lat - path[i + 1].lng * path[i].lat;
            }
            area = Math.abs(area / 2) * 111000 * 111000; // Convert to square meters (rough)

            // Save to workarea layer
      const attributes = {
        created_by: "PilotUser",
        timestamp: new Date().toISOString(),
      };

      try {
          await addFeatureToLayer(
            process.env.NEXT_PUBLIC_WORKAREA_LAYER_URL!,
            geometry,
            attributes
          );
              if (workAreasLayerRef.current) {
                workAreasLayerRef.current.refresh();
              }

              // Update polygon state
              if (onPolygonChange) {
                onPolygonChange(path, area);
              }

              // Store polygon layer for editing - KEEP IT ON THE MAP
              currentPolygonLayerRef.current = layer as L.Polygon;
              
              // Style the polygon to show it's saved
              (layer as L.Polygon).setStyle({
                color: "#0077ff",
                weight: 2,
                fillOpacity: 0.15,
              });

              showToast({
                title: "Work area saved",
                description: "Polygon saved to workarea layer",
              });
              
              // Mark that drawing is complete and work area is saved
              isDrawingWorkAreaRef.current = false;
              hasActiveWorkAreaRef.current = false;
              drawingSessionActiveRef.current = false;
              
              console.log("🎉 Work area saved — drawing session should now be OFF", {
                drawingSessionActive: drawingSessionActiveRef.current,
                hasActiveWorkArea: hasActiveWorkAreaRef.current,
              });
              
              // Full kill switch
              console.log("🛑 Disabling draw");
              map.pm.disableDraw();
              map.pm.disableGlobalEditMode();
              map.pm.disableGlobalRemovalMode();
              
              // 🔥 FINAL FIX - close the UI loop
              // Note: setEnableWorkAreaDrawing would need to be a callback prop from parent
              // For now, the refs are reset and the effect will handle cleanup when prop changes
              
              // reset refs
              drawingSessionActiveRef.current = false;
              hasActiveWorkAreaRef.current = false;
              
              console.log("🎉 Work area saved — draw permanently off");
            } catch (err: any) {
              console.error("Error saving work area:", err);
              let errorMessage = "Could not save to workarea layer";
              
              // Check for specific error types
              if (err?.code === 403 || err?.message?.includes("403") || err?.message?.includes("permissions")) {
                errorMessage = "Permission denied. Please check your ArcGIS API key has edit permissions for the workarea layer.";
              } else if (err?.code === 401 || err?.message?.includes("401")) {
                errorMessage = "Authentication failed. Please check your ArcGIS API key.";
              } else if (err?.message) {
                errorMessage = err.message;
              }
              
              showToast({
                title: "Failed to save work area",
                description: errorMessage,
                variant: "destructive",
              });
              map.removeLayer(layer);
              
              // Mark that drawing is complete even on error
              isDrawingWorkAreaRef.current = false;
              hasActiveWorkAreaRef.current = false;
              drawingSessionActiveRef.current = false; // End drawing session
            }
          };

          // Handle record drawing (points, lines, polygons)
          const handleRecordDrawing = async (e: any) => {
            console.log("🎯 handleRecordDrawing called", {
              isDrawingWorkArea: isDrawingWorkAreaRef.current,
              georefMode: georefModeRef.current,
            });
            
            if (isDrawingWorkAreaRef.current) {
              console.log("⏭️ Skipping - work area drawing is active");
              return; // Don't handle if we're drawing work area
            }
            if (georefModeRef.current === "none") {
              console.log("⏭️ Skipping - georefMode is none");
              return; // Only handle when in georef mode
            }

            const layer = e.layer;
            const geojson = layer.toGeoJSON();
            const geometry = geojson.geometry;
            const type = geometry.type;

            isDrawingRecordRef.current = true;

            // Check if this matches the current georef mode
            const currentGeorefMode = georefModeRef.current;
            console.log("🔍 Checking geometry type match:", {
              currentGeorefMode,
              geometryType: type,
            });
            
            if (currentGeorefMode === "point" && type !== "Point") {
              console.log("❌ Geometry type mismatch - removing layer");
              map.removeLayer(layer);
              isDrawingRecordRef.current = false;
              return;
            }
            if (currentGeorefMode === "line" && type !== "LineString") {
              console.log("❌ Geometry type mismatch - removing layer");
              map.removeLayer(layer);
              isDrawingRecordRef.current = false;
              return;
            }
            if (currentGeorefMode === "polygon" && type !== "Polygon") {
              console.log("❌ Geometry type mismatch - removing layer");
              map.removeLayer(layer);
              isDrawingRecordRef.current = false;
              return;
            }
            
            console.log("✅ Geometry type matches - proceeding with record save");

            try {
              // Apply APWA color styling based on georefColor or utility type
              const color = georefColor || getApwaColor(undefined);
              console.log("🎨 Applying color:", color, "georefColor:", georefColor);
              
              if (type === "LineString" || type === "Polygon") {
                (layer as L.Polyline | L.Polygon).setStyle({
                  color: color,
                  fillColor: type === "Polygon" ? color : undefined,
                  weight: type === "LineString" ? 3 : 2,
                  opacity: 1,
                  fillOpacity: type === "Polygon" ? 0.5 : undefined,
                });
                console.log("✅ Applied styling to", type);
              } else if (type === "Point") {
                (layer as L.Marker).setIcon(
                  L.divIcon({
                    className: "custom-marker",
                    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
                    iconSize: [20, 20],
                  })
                );
                console.log("✅ Applied icon to Point");
              }

              // Convert to appropriate format
              let result: { type: "Point"; point: LatLng } | { type: "LineString" | "Polygon"; path: LatLng[] };

              if (type === "Point") {
                const point: LatLng = {
                  lat: geometry.coordinates[1],
                  lng: geometry.coordinates[0],
                };
                result = { type: "Point", point };
                console.log("✅ Converted Point geometry");

                // Save to ArcGIS with metadata BEFORE calling onGeorefComplete
                if (pendingRecordMetadataRef.current) {
                  // Merge metadata with the Esri attributes
                  const metadata = pendingRecordMetadataRef.current;
                  const attributes = {
                    utility_type: metadata.utility_type ?? null,
                    record_type: metadata.record_type ?? null,
                    organization: metadata.organization ?? null,
                    notes: metadata.notes ?? null,
                    file_url: metadata.file_url ?? null,
                    record_id: metadata.record_id ?? null,
                    source: metadata.source ?? null,
                    processed_date: metadata.processed_date ?? null,
                    Creator: metadata.Creator ?? null,
                    geometry_type: "Point",
                  };

                  console.log("🟦 Saving record with attributes:", attributes);

                  // Convert geometry to GeoJSON format for ArcGIS
                  const esriGeometry = {
                    type: "Point",
                    coordinates: [point.lng, point.lat],
                  };

                  const recordsLayerUrl = getRecordsLayerUrl("Point");
                  
                  if (recordsLayerUrl) {
                    try {
                      await addFeatureToLayer(recordsLayerUrl, esriGeometry, attributes);
                      console.log("✅ Record saved to ArcGIS successfully");
                      recordSavedToArcGISRef.current = true;
                    } catch (err) {
                      console.error("❌ Error saving record to ArcGIS:", err);
                      // Continue anyway - still call onGeorefComplete for UI
                    }
                  } else {
                    console.error("❌ No target layer URL found for geometry: Point");
                  }
                } else {
                  console.warn("⚠️ No pendingRecordMetadata - skipping ArcGIS save");
                }

                // Call the callback to update the UI
                console.log("📞 Calling onGeorefComplete for Point");
                if (onGeorefComplete) {
                  onGeorefComplete(result, { utilityType: undefined }); // Will be set by upload-tab
                  console.log("✅ onGeorefComplete called for Point");
                } else {
                  console.log("⚠️ onGeorefComplete is not defined!");
                }
              } else if (type === "LineString" || type === "Polygon") {
                const coordinates = type === "LineString" 
                  ? geometry.coordinates 
                  : geometry.coordinates[0]; // First ring for polygon
                const path: LatLng[] = coordinates.map((coord: number[]) => ({
                  lat: coord[1],
                  lng: coord[0],
                }));

                result = { type: type as "LineString" | "Polygon", path };
                console.log("✅ Converted", type, "geometry, path length:", path.length);

                // Save to ArcGIS with metadata BEFORE calling onGeorefComplete
                if (pendingRecordMetadataRef.current) {
                  // Merge metadata with the Esri attributes
                  const metadata = pendingRecordMetadataRef.current;
                  const attributes = {
                    utility_type: metadata.utility_type ?? null,
                    record_type: metadata.record_type ?? null,
                    organization: metadata.organization ?? null,
                    notes: metadata.notes ?? null,
                    file_url: metadata.file_url ?? null,
                    record_id: metadata.record_id ?? null,
                    source: metadata.source ?? null,
                    processed_date: metadata.processed_date ?? null,
                    Creator: metadata.Creator ?? null,
                    geometry_type: type,
                  };

                  console.log("🟦 Saving record with attributes:", attributes);

                  // Convert geometry to GeoJSON format for ArcGIS
                  const esriGeometry = {
                    type: type,
                    coordinates: type === "LineString" 
                      ? path.map((p) => [p.lng, p.lat])
                      : [path.map((p) => [p.lng, p.lat])], // Polygon needs nested array
                  };

                  // Determine geometry type for routing
                  const geometryType = type === "LineString" ? "Line" : "Polygon";
                  const recordsLayerUrl = getRecordsLayerUrl(geometryType);
                  
                  if (recordsLayerUrl) {
                    try {
                      await addFeatureToLayer(recordsLayerUrl, esriGeometry, attributes);
                      console.log("✅ Record saved to ArcGIS successfully");
                      recordSavedToArcGISRef.current = true;
                    } catch (err) {
                      console.error("❌ Error saving record to ArcGIS:", err);
                      // Continue anyway - still call onGeorefComplete for UI
                    }
                  } else {
                    console.error(`❌ No target layer URL found for geometry: ${geometryType}`);
                  }
                } else {
                  console.warn("⚠️ No pendingRecordMetadata - skipping ArcGIS save");
                }

                // Call the callback to update the UI
                console.log("📞 Calling onGeorefComplete for", type, "with path length:", path.length);
                if (onGeorefComplete) {
                  onGeorefComplete(result, { utilityType: undefined }); // Will be set by upload-tab
                  console.log("✅ onGeorefComplete called for", type);
                } else {
                  console.log("⚠️ onGeorefComplete is not defined!");
                }
              }
            } catch (error: any) {
              console.error("❌ Error in handleRecordDrawing:", error);
              throw error;
            }

            // Store georef layer
            currentGeorefLayerRef.current = layer;

            // Don't remove the layer immediately - let it stay visible until the record is in state
            // The layer will be replaced by the proper record rendering from bubbles/shapes
            // Remove it after a short delay to allow state update to trigger re-render
            setTimeout(() => {
              if (map.hasLayer(layer)) {
                map.removeLayer(layer);
              }
            }, 100);
            
            isDrawingRecordRef.current = false;
            
            // Reset the save flag for next drawing session
            setTimeout(() => {
              recordSavedToArcGISRef.current = false;
            }, 1000);
          };

          // Handle point picking for georeferencing
          const handleMapClick = (e: L.LeafletMouseEvent) => {
            if (pickPointActive && georefMode === "point") {
              const point: LatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
              const result = { type: "Point" as const, point };

              // Don't save here - let upload-tab.tsx save with file URLs
              // Just call the callback to update the UI
              if (onGeorefComplete) {
                onGeorefComplete(result, { utilityType: undefined }); // Will be set by upload-tab
              }
            }
          };

          // Set up event listeners and draw features - wait for everything to be ready
          setTimeout(() => {
            try {
              // Set up global function to generate signed URLs for file links
              // This is called when user clicks "Open PDF" link in popup
              (window as any).generateSignedUrl = async (filePath: string, linkElement: HTMLElement) => {
                try {
                  // Show loading state
                  linkElement.textContent = "⏳ Generating link...";
                  linkElement.style.pointerEvents = "none";
                  
                  // Generate fresh signed URL
                  const signedUrl = await getSignedUrl(filePath, 3600); // Valid for 1 hour
                  
                  // Update link to open the signed URL
                  linkElement.setAttribute("href", signedUrl);
                  linkElement.setAttribute("target", "_blank");
                  linkElement.setAttribute("rel", "noopener noreferrer");
                  linkElement.textContent = "📄 Open PDF";
                  linkElement.style.pointerEvents = "auto";
                  
                  // Open in new tab
                  window.open(signedUrl, "_blank");
                } catch (error: any) {
                  console.error("Error generating signed URL:", error);
                  linkElement.textContent = "❌ Error loading file";
                  linkElement.style.color = "#ff0000";
                  alert(`Failed to generate file link: ${error.message}`);
                }
              };

              // Set up event listeners
              if (mode === "draw") {
                // Listen for polygon creation (work area)
                map.on("pm:create", (e: any) => {
                  const geojson = e.layer.toGeoJSON();
                  const geometry = geojson.geometry;

                  // Determine if this is work area or record
                  // PRIORITY: Check record drawing mode FIRST (georefMode), then work area
                  // Use refs to get current values, not captured closure values
                  console.log("🔍 pm:create event - routing decision:", {
                    geometryType: geometry.type,
                    georefMode: georefModeRef.current,
                    enableWorkAreaDrawing: enableWorkAreaDrawingRef.current,
                  });
                  
                  if (georefModeRef.current !== "none") {
                    // Record drawing mode is active - route to record handler
                    console.log("✅ Routing to handleRecordDrawing");
                    handleRecordDrawing(e);
                  } else if (enableWorkAreaDrawingRef.current && geometry.type === "Polygon") {
                    // Work area drawing mode is active - route to work area handler
                    console.log("✅ Routing to handleWorkAreaDrawing");
                    handleWorkAreaDrawing(e);
                  } else {
                    console.log("⚠️ No handler matched - geometry type:", geometry.type);
                  }
                });

                // Listen for map clicks (point picking)
                if (pickPointActive) {
                  map.on("click", handleMapClick);
                }
              }

              // Polygon will be handled by separate useEffect to avoid re-initialization

              // Bubbles and shapes will be handled by separate useEffect to react to prop changes
            } catch (err) {
              console.error("Error setting up event listeners and drawing features:", err);
            }
          }, 500);
        }, 100);
      });
    }

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Empty dependency array - runs once on mount

  // Separate effect to handle zoom to feature updates without re-initializing the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Add delay to ensure Map Pane is initialized
    setTimeout(() => {
      try {
        // Ensure map pane is ready
        if (!map.getPane('mapPane') || !map.getContainer()) {
          console.warn("Map not ready for zoom, skipping...");
          return;
        }
        
        if (zoomToFeature?.geometry) {
          zoomToEsriFeature(map, zoomToFeature);
        } else if (zoomToFeature && !zoomToFeature.geometry) {
          console.warn("Skipping zoom — feature missing geometry:", zoomToFeature);
        }
      } catch (err) {
        console.error("Error zooming to feature:", err);
      }
    }, 400);
  }, [zoomToFeature]);

  // Separate effect to handle focusPoint/focusZoom updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (focusPoint) {
      map.setView([focusPoint.lat, focusPoint.lng], focusZoom);
    }
  }, [focusPoint, focusZoom]);

  // Separate effect to handle enableDrop/onDropFilesAt
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const mapContainer = document.getElementById("map");
    if (!mapContainer) return;

    if (enableDrop && onDropFilesAt) {
      const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer?.files) {
          const files = Array.from(e.dataTransfer.files);
          const latlng = map.mouseEventToLatLng(e as any);
          onDropFilesAt({ lat: latlng.lat, lng: latlng.lng }, files);
        }
      };

      const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
      };

      mapContainer.addEventListener("drop", handleDrop);
      mapContainer.addEventListener("dragover", handleDragOver);

      return () => {
        mapContainer.removeEventListener("drop", handleDrop);
        mapContainer.removeEventListener("dragover", handleDragOver);
      };
    }
  }, [enableDrop, onDropFilesAt]);

  // Separate effect to handle polygon updates without re-initializing the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing polygon layer if it exists
    if (currentPolygonLayerRef.current) {
      map.removeLayer(currentPolygonLayerRef.current);
      currentPolygonLayerRef.current = null;
    }

    // Add new polygon if provided
    if (polygon && polygon.length >= 3) {
      const latlngs = polygon.map((p) => [p.lat, p.lng] as [number, number]);
      const poly = L.polygon(latlngs, {
        color: "#0077ff",
        weight: 2,
        fillOpacity: 0.15,
      }).addTo(map);
      currentPolygonLayerRef.current = poly;
    }
  }, [polygon]);

  // Update refs whenever props change (for event listener)
  useEffect(() => {
    enableWorkAreaDrawingRef.current = enableWorkAreaDrawing;
  }, [enableWorkAreaDrawing]);

  useEffect(() => {
    georefModeRef.current = georefMode;
  }, [georefMode]);

  useEffect(() => {
    pendingRecordMetadataRef.current = pendingRecordMetadata;
  }, [pendingRecordMetadata]);

  // 🔒 Never auto-enable draw mode from React re-render.
  // Only turn ON drawing when the user clicks the button.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // If user clicked the UI toggle ON:
    if (enableWorkAreaDrawing === true) {
      // Only start drawing if not already active and no work area was just completed
      if (drawingSessionActiveRef.current === false && hasActiveWorkAreaRef.current === false) {
        console.log("✏️ User-initiated draw mode ON");
        map.pm.enableDraw("Polygon");
        drawingSessionActiveRef.current = true;
        hasActiveWorkAreaRef.current = true;
      }
    }

    // If user turned off draw mode (or a polygon was saved):
    if (enableWorkAreaDrawing === false) {
      console.log("🛑 React disabling draw mode");
      map.pm.disableDraw();
      drawingSessionActiveRef.current = false;
      hasActiveWorkAreaRef.current = false;
    }
  }, [enableWorkAreaDrawing]);

  // 🎯 Record drawing mode - controlled by shouldStartRecordDraw command token
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Only trigger if georefMode is active and command token is set
    if (shouldStartRecordDraw > 0 && georefMode !== "none") {
      console.log("✏️ Starting RECORD draw mode:", georefMode);

      // Disable any active work area draw
      map.pm.disableDraw();
      map.pm.disableGlobalEditMode();
      map.pm.disableGlobalRemovalMode();

      // Ensure controls are set up (Edit/Erase only, no draw buttons)
      try {
        map.pm.removeControls();
      } catch (e) {
        // Controls might not exist, that's fine
      }
      
      map.pm.addControls({
        position: "topleft",
        drawMarker: false,
        drawPolyline: false,
        drawPolygon: false,
        drawRectangle: false,
        drawCircle: false,
        drawCircleMarker: false,
        editMode: true,      // ✏️ enable edit mode (move / edit vertices)
        dragMode: false,
        cutPolygon: false,
        removalMode: true,   // 🗑️ allows erase/delete
        oneBlock: true,      // groups icons into one compact block
      });

      // Enable appropriate PM draw mode based on georefMode
      if (georefMode === "point") {
        map.pm.enableDraw("Marker", { snappable: true });
      } else if (georefMode === "line") {
        map.pm.enableDraw("Line", { snappable: true });
      } else if (georefMode === "polygon") {
        map.pm.enableDraw("Polygon", { snappable: true });
      }
    }
  }, [shouldStartRecordDraw, georefMode]);

  // Update drawing controls when georefMode changes (setup controls only, no auto-enable)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== "draw") return;

    // Only setup controls, do NOT auto-enable draw mode
    // Draw mode is now controlled exclusively by shouldStartRecordDraw command token
    try {
      map.pm.removeControls();
    } catch (e) {
      // Controls might not exist, that's fine
    }

    // Always show Edit/Erase controls for professional cleanup
    map.pm.addControls({
      position: "topleft",
      drawMarker: false,
      drawPolyline: false,
      drawPolygon: false,
      drawRectangle: false,
      drawCircle: false,
      drawCircleMarker: false,
      editMode: true,      // ✏️ enable edit mode (move / edit vertices)
      dragMode: false,
      cutPolygon: false,
      removalMode: true,   // 🗑️ allows erase/delete
      oneBlock: true,      // groups icons into one compact block
    });

    // Disable drawing when edit mode is enabled to prevent overlap
    const handleEditModeToggle = (e: any) => {
      if (e.enabled) {
        map.pm.disableDraw();
      }
    };
    map.on("pm:globaleditmodetoggled", handleEditModeToggle);

    // Cleanup: remove event listener on unmount
    return () => {
      map.off("pm:globaleditmodetoggled", handleEditModeToggle);
    };
  }, [mode, georefMode]);

  // Handle work area selection mode changes
  useEffect(() => {
    const map = mapRef.current;
    const workAreas = workAreasLayerRef.current;
    if (!map || !workAreas) return;

    const handleWorkAreaClick = (e: any) => {
      if (!enableWorkAreaSelection || !onWorkAreaSelected) return;

      const feature = e.layer.feature;
      const geometry = getFeatureGeometry(feature);
      if (!geometry) return;
      if (geometry.type !== "Polygon" || !geometry.rings || !geometry.rings[0]) return;

      // Convert ArcGIS rings to LatLng[]
      const coordinates = geometry.rings[0]; // First ring (exterior)
      const path: LatLng[] = coordinates.map((coord: number[]) => ({
        lat: coord[1],
        lng: coord[0],
      }));

      // Calculate area (rough approximation)
      let area = 0;
      for (let i = 0; i < path.length - 1; i++) {
        area += path[i].lng * path[i + 1].lat - path[i + 1].lng * path[i].lat;
      }
      area = Math.abs(area / 2) * 111000 * 111000; // Convert to square meters (rough)

      // Call the callback
      onWorkAreaSelected(path, area);

      if (typeof window !== "undefined" && (window as any).toast) {
        (window as any).toast({
          title: "Work area selected",
          description: "Selected work area from the map",
        });
      }
    };

    if (enableWorkAreaSelection) {
      workAreas.on("click", handleWorkAreaClick);
    } else {
      workAreas.off("click", handleWorkAreaClick);
    }

    return () => {
      workAreas.off("click", handleWorkAreaClick);
    };
  }, [enableWorkAreaSelection, onWorkAreaSelected]);

  // 🔄 Refresh bubbles and shapes whenever they change (reactive layer refresh with debouncing)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Debounce layer refresh to prevent "line disappears" bug and flicker
    const timer = setTimeout(() => {
      // Clear existing bubbles and shapes
      // Explicitly unbind popups before clearing to ensure clean state
      if (markersGroupRef.current) {
        markersGroupRef.current.eachLayer((layer: any) => {
          if (layer.unbindPopup) {
            layer.unbindPopup();
          }
        });
        markersGroupRef.current.clearLayers();
      }
      if (shapesGroupRef.current) {
        shapesGroupRef.current.eachLayer((layer: any) => {
          if (layer.unbindPopup) {
            layer.unbindPopup();
          }
        });
        shapesGroupRef.current.clearLayers();
      }

    // Draw bubbles (markers) with APWA colors
    if (markersGroupRef.current && bubbles.length > 0) {
      bubbles.forEach((bubble) => {
        // Extract utility type from recordTypePath (format: "UtilityType / RecordType")
        let utilityType: string | undefined;
        if (bubble.recordTypePath) {
          const parts = bubble.recordTypePath.split("/").map((p) => p.trim());
          utilityType = parts[0] || undefined;
        }
        const color = getApwaColor(utilityType);

        const marker = L.marker([bubble.position.lat, bubble.position.lng], {
          icon: L.divIcon({
            className: "custom-marker",
            html: `<div style="background-color: ${color}; width: ${bubble.size || 20}px; height: ${bubble.size || 20}px; border-radius: 50%; border: 2px solid white;"></div>`,
            iconSize: [bubble.size || 20, bubble.size || 20],
          }),
        });
        
        // Format record ID from bubble ID (extract numeric part if available)
        const recordIdMatch = bubble.id.match(/\d+/);
        const recordId = recordIdMatch ? `R-${String(recordIdMatch[0]).padStart(5, '0')}` : bubble.id;
        
        // Handle file path/URL for bubbles (similar to ArcGIS records)
        // fileUrl may contain: full signed URL (legacy) OR storage path (new)
        // filePath may contain: just the filename/path within bucket
        let bubbleFilePath = bubble.filePath;
        const bubbleFileUrl = bubble.fileUrl;
        
        // If fileUrl is a storage path (contains "Records_Private/"), extract the path
        if (bubbleFileUrl && bubbleFileUrl.includes("Records_Private/")) {
          bubbleFilePath = bubbleFileUrl.replace("Records_Private/", "");
        } else if (bubbleFileUrl && !bubbleFileUrl.startsWith("http")) {
          // fileUrl is a path (not a URL)
          bubbleFilePath = bubbleFileUrl;
        }
        
        // Extract utility type and record type from recordTypePath for popup
        let utilityTypeForPopup: string | undefined;
        let recordTypeForPopup: string | undefined;
        if (bubble.recordTypePath) {
          const parts = bubble.recordTypePath.split("/").map((p) => p.trim());
          utilityTypeForPopup = parts[0] || undefined;
          recordTypeForPopup = parts[1] || undefined;
        }
        
        // Create popup using React component with fresh data
        const popupContent = renderReactPopup(
          <RecordPopup
            recordId={recordId}
            source={bubble.source || bubble.recordTypePath}
            processedDate={bubble.processedDate || bubble.uploadedAt}
            uploadedBy={bubble.uploadedBy}
            utilityType={utilityTypeForPopup}
            recordType={recordTypeForPopup}
            organization={bubble.orgName}
            filePath={bubbleFilePath}
            fileUrl={bubbleFileUrl && bubbleFileUrl.startsWith("http") ? bubbleFileUrl : undefined}
            onViewFile={async () => {
              if (bubbleFilePath) {
                try {
                  // Reconstruct signed URL from storage path
                  const signedUrl = await getSignedUrl(bubbleFilePath, 3600);
                  console.log("🔗 Signed URL (runtime):", signedUrl.substring(0, 50) + "...");
                  window.open(signedUrl, "_blank");
                } catch (error: any) {
                  console.error("Error generating signed URL:", error);
                  alert(`Failed to open file: ${error.message}`);
                }
              } else if (bubbleFileUrl && bubbleFileUrl.startsWith("http")) {
                // Legacy: full URL stored directly
                window.open(bubbleFileUrl, "_blank");
              }
            }}
            onDownload={async () => {
              if (bubbleFilePath) {
                try {
                  // Reconstruct signed URL from storage path
                  const signedUrl = await getSignedUrl(bubbleFilePath, 3600);
                  console.log("🔗 Signed URL (runtime):", signedUrl.substring(0, 50) + "...");
                  const link = document.createElement("a");
                  link.href = signedUrl;
                  link.download = bubble.fileName || "download";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } catch (error: any) {
                  console.error("Error generating signed URL:", error);
                  alert(`Failed to download file: ${error.message}`);
                }
              } else if (bubbleFileUrl && bubbleFileUrl.startsWith("http")) {
                // Legacy: full URL stored directly
                const link = document.createElement("a");
                link.href = bubbleFileUrl;
                link.download = bubble.fileName || "download";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }}
            onUploadedByClick={(name) => {
              // TODO: Implement user profile/view functionality
              console.log("View profile for:", name);
            }}
          />
        );
        
        // Bind popup before adding to map to ensure proper initialization
        marker.bindPopup(popupContent, {
          className: "custom-popup",
          maxWidth: 400,
        });
        markersGroupRef.current.addLayer(marker);
        
        // Ensure popup is properly initialized (force Leaflet to recognize the popup)
        // This ensures new bubbles have working popups even after map stability improvements
        if (marker.getPopup) {
          marker.getPopup(); // Force popup initialization
        }
      });
    }

    // Draw shapes (lines and polygons) with APWA colors
    if (shapesGroupRef.current && shapes.length > 0) {
      shapes.forEach((shape) => {
        // Use provided colors or fallback to default
        const strokeColor = shape.strokeColor || getApwaColor(undefined);
        const fillColor = shape.fillColor || strokeColor;

        if (shape.type === "LineString") {
          const latlngs = shape.path.map((p) => [p.lat, p.lng] as [number, number]);
          const line = L.polyline(latlngs, {
            color: strokeColor,
            weight: 3,
            opacity: 1,
          });
          line.bindPopup(`<b>${shape.title}</b><br>${shape.description}`);
          shapesGroupRef.current.addLayer(line);
        } else if (shape.type === "Polygon") {
          const latlngs = shape.path.map((p) => [p.lat, p.lng] as [number, number]);
          const poly = L.polygon(latlngs, {
            color: strokeColor,
            fillColor: fillColor,
            weight: 2,
            opacity: 1,
            fillOpacity: 0.5,
          });
          poly.bindPopup(`<b>${shape.title}</b><br>${shape.description}`);
          shapesGroupRef.current.addLayer(poly);
        }
      });
    }
    }, 250); // Short delay prevents flicker on new draw and "line disappears" bug

    return () => clearTimeout(timer);
  }, [bubbles, shapes]);

  // Note: Initial render race condition is now handled by the debounced effect above
  // The 250ms delay ensures both React and Leaflet are ready before rendering

  // 🔄 Refresh ArcGIS records layers when needed (triggered by external refresh calls)
  useEffect(() => {
    // Refresh all three record layers
    const layers = [
      recordsPointLayerRef.current,
      recordsLineLayerRef.current,
      recordsPolygonLayerRef.current,
    ].filter(Boolean);
    
    layers.forEach((layer) => {
      if (layer) {
        try {
          layer.refresh();
        } catch (err) {
          console.warn("Could not refresh records layer:", err);
        }
      }
    });
  }, [bubbles.length, shapes.length]); // Refresh when record count changes

  // 🔍 Sanity check: Log when record layers successfully bind (for debugging)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const bubbleCount = bubbles.length;
      const shapeCount = shapes.length;
      
      if (bubbleCount > 0 || shapeCount > 0) {
        console.log(`✅ Map layers bound: ${bubbleCount} bubbles, ${shapeCount} shapes`);
        
        // Log utility type distribution for debugging
        const utilityTypes = new Map<string, number>();
        bubbles.forEach((bubble) => {
          if (bubble.recordTypePath) {
            const parts = bubble.recordTypePath.split("/").map((p) => p.trim());
            const utilityType = parts[0] || "unknown";
            utilityTypes.set(utilityType, (utilityTypes.get(utilityType) || 0) + 1);
          }
        });
        
        if (utilityTypes.size > 0) {
          console.log("📊 Utility type distribution:", Object.fromEntries(utilityTypes));
        }
      }
    }
  }, [bubbles, shapes]);

  // Cleanup effect for proper map teardown on hot reloads
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.off();
          mapRef.current.remove();
        } catch (err) {
          console.warn("Error during map cleanup:", err);
        }
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      id="map"
      className="w-full h-full rounded-2xl overflow-hidden shadow-md border border-gray-200"
      />
  );
}
