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
import { getSignedUrl, supabase } from "@/lib/supabase";
import type { LatLng } from "@/lib/record-types";
import type { GeorefMode } from "@/lib/types";
import type { MapBubble, GeorefShape } from "@/components/map-with-drawing";
import { WorkAreaPopup } from "@/components/WorkAreaPopup";
import { RecordPopup } from "@/components/RecordPopup";

// Test Supabase initialization
if (typeof window !== "undefined") {
  console.log("✅ Supabase test:", supabase ? "Initialized" : "Not initialized");
  if (supabase) {
    console.log("   - Has auth:", !!supabase.auth);
    console.log("   - Has storage:", !!supabase.storage);
  }
}

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
};

export default function EsriMap({
  mode = "draw",
  polygon,
  onPolygonChange,
  enableWorkAreaDrawing = false,
  enableWorkAreaSelection = false,
  onWorkAreaSelected,
  georefMode = "none",
  georefColor,
  onGeorefComplete,
  pickPointActive = false,
  pickZoom = 16,
  bubbles = [],
  shapes = [],
  enableDrop = false,
  onDropFilesAt,
  focusPoint,
  focusZoom = 16,
  center,
  zoom,
}: EsriMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const workAreasLayerRef = useRef<any>(null);
  const recordsLayerRefInternal = useRef<any>(null);
  const currentPolygonLayerRef = useRef<L.Polygon | null>(null);
  const currentGeorefLayerRef = useRef<L.Layer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const shapesGroupRef = useRef<L.LayerGroup | null>(null);
  const isDrawingWorkAreaRef = useRef(false);
  const isDrawingRecordRef = useRef(false);
  const toastRef = useRef<any>(null);

  useEffect(() => {
    // Get toast function - we'll use a ref to avoid calling useToast in useEffect
    const showToast = (options: any) => {
      // We'll use a simple approach - try to get toast from window or use console
      if (typeof window !== "undefined" && (window as any).toast) {
        (window as any).toast(options);
      } else {
        console.log("Toast:", options.title, options.description);
      }
    };
    
    // Check if container exists
    const mapContainer = document.getElementById("map");
    if (!mapContainer) {
      console.error("Map container not found");
      return;
    }

    // Don't initialize if map already exists
    if (mapRef.current) {
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
      // Initialize map
      const map = L.map("map", {
        center: center ? [center.lat, center.lng] : [43.7, -79.4], // Toronto default
        zoom: zoom || 12,
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

          // Define basemap layers (using basemapLayer for now - deprecation warning is acceptable)
    const basemaps: Record<string, L.TileLayer> = {
        Imagery: EL.basemapLayer("Imagery", {
        apikey: process.env.NEXT_PUBLIC_ARCGIS_API_KEY!,
        }),
        Streets: EL.basemapLayer("Streets", {
        apikey: process.env.NEXT_PUBLIC_ARCGIS_API_KEY!,
        }),
        Topographic: EL.basemapLayer("Topographic", {
        apikey: process.env.NEXT_PUBLIC_ARCGIS_API_KEY!,
        }),
    };
  
          // Add default basemap - wait a bit more to ensure panes are ready
          setTimeout(() => {
            try {
              if (map.getPane('tilePane') && map.getContainer()) {
                basemaps.Streets.addTo(map);
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

          // Add hosted Records layer - "records" layer
          // Wait longer to ensure map is fully stable
          setTimeout(() => {
            try {
              // Ensure map is fully ready and not in a transition
              if (!map.getPane('overlayPane') || !map.getContainer()) {
                console.warn("Map not ready for records layer");
                return;
              }
              
              // Wait for map to be fully loaded and stable
              // Check if map is in a transition state (if available)
              const isTransitioning = (map as any)._zoomTransitioning || false;
              
              if (isTransitioning) {
                // Wait for zoom to complete
                map.once('zoomend', () => {
                  setTimeout(() => addRecordsLayer(), 200);
                });
                return;
              }
              
              // Add a delay to ensure map is stable before adding layer
              setTimeout(() => addRecordsLayer(), 100);
              
              function addRecordsLayer() {
                try {
                  if (!map.getPane('overlayPane') || !map.getContainer()) {
                    console.warn("Map not ready for records layer (retry)");
                    return;
                  }
                  
    const records = EL.featureLayer({
      url: process.env.NEXT_PUBLIC_RECORDS_LAYER_URL!,
      apikey: process.env.NEXT_PUBLIC_ARCGIS_API_KEY!,
      pointToLayer: (_feature, latlng) =>
        L.circleMarker(latlng, { radius: 6, color: "#ff6600", fillOpacity: 0.8 }),
                    onEachFeature: (feature: any, layer: L.Layer) => {
                      const props = feature.properties || {};
                      
                      // Format record ID (use OBJECTID or record_id, format as R-XXXXX)
                      const recordId = props.record_id 
                        ? `R-${String(props.record_id).padStart(5, '0')}` 
                        : props.OBJECTID 
                        ? `R-${String(props.OBJECTID).padStart(5, '0')}` 
                        : undefined;
                      
                      // Format processed date
                      const processedDate = props.timestamp || props.processed_date || props.created_date || props.date;
                      
                      // Get file path/URL for download/view
                      const filePath = props.file_path || props.filePath;
                      const fileUrl = props.file_url || props.fileUrl;
                      
                      // Create popup content using React component
                      const popupContent = renderReactPopup(
                        <RecordPopup
                          recordId={recordId}
                          source={props.source || props.utility_type || props.record_type}
                          processedDate={processedDate}
                          uploadedBy={props.created_by || props.uploaded_by || props.createdBy}
                          filePath={filePath}
                          fileUrl={fileUrl}
                          onViewFile={async () => {
                            if (filePath) {
                              try {
                                const signedUrl = await getSignedUrl(filePath, 3600);
                                window.open(signedUrl, "_blank");
                              } catch (error: any) {
                                console.error("Error generating signed URL:", error);
                                alert(`Failed to open file: ${error.message}`);
                              }
                            } else if (fileUrl) {
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
                            } else if (fileUrl) {
                              const link = document.createElement("a");
                              link.href = fileUrl;
                              link.download = props.file_name || "download";
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
                      
                      layer.bindPopup(popupContent, {
          className: "custom-popup",
          maxWidth: 400,
        });
                    },
                  });
                  
                  // Add layer with error handling
                  try {
                    // Ensure map is still valid before adding
                    if (!map.getContainer() || !map.getPane('overlayPane')) {
                      console.warn("Map not ready, skipping records layer addition");
                      return;
                    }
                    
                    records.addTo(map);
                    recordsLayerRefInternal.current = records;
                    
                    // Add error handler for zoom transitions
                    map.on('zoomstart', () => {
                      // Prevent layer updates during zoom
                      if (recordsLayerRefInternal.current) {
                        try {
                          (recordsLayerRefInternal.current as any).disableEventPropagation?.();
                        } catch (e) {
                          // Ignore if method doesn't exist
                        }
                      }
                    });
                    
                  } catch (addErr) {
                    console.error("Error adding records layer to map:", addErr);
                  }
                } catch (layerErr) {
                  console.error("Error creating records layer:", layerErr);
                }
              }
            } catch (err) {
              console.error("Error adding records layer:", err);
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

          // Enable drawing controls based on mode - wait for map to be fully ready
          setTimeout(() => {
            try {
              if (mode === "draw" && map.getContainer() && map.getPane('mapPane')) {
                if (enableWorkAreaDrawing) {
                  // Add controls and enable polygon/rectangle drawing for work area
                  map.pm.addControls({
                    position: "topleft",
                    drawMarker: false, // Work areas are only polygons/rectangles
                    drawCircle: false, // Work areas are only polygons/rectangles
                    drawRectangle: true, // Enable rectangle drawing
                    drawPolyline: false, // Work areas are only polygons/rectangles
                    drawPolygon: true, // Enable polygon drawing
                    editMode: true,
                    dragMode: false,
                    cutPolygon: false,
                    removalMode: true,
                  });
                  
                  // Enable polygon drawing mode by default
                  map.pm.enableDraw("Polygon");
                } else if (georefMode !== "none") {
                  // Enable drawing controls for records based on geometry type
    map.pm.addControls({
        position: "topleft",
                    drawMarker: georefMode === "point",
                    drawCircle: false, // Records are only point, line, or polygon
                    drawRectangle: false, // Records are only point, line, or polygon
                    drawPolyline: georefMode === "line",
                    drawPolygon: georefMode === "polygon",
        editMode: true,
        dragMode: false,
        cutPolygon: false,
        removalMode: true,
        });

                  // Enable the appropriate drawing mode
                  if (georefMode === "point") {
                    map.pm.enableDraw("Marker");
                  } else if (georefMode === "line") {
                    map.pm.enableDraw("Line");
                  } else if (georefMode === "polygon") {
                    map.pm.enableDraw("Polygon");
                  }
                } else {
                  // Disable drawing and remove controls when not in any drawing mode
                  map.pm.disableDraw();
                  // Only remove controls if they exist (to avoid errors)
                  try {
                    map.pm.removeControls();
                  } catch (e) {
                    // Controls might not exist, that's fine
                  }
                }
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

            isDrawingWorkAreaRef.current = true;

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
              
              // Disable drawing mode after saving
              map.pm.disableDraw();
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
            }

            isDrawingWorkAreaRef.current = false;
          };

          // Handle record drawing (points, lines, polygons)
          const handleRecordDrawing = async (e: any) => {
            if (isDrawingWorkAreaRef.current) return; // Don't handle if we're drawing work area
            if (georefMode === "none") return; // Only handle when in georef mode

            const layer = e.layer;
            const geojson = layer.toGeoJSON();
            const geometry = geojson.geometry;
            const type = geometry.type;

            isDrawingRecordRef.current = true;

            // Check if this matches the current georef mode
            if (georefMode === "point" && type !== "Point") {
              map.removeLayer(layer);
              isDrawingRecordRef.current = false;
              return;
            }
            if (georefMode === "line" && type !== "LineString") {
              map.removeLayer(layer);
              isDrawingRecordRef.current = false;
              return;
            }
            if (georefMode === "polygon" && type !== "Polygon") {
              map.removeLayer(layer);
              isDrawingRecordRef.current = false;
              return;
            }

            // Convert to appropriate format
            let result: { type: "Point"; point: LatLng } | { type: "LineString" | "Polygon"; path: LatLng[] };

            if (type === "Point") {
              const point: LatLng = {
                lat: geometry.coordinates[1],
                lng: geometry.coordinates[0],
              };
              result = { type: "Point", point };

              // Don't save here - let upload-tab.tsx save with file URLs
              // Just call the callback to update the UI
              if (onGeorefComplete) {
                onGeorefComplete(result);
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

              // Don't save here - let upload-tab.tsx save with file URLs
              // Just call the callback to update the UI
              if (onGeorefComplete) {
                onGeorefComplete(result);
              }
            }

            // Store georef layer
            currentGeorefLayerRef.current = layer;

            map.removeLayer(layer); // Remove temporary drawing layer
            isDrawingRecordRef.current = false;
          };

          // Handle point picking for georeferencing
          const handleMapClick = (e: L.LeafletMouseEvent) => {
            if (pickPointActive && georefMode === "point") {
              const point: LatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
              const result = { type: "Point" as const, point };

              // Don't save here - let upload-tab.tsx save with file URLs
              // Just call the callback to update the UI
              if (onGeorefComplete) {
                onGeorefComplete(result);
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

                  // Determine if this is work area or record based on enableWorkAreaDrawing and georefMode
                  if (enableWorkAreaDrawing && geometry.type === "Polygon") {
                    handleWorkAreaDrawing(e);
                  } else if (georefMode !== "none") {
                    handleRecordDrawing(e);
                  }
                });

                // Listen for map clicks (point picking)
                if (pickPointActive) {
                  map.on("click", handleMapClick);
                }
              }

              // Polygon will be handled by separate useEffect to avoid re-initialization

              // Draw bubbles (markers) - only if markersGroup is ready
              if (markersGroupRef.current) {
                markersGroupRef.current.clearLayers();
                bubbles.forEach((bubble) => {
                  const marker = L.marker([bubble.position.lat, bubble.position.lng], {
                    icon: L.divIcon({
                      className: "custom-marker",
                      html: `<div style="background-color: #ff6600; width: ${bubble.size || 20}px; height: ${bubble.size || 20}px; border-radius: 50%; border: 2px solid white;"></div>`,
                      iconSize: [bubble.size || 20, bubble.size || 20],
                    }),
                  });
                  
                  // Format record ID from bubble ID (extract numeric part if available)
                  const recordIdMatch = bubble.id.match(/\d+/);
                  const recordId = recordIdMatch ? `R-${String(recordIdMatch[0]).padStart(5, '0')}` : bubble.id;
                  
                  // Create popup using React component with the same logic as existing records
                  const popupContent = renderReactPopup(
                    <RecordPopup
                      recordId={recordId}
                      source={bubble.source || bubble.recordTypePath}
                      processedDate={bubble.processedDate || bubble.uploadedAt}
                      uploadedBy={bubble.uploadedBy}
                      filePath={bubble.filePath}
                      fileUrl={bubble.fileUrl}
                      onViewFile={async () => {
                        if (bubble.filePath) {
                          try {
                            const signedUrl = await getSignedUrl(bubble.filePath, 3600);
                            window.open(signedUrl, "_blank");
                          } catch (error: any) {
                            console.error("Error generating signed URL:", error);
                            alert(`Failed to open file: ${error.message}`);
                          }
                        } else if (bubble.fileUrl) {
                          window.open(bubble.fileUrl, "_blank");
                        }
                      }}
                      onDownload={async () => {
                        if (bubble.filePath) {
                          try {
                            const signedUrl = await getSignedUrl(bubble.filePath, 3600);
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
                        } else if (bubble.fileUrl) {
                          const link = document.createElement("a");
                          link.href = bubble.fileUrl;
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
                  
                  marker.bindPopup(popupContent, {
                    className: "custom-popup",
                    maxWidth: 400,
                  });
                  markersGroupRef.current.addLayer(marker);
                });
              }

              // Draw shapes (lines and polygons) - only if shapesGroup is ready
              if (shapesGroupRef.current) {
                shapesGroupRef.current.clearLayers();
                shapes.forEach((shape) => {
                  if (shape.type === "LineString") {
                    const latlngs = shape.path.map((p) => [p.lat, p.lng] as [number, number]);
                    const line = L.polyline(latlngs, {
                      color: shape.strokeColor || "#ff6600",
                      weight: 3,
                    });
                    line.bindPopup(`<b>${shape.title}</b><br>${shape.description}`);
                    shapesGroupRef.current.addLayer(line);
                  } else if (shape.type === "Polygon") {
                    const latlngs = shape.path.map((p) => [p.lat, p.lng] as [number, number]);
                    const poly = L.polygon(latlngs, {
                      color: shape.strokeColor || "#ff6600",
                      fillColor: shape.fillColor || "#ff6600",
                      weight: 2,
                      fillOpacity: 0.2,
                    });
                    poly.bindPopup(`<b>${shape.title}</b><br>${shape.description}`);
                    shapesGroupRef.current.addLayer(poly);
                  }
                });
              }
            } catch (err) {
              console.error("Error setting up event listeners and drawing features:", err);
            }
          }, 500);

          // Focus on point if provided - wait for map to be ready
          setTimeout(() => {
            try {
              if (focusPoint && map.getContainer()) {
                map.setView([focusPoint.lat, focusPoint.lng], focusZoom);
              }
            } catch (err) {
              console.error("Error focusing on point:", err);
            }
          }, 600);

          // Handle file drops - wait for map to be ready
          setTimeout(() => {
            try {
              if (enableDrop && onDropFilesAt && map.getContainer()) {
                const handleDrop = (e: DragEvent) => {
                  e.preventDefault();
                  if (e.dataTransfer?.files) {
                    const files = Array.from(e.dataTransfer.files);
                    const latlng = map.mouseEventToLatLng(e as any);
                    onDropFilesAt({ lat: latlng.lat, lng: latlng.lng }, files);
                  }
                };

                const mapContainer = document.getElementById("map");
                if (mapContainer) {
                  mapContainer.addEventListener("drop", handleDrop);
                  mapContainer.addEventListener("dragover", (e) => e.preventDefault());
                }
              }
      } catch (err) {
              console.error("Error setting up file drop handlers:", err);
            }
          }, 600);
        }); // Close setTimeout
      }); // Close whenReady callback
    } // Close initializeMap function

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [
    mode,
    onPolygonChange,
    enableWorkAreaDrawing,
    enableWorkAreaSelection,
    onWorkAreaSelected,
    georefMode,
    georefColor,
    onGeorefComplete,
    pickPointActive,
    bubbles,
    shapes,
    enableDrop,
    onDropFilesAt,
    focusPoint,
    focusZoom,
    center,
    zoom,
  ]);

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

  // Update drawing controls when georefMode changes (without re-initializing map)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== "draw") return;

    // Remove existing controls first
    try {
      map.pm.disableDraw();
      map.pm.removeControls();
    } catch (e) {
      // Controls might not exist, that's fine
    }

    // Enable drawing controls based on mode
    if (enableWorkAreaDrawing) {
      // Add controls and enable polygon/rectangle drawing for work area
      map.pm.addControls({
        position: "topleft",
        drawMarker: false, // Work areas are only polygons/rectangles
        drawCircle: false, // Work areas are only polygons/rectangles
        drawRectangle: true, // Enable rectangle drawing
        drawPolyline: false, // Work areas are only polygons/rectangles
        drawPolygon: true, // Enable polygon drawing
        editMode: true,
        dragMode: false,
        cutPolygon: false,
        removalMode: true,
      });
      map.pm.enableDraw("Polygon"); // Enable polygon drawing mode by default
    } else if (georefMode !== "none") {
      // Enable drawing controls for records based on geometry type
      map.pm.addControls({
        position: "topleft",
        drawMarker: georefMode === "point",
        drawCircle: false, // Records are only point, line, or polygon
        drawRectangle: false, // Records are only point, line, or polygon
        drawPolyline: georefMode === "line",
        drawPolygon: georefMode === "polygon",
        editMode: true,
        dragMode: false,
        cutPolygon: false,
        removalMode: true,
      });
      
      // Enable the appropriate drawing mode
      if (georefMode === "point") {
        map.pm.enableDraw("Marker");
      } else if (georefMode === "line") {
        map.pm.enableDraw("Line");
      } else if (georefMode === "polygon") {
        map.pm.enableDraw("Polygon");
      }
    }
  }, [mode, enableWorkAreaDrawing, georefMode]);

  // Handle work area selection mode changes
  useEffect(() => {
    const map = mapRef.current;
    const workAreas = workAreasLayerRef.current;
    if (!map || !workAreas) return;

    const handleWorkAreaClick = (e: any) => {
      if (!enableWorkAreaSelection || !onWorkAreaSelected) return;

      const feature = e.layer.feature;
      if (!feature || !feature.geometry) return;

      const geometry = feature.geometry;
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

  return (
    <div
      id="map"
      className="w-full h-full rounded-2xl overflow-hidden shadow-md border border-gray-200"
      />
  );
}
