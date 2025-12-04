"use client";

import React, { useEffect, useRef, useState, memo, useCallback } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

import * as EL from "esri-leaflet";
import { useToast } from "@/hooks/use-toast";
import { getRecordsLayerUrl } from "@/lib/getRecordsLayerUrl";
import { WORKAREA_URL, RECORDS_POINT_URL, RECORDS_LINE_URL, RECORDS_POLYGON_URL } from "@/lib/esriLayers";
import { saveWorkArea } from "@/lib/arcgis/saveWorkArea";
import { saveRecordPoint } from "@/lib/esri/saveRecordPoint";
import { saveRecordLine } from "@/lib/esri/saveRecordLine";
import { saveRecordPolygon } from "@/lib/esri/saveRecordPolygon";
import { getSignedUrl, getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { LatLng } from "@/lib/record-types";
import type { GeorefMode } from "@/lib/types";
import type { MapBubble, GeorefShape } from "@/components/map-with-drawing";
import { WorkAreaPopup } from "@/components/WorkAreaPopup";
import { RecordPopup } from "@/components/RecordPopup";
import { RecordDetailDrawer } from "@/components/RecordDetailDrawer";
import { getApwaColor } from "@/lib/apwaColors";
import { getFeatureGeometry } from "@/lib/geoUtils";
import { zoomToEsriFeature } from "@/lib/zoomToFeature";
import Legend from "@/components/map/Legend";
import BasemapToggle from "@/components/map/BasemapToggle";
import { MapProvider } from "@/contexts/MapContext";
import {
  ACTIVE_WORK_AREA_STYLE,
  setActiveWorkArea,
  setInactiveWorkArea,
  WORK_AREA_PANE,
  ACTIVE_WORK_AREA_PANE,
} from "@/helpers/workAreaStyles";
import { useMapToolbarContext } from "@/components/map/MapToolbarContext";

// Note: Supabase client initialization is handled via singleton pattern in lib/supabase-client.ts
// This prevents multiple GoTrueClient instances and eliminates duplication warnings

declare module "leaflet" {
  interface Map {
    pm: any;
  }
}

// Helper function to safely disable Geoman global modes
// Prevents "wrong listener type: undefined" errors
function safelyDisableGeomanModes(map: L.Map) {
  if (!map || !map.pm) return;
  
  try {
    // Check if global edit mode is enabled before disabling
    const isEditModeEnabled = map.pm.globalEditModeEnabled?.() || false;
    if (isEditModeEnabled && typeof map.pm.disableGlobalEditMode === 'function') {
      map.pm.disableGlobalEditMode();
    }
  } catch (e) {
    // Silently ignore - mode might not be active or already disabled
  }
  
  try {
    // Check if global removal mode is enabled before disabling
    const isRemovalModeEnabled = map.pm.globalRemovalModeEnabled?.() || false;
    if (isRemovalModeEnabled && typeof map.pm.disableGlobalRemovalMode === 'function') {
      map.pm.disableGlobalRemovalMode();
    }
  } catch (e) {
    // Silently ignore - mode might not be active or already disabled
  }
}

// Helper function to render React component to DOM element for Leaflet popup
function renderReactPopup(component: React.ReactElement): HTMLElement {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    // Return a dummy div during SSR
    return document?.createElement("div") || {} as HTMLElement;
  }
  const div = document.createElement("div");
  const root = createRoot(div);
  root.render(component);
  return div;
}

// Helper function to compute centroid from GeoJSON geometry
function getCentroidFromGeometry(geometry: any): [number, number] | null {
  if (!geometry) return null;

  try {
    // Handle Point
    if (geometry.type === "Point" && geometry.coordinates) {
      return [geometry.coordinates[1], geometry.coordinates[0]]; // [lat, lng]
    }

    // Handle LineString
    if (geometry.type === "LineString" && geometry.coordinates && geometry.coordinates.length > 0) {
      const coords = geometry.coordinates;
      const sum = coords.reduce(
        (acc: [number, number], coord: [number, number]) => [acc[0] + coord[1], acc[1] + coord[0]],
        [0, 0]
      );
      return [sum[0] / coords.length, sum[1] / coords.length];
    }

    // Handle Polygon (use first ring)
    if (geometry.type === "Polygon" && geometry.coordinates && geometry.coordinates[0]) {
      const ring = geometry.coordinates[0];
      const sum = ring.reduce(
        (acc: [number, number], coord: [number, number]) => [acc[0] + coord[1], acc[1] + coord[0]],
        [0, 0]
      );
      return [sum[0] / ring.length, sum[1] / ring.length];
    }

    // Handle ArcGIS format (x, y)
    if (geometry.x !== undefined && geometry.y !== undefined) {
      return [geometry.y, geometry.x]; // [lat, lng]
    }

    // Handle ArcGIS paths (polyline)
    if (geometry.paths && geometry.paths[0]) {
      const path = geometry.paths[0];
      const sum = path.reduce(
        (acc: [number, number], coord: [number, number]) => [acc[0] + coord[1], acc[1] + coord[0]],
        [0, 0]
      );
      return [sum[0] / path.length, sum[1] / path.length];
    }

    // Handle ArcGIS rings (polygon)
    if (geometry.rings && geometry.rings[0]) {
      const ring = geometry.rings[0];
      const sum = ring.reduce(
        (acc: [number, number], coord: [number, number]) => [acc[0] + coord[1], acc[1] + coord[0]],
        [0, 0]
      );
      return [sum[0] / ring.length, sum[1] / ring.length];
    }
  } catch (error) {
    console.warn("Error computing centroid:", error);
  }

  return null;
}

const RECORD_LAYER_PANE = "utilitx-record-layer-pane";

type EsriMapProps = {
  mode?: "draw" | "view";
  polygon?: LatLng[] | null;
  onPolygonChange?: (path: LatLng[], area?: number) => void;
  enableWorkAreaDrawing?: boolean;
  shouldStartWorkAreaDraw?: number; // Command token to trigger work area drawing
  shouldStartRecordDraw?: number;
  enableWorkAreaSelection?: boolean;
  onWorkAreaSelected?: (path: LatLng[], area?: number) => void;
  onWorkAreaClick?: (workArea: {
    id?: string;
    name?: string;
    [key: string]: any;
  }) => void;
  onOpenWorkAreaAnalysis?: (workArea: {
    id?: string;
    name?: string;
    geometry?: any;
    [key: string]: any;
  }) => void;
  onNewWorkAreaCreated?: (workArea: {
    id: string;
    name?: string;
    geometry?: any;
    [key: string]: any;
  }) => void;
  onWorkAreaSelect?: (workArea: {
    id: string;
    name?: string;
    [key: string]: any;
  }) => void;
  selectedWorkArea?: {
    id: string;
    name?: string;
    [key: string]: any;
  } | null;
  arcgisToken?: string | null;
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
  zoomToFeature?: null | { feature: any; version: number }; // Esri feature geometry to zoom to
  pendingRecordMetadata?: any;
  onMapReady?: (map: L.Map) => void; // Callback when map is initialized
  // Optional DOM id so we can render multiple independent maps on the page
  mapId?: string;
  children?: React.ReactNode;
  readOnly?: boolean;
};

function EsriMap({
  mode = "draw",
  polygon,
  onPolygonChange,
  enableWorkAreaDrawing = false,
  shouldStartWorkAreaDraw = 0,
  shouldStartRecordDraw = 0,
  enableWorkAreaSelection = false,
  onWorkAreaSelected,
  onWorkAreaClick,
  onOpenWorkAreaAnalysis,
  onNewWorkAreaCreated,
  onWorkAreaSelect,
  selectedWorkArea = null,
  arcgisToken = null,
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
  onMapReady,
  mapId = "map",
  children,
  readOnly = false,
}: EsriMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const workAreasLayerRef = useRef<any>(null);
  const recordsLayerRefInternal = useRef<any>(null);
  const recordsPointLayerRef = useRef<any>(null);
  const recordsLineLayerRef = useRef<any>(null);
  const recordsPolygonLayerRef = useRef<any>(null);
  
  // Authenticated FeatureLayer instances for editing (separate from esri-leaflet display layers)
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
  const lastCenterRef = useRef<L.LatLng | null>(null);
  const lastZoomRef = useRef<number | null>(null);
  const resizeTimeoutRef = useRef<any>(null);
  const safeResizeRef = useRef<(() => void) | null>(null);
  const isRestoringViewRef = useRef(false);
  const isInitializingRef = useRef(false);
  const rebindWorkAreaPopupsRef = useRef<(() => void) | null>(null);
  const selectedWorkAreaRef = useRef(selectedWorkArea);
  const lastCreatedWorkAreaIdRef = useRef<string | null>(null);
  const activeWorkAreaLayerRef = useRef<L.Layer | null>(null);
  const { toolbarOffset } = useMapToolbarContext()

  useEffect(() => {
    if (!mapInstance) return

    const selectors = [
      ".leaflet-control-container",
      ".leaflet-top.leaflet-left",
      ".leaflet-control-zoom",
      ".leaflet-pm-toolbar",
    ]

    const applyOffset = () => {
      selectors.forEach((selector) => {
        const el = document.querySelector(selector) as HTMLElement | null
        if (el) {
          el.style.left = `${toolbarOffset}px`
        }
      })
    }

    // Initial run
    applyOffset()

    // Observer to catch Geoman injecting its toolbar later
    const container = mapInstance.getContainer()
    const observer = new MutationObserver(() => applyOffset())
    observer.observe(container, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [toolbarOffset, mapInstance])
  
  // Keep arcgisToken in a ref so it's accessible in async event handlers
  const arcgisTokenRef = useRef<string | null>(arcgisToken);
  useEffect(() => {
    arcgisTokenRef.current = arcgisToken;
  }, [arcgisToken]);
  
  // Keep selectedWorkArea ref in sync with prop
  useEffect(() => {
    selectedWorkAreaRef.current = selectedWorkArea;
  }, [selectedWorkArea]);

  useEffect(() => {
    const workAreas = workAreasLayerRef.current;
    const selectedId = selectedWorkArea?.id;
    if (!workAreas) return;

    if (!selectedId) {
      if (activeWorkAreaLayerRef.current) {
        setInactiveWorkArea(activeWorkAreaLayerRef.current, defaultWorkAreaStyle);
        activeWorkAreaLayerRef.current = null;
      }
      return;
    }

    const layers = (workAreas as any)._layers || {};
    for (const key in layers) {
      const layer = layers[key];
      if (layer && layer.feature) {
        const featureId = getFeatureId(layer.feature);
        if (featureId === selectedId) {
          activateWorkAreaLayer(layer);
          break;
        }
      }
    }
  }, [selectedWorkArea?.id]);

  // Default work area style (de-emphasized for non-selected)
  const defaultWorkAreaStyle = {
    color: "#3B82F6",
    weight: 2,
    fillColor: "#3B82F622",
    fillOpacity: 0.15,
    opacity: 0.6,
  };

  const getFeatureId = (feature: any) => {
    return (
      feature?.properties?.id ||
      feature?.properties?.workarea_id ||
      (feature?.properties?.OBJECTID ? `WA-${String(feature.properties.OBJECTID).padStart(4, "0")}` : undefined)
    );
  };

  const activateWorkAreaLayer = (layer: L.Layer) => {
    if (!layer) return;
    if (activeWorkAreaLayerRef.current && activeWorkAreaLayerRef.current !== layer) {
      setInactiveWorkArea(activeWorkAreaLayerRef.current, defaultWorkAreaStyle);
    }
    setActiveWorkArea(layer);
    activeWorkAreaLayerRef.current = layer;
  };

  const applyWorkAreaLayerStyling = (layer: L.Layer, feature: any) => {
    const featureId = getFeatureId(feature);
    const explicitTargetId = selectedWorkAreaRef.current?.id;
    const lastCreatedId = lastCreatedWorkAreaIdRef.current;

    // Newly created work area should immediately be treated as active,
    // even before React selection state has fully propagated.
    const targetId = explicitTargetId || lastCreatedId;

    if (targetId && featureId === targetId) {
      activateWorkAreaLayer(layer);
      // Clear the "last created" hint once we've applied it
      if (lastCreatedId && lastCreatedId === featureId) {
        lastCreatedWorkAreaIdRef.current = null;
      }
      return;
    }

    if (!targetId && activeWorkAreaLayerRef.current === layer) {
      setInactiveWorkArea(layer, defaultWorkAreaStyle);
      activeWorkAreaLayerRef.current = null;
      return;
    }

    if (activeWorkAreaLayerRef.current !== layer) {
      setInactiveWorkArea(layer, defaultWorkAreaStyle);
    }
  };
  
  // Record detail drawer state
  const [recordDrawerOpen, setRecordDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [recordDrawerLoading, setRecordDrawerLoading] = useState(false);
  const handleAiSummaryUpdated = useCallback((summary: string) => {
    setSelectedRecord((prev) => (prev ? { ...prev, textBlob: summary } : prev));
  }, []);
  
  // 🔥 Stable callback references for Geoman event listeners (prevents "wrong listener type" errors)
  const pmCreateHandlerRef = useRef<((e: any) => void) | null>(null);
  const pmEditHandlerRef = useRef<(() => void) | null>(null);
  const pmResizeHandlerRef = useRef<(() => void) | null>(null);
  const mapClickHandlerRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null);
  const editModeToggleHandlerRef = useRef<((e: any) => void) | null>(null);

  // Dedicated initialization effect - runs once on mount
  useEffect(() => {
    // Guard: ensure map initializes only once
    // Check both mapRef and Leaflet ID to prevent double initialization
    if (isInitializingRef.current) return; // Already initializing, skip
    
    const mapContainer = document.getElementById(mapId);
    if (mapRef.current) {
      // Map already exists in ref, verify it's still valid
      if (mapContainer && (mapContainer as any)._leaflet_id) {
        return; // Map is already initialized and valid
      }
      // Map ref exists but container doesn't have Leaflet ID - this shouldn't happen
      // but if it does, we should clean up the ref
      mapRef.current = null;
    }

    // Check if container exists
    if (!mapContainer) {
      console.error("Map container not found");
      return;
    }

    // Check if container already has a Leaflet map instance but mapRef doesn't
    // This can happen during hot reload or React Strict Mode
    if ((mapContainer as any)._leaflet_id && !mapRef.current) {
      // Try to recover the existing map instance
      try {
        const leafletId = (mapContainer as any)._leaflet_id;
        const existingMap = (L as any).Map._instances?.[leafletId];
        if (existingMap && typeof existingMap.remove === 'function') {
          // Clean up orphaned map instance
          existingMap.remove();
        }
        // Clear the leaflet_id
        delete (mapContainer as any)._leaflet_id;
        delete (mapContainer as any)._leaflet;
      } catch (e) {
        console.warn("Error cleaning up orphaned map:", e);
        // Clear IDs anyway
        delete (mapContainer as any)._leaflet_id;
        delete (mapContainer as any)._leaflet;
      }
    }

    // Ensure container has dimensions
    if (mapContainer.clientWidth === 0 || mapContainer.clientHeight === 0) {
      // Wait a bit for container to get dimensions
      setTimeout(() => {
        if (mapContainer.clientWidth > 0 && mapContainer.clientHeight > 0 && !mapRef.current) {
          initializeMap();
        }
      }, 100);
      return;
    }

    initializeMap();

    function initializeMap() {
      // Final guard: check again before initializing
      if (mapRef.current || isInitializingRef.current) return;
      
      isInitializingRef.current = true; // Mark as initializing
      
      const mapContainer = document.getElementById(mapId);
      if (!mapContainer) {
        isInitializingRef.current = false;
        return;
      }
      
      // Double-check Leaflet ID wasn't set in the meantime
      if ((mapContainer as any)._leaflet_id) {
        // Clean up any orphaned Leaflet instance
        try {
          const leafletId = (mapContainer as any)._leaflet_id;
          const existingMap = (L as any).Map._instances?.[leafletId];
          if (existingMap && typeof existingMap.remove === 'function') {
            existingMap.remove();
          }
        } catch (e) {
          // Ignore errors during cleanup
        }
        delete (mapContainer as any)._leaflet_id;
        delete (mapContainer as any)._leaflet;
      }

      // Initialize map with default values (no prop dependencies)
      const map = L.map(mapId, {
        // Check for saved region first - if none, use neutral world view
        // RegionSearch will handle zooming to saved region on mount
        center: (() => {
          try {
            const saved = localStorage.getItem("selectedRegion");
            if (saved) {
              // If there's a saved region, use neutral view - RegionSearch will zoom to it
              return [0, 0];
            }
          } catch (e) {
            // localStorage not available, use neutral view
          }
          // No saved region or localStorage error - use neutral world view
          return [0, 0];
        })(),
        zoom: 2, // Neutral world view - RegionSearch will handle actual zoom
        minZoom: 2, // Allow zoom level 2 for world view
        maxZoom: 21, // Proper maxZoom for Esri vector basemaps (fixes Leaflet-Geoman pm:create issue)
        wheelDebounceTime: 25, // smoother zoom
        wheelPxPerZoomLevel: 60,
        zoomControl: false, // Disable default zoom controls - using custom UTILITX toolbar instead
      });

      mapRef.current = map;
      setMapInstance(map); // Update state so context updates
      isInitializingRef.current = false; // Mark initialization as complete
      
      map.createPane(WORK_AREA_PANE);
      const workAreaPane = map.getPane(WORK_AREA_PANE);
      if (workAreaPane) {
        const workAreaEl = workAreaPane as HTMLElement;
        workAreaEl.style.zIndex = "430";
        workAreaEl.style.pointerEvents = "auto";
      }

      map.createPane(RECORD_LAYER_PANE);
      const recordPane = map.getPane(RECORD_LAYER_PANE);
      if (recordPane) {
        const recordEl = recordPane as HTMLElement;
        recordEl.style.zIndex = "620";
        recordEl.style.pointerEvents = "auto";
      }

      map.createPane(ACTIVE_WORK_AREA_PANE);
      const activePane = map.getPane(ACTIVE_WORK_AREA_PANE);
      if (activePane) {
        (activePane as HTMLElement).style.zIndex = "700";
      }

      // Notify parent component that map is ready
      if (onMapReady) {
        onMapReady(map);
      }

      // Wait for map to be ready before adding layers
      map.whenReady(() => {
        // 🔥 FIX: Inject CSS to ensure popups appear above map
        // Add style tag to ensure Leaflet popups have high z-index
        if (typeof document !== 'undefined') {
          const styleId = 'leaflet-popup-z-index-fix';
          if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
          style.textContent = `
            .leaflet-popup-pane {
              z-index: 10000 !important;
            }
            .leaflet-popup {
              z-index: 10000 !important;
            }
            .leaflet-popup-content-wrapper {
              z-index: 10000 !important;
            }
            .custom-popup {
              z-index: 10000 !important;
            }
            .leaflet-top.leaflet-left {
              left: 280px !important;
            }
            .leaflet-control-container .leaflet-left > .leaflet-control {
              margin-left: 0 !important;
            }
          `;
            document.head.appendChild(style);
            console.log('✅ Injected popup z-index CSS fix');
          }
        }

        // 🔥 FIX: Set z-index on popup pane itself (critical for visibility)
        // Also set on all other panes to ensure popup pane is highest
        try {
          const popupPane = map.getPane('popupPane');
          const mapPane = map.getPane('mapPane');
          const tilePane = map.getPane('tilePane');
          const overlayPane = map.getPane('overlayPane');
          const shadowPane = map.getPane('shadowPane');
          const markerPane = map.getPane('markerPane');
          const tooltipPane = map.getPane('tooltipPane');
          
          // Set popup pane to highest z-index
          if (popupPane) {
            (popupPane as HTMLElement).style.zIndex = '10000';
            console.log('✅ Set popup pane z-index to 10000');
          }
          
          // Set other panes to lower z-index to ensure popup is on top
          if (mapPane) (mapPane as HTMLElement).style.zIndex = '200';
          if (tilePane) (tilePane as HTMLElement).style.zIndex = '200';
          if (overlayPane) (overlayPane as HTMLElement).style.zIndex = '400';
          if (shadowPane) (shadowPane as HTMLElement).style.zIndex = '500';
          if (markerPane) (markerPane as HTMLElement).style.zIndex = '600';
          if (tooltipPane) (tooltipPane as HTMLElement).style.zIndex = '650';
          
          console.log('✅ Set all pane z-indexes', {
            popupPane: popupPane ? (popupPane as HTMLElement).style.zIndex : 'N/A',
            mapPane: mapPane ? (mapPane as HTMLElement).style.zIndex : 'N/A',
            overlayPane: overlayPane ? (overlayPane as HTMLElement).style.zIndex : 'N/A',
            markerPane: markerPane ? (markerPane as HTMLElement).style.zIndex : 'N/A',
          });
        } catch (err) {
          console.warn('Could not set popup pane z-index:', err);
        }

        // 🔥 FIX: Global popupopen event listener to ensure z-index on all popups
        // This catches newly created popups that might not have z-index set yet
        map.on('popupopen', (e: L.PopupEvent) => {
          try {
            const popup = e.popup;
            if (popup && popup.getElement) {
              const popupElement = popup.getElement();
              if (popupElement) {
                // Set z-index on the popup element itself
                popupElement.style.zIndex = '10000';
                popupElement.style.display = 'block';
                popupElement.style.visibility = 'visible';
                popupElement.style.opacity = '1';
                
                // Also set on parent wrapper
                const wrapper = popupElement.closest?.('.leaflet-popup');
                if (wrapper) {
                  (wrapper as HTMLElement).style.zIndex = '10000';
                  (wrapper as HTMLElement).style.display = 'block';
                  (wrapper as HTMLElement).style.visibility = 'visible';
                  (wrapper as HTMLElement).style.opacity = '1';
                }
                // Set on content wrapper too
                const contentWrapper = popupElement.querySelector?.('.leaflet-popup-content-wrapper');
                if (contentWrapper) {
                  (contentWrapper as HTMLElement).style.zIndex = '10000';
                  (contentWrapper as HTMLElement).style.display = 'block';
                  (contentWrapper as HTMLElement).style.visibility = 'visible';
                }
                // 🔥 FIX: Also ensure popup pane has high z-index
                const popupPane = map.getPane('popupPane');
                if (popupPane) {
                  (popupPane as HTMLElement).style.zIndex = '10000';
                }
                
                // Get computed styles for debugging
                const computedStyle = window.getComputedStyle(popupElement);
                const computedZ = computedStyle.zIndex;
                const popupPaneZ = popupPane ? window.getComputedStyle(popupPane as HTMLElement).zIndex : 'N/A';
                
                console.log('✅ Set z-index to 10000 via popupopen event', {
                  popupElement: !!popupElement,
                  wrapper: !!wrapper,
                  popupPane: !!popupPane,
                  popupPaneZIndex: popupPane ? (popupPane as HTMLElement).style.zIndex : 'N/A',
                  popupPaneComputedZ: popupPaneZ,
                  elementComputedZ: computedZ,
                  elementRect: popupElement.getBoundingClientRect(),
                });
              }
            }
          } catch (err) {
            console.warn('Could not set z-index via popupopen event:', err);
          }
        });
        
        // 🔥 FIX: Listen for popupclose to debug when/why popups are being closed
        map.on('popupclose', (e: L.PopupEvent) => {
          const stack = new Error().stack;
          const stackLines = stack?.split('\n') || [];
          const relevantStack = stackLines.slice(2, 8).map(line => line.trim()).filter(Boolean);
          
          console.log('🔴 Popup closed:', {
            popup: e.popup,
            popupElement: e.popup?.getElement?.(),
            isOpen: e.popup?.isOpen?.(),
            source: relevantStack[0] || 'unknown',
            fullStack: relevantStack
          });
        });

        // Helper function to bind popup and click handler to a work area feature
        // Defined here so it's accessible throughout the whenReady scope
        const bindWorkAreaPopup = (feature: any, layer: L.Layer | null | undefined) => {
          // Safety check: ensure layer exists and has required methods
          if (!layer || typeof layer.bindPopup !== 'function') {
            console.warn('Cannot bind popup: layer is undefined or missing bindPopup method', { feature, layer });
            return;
          }

          const props = feature?.properties || {};
          
          // Format work area ID (use OBJECTID or work_area_id, format as WA-XXXX)
          const workAreaId = props.work_area_id 
            ? `WA-${String(props.work_area_id).padStart(4, '0')}` 
            : props.OBJECTID 
            ? `WA-${String(props.OBJECTID).padStart(4, '0')}` 
            : undefined;
          
          // Format date
          const date = props.timestamp || props.created_date || props.date;
          
          // Get work area name
          const workAreaName = props.name || props.workarea_name || props.work_area_name || `Work Area ${workAreaId}`;
          
          // Create popup content using React component
          const popupContent = renderReactPopup(
            <WorkAreaPopup
              workAreaId={workAreaId}
              workAreaName={workAreaName}
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
              onOpenAnalysis={() => {
                // Open the analysis drawer directly
                if (onOpenWorkAreaAnalysis) {
                  onOpenWorkAreaAnalysis({
                    id: workAreaId,
                    name: workAreaName,
                    region: props.region,
                    owner: props.owner,
                    createdBy: props.created_by || props.createdBy,
                    date: date,
                    notes: props.notes,
                    geometry: feature?.geometry,
                    ...props,
                  });
                }
              }}
            />
          );
          
          // Bind or update popup (bindPopup can be called multiple times safely)
          try {
            // Check if popup is currently open before unbinding
            const existingPopup = layer.getPopup?.();
            const isPopupOpen = existingPopup?.isOpen?.() || false;
            const openLatLng = isPopupOpen ? existingPopup?.getLatLng?.() : null;
            
            // 🔥 FIX: Only unbind if popup content needs updating, or if popup is not open
            // This prevents closing popups that are currently being viewed
            const needsRebind = !existingPopup || !isPopupOpen;
            
            if (needsRebind && typeof layer.unbindPopup === 'function') {
              layer.unbindPopup();
            } else if (isPopupOpen && existingPopup) {
              // Popup is open - just update the content without closing
              try {
                existingPopup.setContent(popupContent);
                console.log(`✅ Updated popup content for open popup: ${workAreaId}`);
                return; // Don't rebind, just return
              } catch (updateErr) {
                console.warn(`Could not update popup content, will rebind:`, updateErr);
                // Fall through to rebind
                if (typeof layer.unbindPopup === 'function') {
                  layer.unbindPopup();
                }
              }
            }
            
            // Bind popup with proper z-index and options
            layer.bindPopup(popupContent, {
              className: "custom-popup",
              maxWidth: 400,
              autoPan: true,
              closeOnClick: false,
              autoClose: false,
              closeButton: true,
              // 🔥 FIX: Prevent popup from being closed by map clicks or other events
              keepInView: true,
            });
            
            // 🔥 FIX: Ensure popup has high z-index so it appears above map
            // Set z-index after binding to ensure it's applied
            setTimeout(() => {
              try {
                const popup = layer.getPopup?.();
                if (popup && popup.getElement) {
                  const popupElement = popup.getElement();
                  if (popupElement) {
                    popupElement.style.zIndex = '10000'; // Very high z-index
                    console.log(`✅ Set popup z-index to 10000 for work area: ${workAreaId}`);
                  }
                }
              } catch (zIndexErr) {
                console.warn('Could not set popup z-index:', zIndexErr);
              }
            }, 50);
            
            console.log(`✅ Popup bound to work area: ${workAreaId}`);
            
            // If popup was open before rebinding, reopen it
            if (isPopupOpen && openLatLng && layer.openPopup && typeof layer.openPopup === 'function') {
              setTimeout(() => {
                try {
                  layer.openPopup(openLatLng);
                  console.log(`✅ Reopened popup after rebinding for: ${workAreaId}`);
                } catch (err) {
                  console.warn(`Could not reopen popup after rebinding:`, err);
                }
              }, 100);
            }
          } catch (err) {
            console.error('❌ Error binding popup:', err, { workAreaId, layer });
            // Fallback: try again with minimal options
            try {
              layer.bindPopup(popupContent, {
                className: "custom-popup",
                maxWidth: 400,
              });
              console.log(`✅ Popup bound with fallback for: ${workAreaId}`);
            } catch (fallbackErr) {
              console.error('❌ Failed to bind popup even with fallback:', fallbackErr, { workAreaId });
              return;
            }
          }

          // Remove existing click handlers and add new one
          try {
            // Ensure layer is interactive (critical for newly created features)
            if (typeof (layer as any).setStyle === 'function') {
              // Make sure the layer is clickable
              (layer as any).setStyle({ interactive: true });
              console.log(`✅ Set interactive: true for work area: ${workAreaId}`);
            }
            
            // 🔥 FIX: Also try setting interactive via options if available
            if ((layer as any).options) {
              (layer as any).options.interactive = true;
              (layer as any).options.bubblingMouseEvents = true;
            }
            
            if (typeof layer.off === 'function') {
              layer.off('click');
              layer.off('mousedown');
            }
            if (typeof layer.on === 'function') {
              // Capture feature in closure for click handler
              const layerFeature = feature;
              
              // 🔥 FIX: Test if layer can receive events at all
              layer.on('mouseover', () => {
                console.log(`🖱️ Work area mouseover: ${workAreaId}`);
              });
              
              // Use named function for better debugging
              const clickHandler = (e: L.LeafletMouseEvent) => {
                console.log(`🖱️ Work area clicked: ${workAreaId}`, { 
                  e, 
                  layer, 
                  hasPopup: !!layer.getPopup?.(),
                  layerType: layer.constructor?.name,
                  target: e.originalEvent?.target,
                  latlng: e.latlng
                });
                
                activateWorkAreaLayer(layer);
                
                // 🔥 FIX: Prevent default and stop propagation to ensure click is handled
                if (e.originalEvent) {
                  e.originalEvent.preventDefault?.();
                  e.originalEvent.stopPropagation?.();
                }
                
                // 🔥 FIX: Explicitly open the popup on click and ensure z-index
                try {
                  // First check if popup exists
                  const existingPopup = layer.getPopup?.();
                  if (!existingPopup) {
                    console.warn(`⚠️ No popup found for ${workAreaId}, attempting to rebind...`);
                    // Get feature from layer if available (fallback to captured feature)
                    const featureToUse = (layer as any).feature || layerFeature;
                    if (featureToUse) {
                      // Try to rebind the popup
                      bindWorkAreaPopup(featureToUse, layer);
                      // Wait a bit and try again
                      setTimeout(() => {
                        if (layer.openPopup && typeof layer.openPopup === 'function') {
                          layer.openPopup(e.latlng);
                        }
                      }, 100);
                    }
                    return;
                  }
                  
                  if (layer.openPopup && typeof layer.openPopup === 'function') {
                    // Open popup at click location
                    layer.openPopup(e.latlng);
                    console.log(`✅ Opened popup for work area: ${workAreaId}`);
                    
                    // 🔥 FIX: Prevent popup from being closed immediately
                    // Stop event propagation to prevent other handlers from closing it
                    if (e.originalEvent) {
                      e.originalEvent.stopPropagation?.();
                    }
                    
                    // 🔥 FIX: Set z-index immediately after opening (critical for new popups)
                    // Use multiple timeouts to catch the popup at different stages
                    [10, 50, 100, 200, 500].forEach((delay) => {
                      setTimeout(() => {
                        try {
                          const popup = layer.getPopup?.();
                          if (popup) {
                            // Set z-index on the popup container
                            const popupElement = popup.getElement?.();
                            if (popupElement) {
                              popupElement.style.zIndex = '10000';
                              popupElement.style.display = 'block';
                              popupElement.style.visibility = 'visible';
                              popupElement.style.opacity = '1';
                              // Also set on parent wrapper if it exists
                              const wrapper = popupElement.closest?.('.leaflet-popup');
                              if (wrapper) {
                                (wrapper as HTMLElement).style.zIndex = '10000';
                                (wrapper as HTMLElement).style.display = 'block';
                                (wrapper as HTMLElement).style.visibility = 'visible';
                                (wrapper as HTMLElement).style.opacity = '1';
                              }
                              // 🔥 FIX: Also ensure popup pane has high z-index
                              const popupPane = map.getPane('popupPane');
                              if (popupPane) {
                                (popupPane as HTMLElement).style.zIndex = '10000';
                              }
                              
                              // 🔥 FIX: Check if popup is actually in the DOM and visible
                              const isInDOM = document.body.contains(popupElement) || document.body.contains(wrapper as HTMLElement);
                              const computedStyle = window.getComputedStyle(popupElement);
                              const isVisible = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0';
                              
                              // Get all z-index values for debugging
                              const popupPaneZ = popupPane ? window.getComputedStyle(popupPane as HTMLElement).zIndex : 'N/A';
                              const wrapperZ = wrapper ? window.getComputedStyle(wrapper as HTMLElement).zIndex : 'N/A';
                              const elementZ = computedStyle.zIndex;
                              
                              console.log(`✅ Set z-index and visibility for opened popup (delay ${delay}ms): ${workAreaId}`, {
                                popupPaneZIndex: popupPane ? (popupPane as HTMLElement).style.zIndex : 'N/A',
                                popupPaneComputedZ: popupPaneZ,
                                wrapperZIndex: wrapper ? (wrapper as HTMLElement).style.zIndex : 'N/A',
                                wrapperComputedZ: wrapperZ,
                                elementZIndex: popupElement.style.zIndex,
                                elementComputedZ: elementZ,
                                isInDOM,
                                isVisible,
                                computedDisplay: computedStyle.display,
                                computedVisibility: computedStyle.visibility,
                                computedOpacity: computedStyle.opacity,
                                popupRect: popupElement.getBoundingClientRect(),
                                wrapperRect: wrapper ? (wrapper as HTMLElement).getBoundingClientRect() : null,
                              });
                            } else {
                              console.warn(`⚠️ Popup element not found for ${workAreaId} at delay ${delay}ms`);
                            }
                          } else {
                            console.warn(`⚠️ Popup not found for ${workAreaId} at delay ${delay}ms`);
                          }
                        } catch (zIndexErr) {
                          console.warn(`Could not set z-index on opened popup (delay ${delay}ms):`, zIndexErr);
                        }
                      }, delay);
                    });
                  } else if (layer.getPopup && typeof layer.getPopup === 'function') {
                    const popup = layer.getPopup();
                    if (popup && popup.openOn && typeof popup.openOn === 'function') {
                      popup.openOn(map, e.latlng);
                      console.log(`✅ Opened popup via openOn for: ${workAreaId}`);
                      
                      // Set z-index after opening
                      setTimeout(() => {
                        try {
                          const popupElement = popup.getElement?.();
                          if (popupElement) {
                            popupElement.style.zIndex = '10000';
                            const wrapper = popupElement.closest?.('.leaflet-popup');
                            if (wrapper) {
                              (wrapper as HTMLElement).style.zIndex = '10000';
                            }
                            console.log(`✅ Set z-index to 10000 for opened popup (openOn): ${workAreaId}`);
                          }
                        } catch (zIndexErr) {
                          console.warn('Could not set z-index on opened popup:', zIndexErr);
                        }
                      }, 10);
                    } else {
                      console.warn(`⚠️ Could not open popup - methods not available`, { 
                        hasOpenPopup: !!layer.openPopup,
                        hasGetPopup: !!layer.getPopup,
                        popup
                      });
                    }
                  }
                } catch (popupErr) {
                  console.error('❌ Error opening popup:', popupErr, { workAreaId });
                }
                
                // Update selection when work area is clicked
                if (onWorkAreaSelect) {
                  console.log("🖱️ Work area clicked, updating selection:", workAreaId);
                  onWorkAreaSelect({
                    id: workAreaId,
                    name: props.name || props.workarea_name || props.work_area_name || `Work Area ${workAreaId}`,
                    region: props.region,
                    owner: props.owner,
                    createdBy: props.created_by || props.createdBy,
                    date: date,
                    notes: props.notes,
                    geometry: layerFeature?.geometry,
                    ...props,
                  });
                }
                
                // Also call the callback if provided
                if (onWorkAreaClick) {
                  onWorkAreaClick({
                    id: workAreaId,
                    name: props.name || props.workarea_name || props.work_area_name || `Work Area ${workAreaId}`,
                    region: props.region,
                    owner: props.owner,
                    createdBy: props.created_by || props.createdBy,
                    date: date,
                    notes: props.notes,
                    geometry: layerFeature?.geometry,
                    ...props,
                  });
                }
              };
              
              // Bind the click handler
              layer.on('click', clickHandler);
              
              // Also try binding to mousedown as a fallback
              layer.on('mousedown', (e: L.LeafletMouseEvent) => {
                console.log(`🖱️ Work area mousedown: ${workAreaId}`, { e, layer });
                // Trigger click programmatically if needed
                setTimeout(() => {
                  if (layer.getPopup && layer.openPopup) {
                    try {
                      layer.openPopup(e.latlng);
                      console.log(`✅ Opened popup via mousedown fallback: ${workAreaId}`);
                      
                      // 🔥 FIX: Set z-index on popup pane and popup elements
                      setTimeout(() => {
                        try {
                          const popup = layer.getPopup?.();
                          if (popup) {
                            const popupElement = popup.getElement?.();
                            if (popupElement) {
                              popupElement.style.zIndex = '10000';
                              const wrapper = popupElement.closest?.('.leaflet-popup');
                              if (wrapper) {
                                (wrapper as HTMLElement).style.zIndex = '10000';
                              }
                              const popupPane = map.getPane('popupPane');
                              if (popupPane) {
                                (popupPane as HTMLElement).style.zIndex = '10000';
                              }
                            }
                          }
                        } catch (err) {
                          console.warn('Could not set z-index via mousedown:', err);
                        }
                      }, 10);
                    } catch (err) {
                      console.warn('Could not open popup via mousedown:', err);
                    }
                  }
                }, 50);
              });
              
              console.log(`✅ Click handler bound for work area: ${workAreaId}`, {
                hasOn: typeof layer.on === 'function',
                hasOff: typeof layer.off === 'function',
                hasOpenPopup: typeof layer.openPopup === 'function',
                hasGetPopup: typeof layer.getPopup === 'function',
              });
            } else {
              console.warn(`⚠️ Layer.on not available for: ${workAreaId}`, {
                layerType: layer.constructor?.name,
                hasOn: typeof layer.on === 'function',
              });
            }
          } catch (err) {
            console.error('❌ Error binding click handler:', err, { workAreaId, layer });
          }
        };

        // Restore view if map is remounted (rare case)
        if (lastCenterRef.current && lastZoomRef.current) {
          map.setView(lastCenterRef.current, lastZoomRef.current);
        }

        // Listen for user movements and save them
        map.on("moveend zoomend", () => {
          lastCenterRef.current = map.getCenter();
          lastZoomRef.current = map.getZoom();
        });

        // Remove Geoman built-in toolbar - using custom UTILITX toolbar instead
        try {
          map.pm.removeControls();
        } catch (e) {
          // Controls might not exist yet, that's fine
        }

        // Ensure default Leaflet zoom controls are removed - using custom UTILITX toolbar instead
        if (map.zoomControl) {
          map.removeControl(map.zoomControl);
        }

        // Fix bounce caused by sidebar/layout changes with debounced resize
        const safeResize = () => {
          if (resizeTimeoutRef.current) {
            clearTimeout(resizeTimeoutRef.current);
          }
          
          // Prevent multiple simultaneous resize operations
          if (isRestoringViewRef.current) return;
          
          resizeTimeoutRef.current = setTimeout(() => {
            if (!map || isRestoringViewRef.current) return;
            
            // Store current view before invalidateSize
            const currentCenter = map.getCenter();
            const currentZoom = map.getZoom();
            
            // Only proceed if we have a stored view to restore to
            if (!lastCenterRef.current || !lastZoomRef.current) {
              map.invalidateSize({ animate: false });
              lastCenterRef.current = currentCenter;
              lastZoomRef.current = currentZoom;
              return;
            }
            
            map.invalidateSize({ animate: false });

            // Use double requestAnimationFrame to ensure layout has fully settled
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (!map || isRestoringViewRef.current) return;
                
                isRestoringViewRef.current = true;
                
                // Check if invalidateSize caused any change
                const newCenter = map.getCenter();
                const newZoom = map.getZoom();
                
                // Calculate differences
                const centerDiff = currentCenter.distanceTo(newCenter);
                const zoomDiff = Math.abs(currentZoom - newZoom);
                
                // Only restore if there was a significant unwanted change (bounce)
                // Small changes (< 0.0001 degrees, < 0.01 zoom) are likely just rounding
                if (centerDiff > 0.0001 || zoomDiff > 0.01) {
                  // Restore to last known good position
                  if (lastCenterRef.current && lastZoomRef.current) {
                    map.setView(lastCenterRef.current, lastZoomRef.current, { animate: false });
                  }
                }
                
                // Always update refs with the final position
                lastCenterRef.current = map.getCenter();
                lastZoomRef.current = map.getZoom();
                
                isRestoringViewRef.current = false;
              });
            });
          }, 150);
        };

        safeResizeRef.current = safeResize;
        window.addEventListener("resize", safeResize);

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
            // This is a timing issue - panes will be ready shortly, safe to ignore
            console.warn("Map panes not initialized yet, will retry");
            return;
          }

          // Define basemap layers using ArcGIS basemapLayer
          // Note: basemapLayer shows a deprecation warning but is fully functional.
          // Vector.vectorBasemapLayer is not yet available in the current esri-leaflet version.
          // When upgrading esri-leaflet, migrate to: EL.Vector.vectorBasemapLayer("ArcGIS:Streets", { apiKey })
          // Use OAuth token if available, otherwise fall back to API key
          const authToken = arcgisToken || process.env.NEXT_PUBLIC_ARCGIS_API_KEY!
          
          const basemaps: Record<string, L.TileLayer> = {
            Imagery: EL.basemapLayer("Imagery", {
              apikey: authToken,
              maxZoom: 21,
            }),
            Streets: EL.basemapLayer("Streets", {
              apikey: authToken,
              maxZoom: 21,
            }),
            Topographic: EL.basemapLayer("Topographic", {
              apikey: authToken,
              maxZoom: 21,
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

            // Basemap control is now handled by BasemapToggle component
            // Removed default Leaflet layer control for cleaner UI
          }, 100);
  
          // Add hosted WorkAreas layer (polygons) - "workarea" layer
          // Wait a bit more to ensure map is fully ready
          setTimeout(() => {
            try {
              if (map.getPane('overlayPane') && map.getContainer()) {
                // IMPORTANT: Use the token from ref to ensure we get the latest value
                // This ensures all layers are authenticated and can be edited
                const currentToken = arcgisTokenRef.current || process.env.NEXT_PUBLIC_ARCGIS_API_KEY;
                
                if (!currentToken) {
                  console.warn("⚠️ No authentication token available for WorkAreas layer - skipping");
                  return;
                }
                
                console.log("🔐 Creating WorkAreas layer with auth:", arcgisTokenRef.current ? "OAuth token" : "API key");
                
                const workAreaAuth: Record<string, string | number> = {};
                if (arcgisTokenRef.current) {
                  workAreaAuth.token = currentToken;
                } else {
                  workAreaAuth.apikey = currentToken;
                }
                
                const workAreas = EL.featureLayer({
                  url: WORKAREA_URL,
                  pane: WORK_AREA_PANE,
                  ...workAreaAuth,
                  style: () => defaultWorkAreaStyle,
                  // 🔥 FIX: Ensure features are interactive
                  interactive: true,
                  onEachFeature: (feature: any, layer: L.Layer) => {
                    bindWorkAreaPopup(feature, layer);
                    applyWorkAreaLayerStyling(layer, feature);
                  },
                }).addTo(map);

                // 🔥 FIX: Bind popups to features after layer refresh
                // When the layer refreshes, new features are added but onEachFeature is not called again
                const rebindAllPopups = () => {
                  try {
                    console.log('🔄 Rebinding popups to all work area features...');
                    let featureCount = 0;
                    let skippedOpenPopups = 0;
                    
                    // Method 1: Try eachFeature if available
                    if (typeof workAreas.eachFeature === 'function') {
                      workAreas.eachFeature((feature: any, layer: L.Layer | null | undefined) => {
                        if (feature && layer) {
                          // 🔥 FIX: Skip rebinding if popup is currently open to avoid closing it
                          const existingPopup = layer.getPopup?.();
                          const isPopupOpen = existingPopup?.isOpen?.() || false;
                          
                          if (isPopupOpen) {
                            skippedOpenPopups++;
                            console.log(`⏭️ Skipping rebind for open popup: ${feature?.properties?.workarea_id || feature?.properties?.id || 'unknown'}`);
                            return; // Skip this one
                          }
                          
                          featureCount++;
                          bindWorkAreaPopup(feature, layer);
                        }
                      });
                    }
                    
                    // Method 2: Also try accessing features directly from the layer
                    // Esri Leaflet stores features in _layers or similar
                    if (featureCount === 0) {
                      // Try to access features through the layer's internal structure
                      const layers = (workAreas as any)._layers || {};
                      Object.keys(layers).forEach((key) => {
                        const layer = layers[key];
                        if (layer && layer.feature) {
                          // 🔥 FIX: Skip rebinding if popup is currently open to avoid closing it
                          const existingPopup = layer.getPopup?.();
                          const isPopupOpen = existingPopup?.isOpen?.() || false;
                          
                          if (isPopupOpen) {
                            skippedOpenPopups++;
                            return; // Skip this one
                          }
                          
                          featureCount++;
                          bindWorkAreaPopup(layer.feature, layer);
                        }
                      });
                    }
                    
                    console.log(`✅ Rebound popups to ${featureCount} work area features${skippedOpenPopups > 0 ? ` (skipped ${skippedOpenPopups} open popups)` : ''}`);
                  } catch (err) {
                    console.warn('Error binding popups after layer load:', err);
                  }
                };
                
                // Store rebind function in ref so it's accessible from record saving code
                rebindWorkAreaPopupsRef.current = rebindAllPopups;

                // Removed automatic rebinding on load - layers should be stable after initial binding
                // Work area popups are bound once during initialization and should remain stable

                // Also listen for when features are added (more reliable for new features)
                workAreas.on('addfeature', (e: any) => {
                  console.log('➕ Feature added to work areas layer, binding popup...', { 
                    hasFeature: !!e.feature, 
                    hasLayer: !!e.layer,
                    layerType: e.layer?.constructor?.name 
                  });
                  
                  if (e.feature) {
                    // 🔥 FIX: Find the actual Leaflet layer from the feature layer's internal structure
                    // The e.layer might not be the interactive layer we need
                    setTimeout(() => {
                      try {
                        let actualLayer = e.layer;
                        
                        // If e.layer doesn't have the methods we need, try to find it from the feature layer
                        if (!actualLayer || typeof actualLayer.bindPopup !== 'function') {
                          // Try to find the layer by iterating through the feature layer's layers
                          const layers = (workAreas as any)._layers || {};
                          const featureId = e.feature.id || e.feature.properties?.OBJECTID || e.feature.properties?.work_area_id;
                          
                          console.log(`🔍 Searching for layer with feature ID: ${featureId}`);
                          
                          // Find the layer that matches this feature
                          for (const key in layers) {
                            const layer = layers[key];
                            if (layer && layer.feature) {
                              const layerFeatureId = layer.feature.id || 
                                                    layer.feature.properties?.OBJECTID || 
                                                    layer.feature.properties?.work_area_id;
                              
                              if (layerFeatureId === featureId || 
                                  (layer.feature === e.feature) ||
                                  (layer.feature.properties?.OBJECTID === e.feature.properties?.OBJECTID)) {
                                actualLayer = layer;
                                console.log(`✅ Found matching layer for feature ID: ${featureId}`);
                                break;
                              }
                            }
                          }
                        }
                        
                        if (actualLayer && typeof actualLayer.bindPopup === 'function') {
                          bindWorkAreaPopup(e.feature, actualLayer);
                          applyWorkAreaLayerStyling(actualLayer, e.feature);
                        } else {
                          console.warn('⚠️ Could not find valid layer for new feature, will retry on layer load', {
                            hasActualLayer: !!actualLayer,
                            hasBindPopup: actualLayer && typeof actualLayer.bindPopup === 'function'
                          });
                          // The layer load event will catch it
                        }
                      } catch (err) {
                        console.error('❌ Error binding popup in addfeature handler:', err);
                      }
                    }, 200); // Increased delay to ensure layer is fully initialized
                  }
                });

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
                // IMPORTANT: Use the token from ref to ensure we get the latest value
                const currentToken = arcgisTokenRef.current || process.env.NEXT_PUBLIC_ARCGIS_API_KEY;
                
                if (!currentToken) {
                  console.warn(`⚠️ No authentication token available for ${geometryType} layer - skipping`);
                  return null;
                }
                
                console.log(`🔐 Creating ${geometryType} layer with auth:`, arcgisTokenRef.current ? "OAuth token" : "API key");
                
                const layerAuth: Record<string, string | number> = {};
                if (arcgisTokenRef.current) {
                  layerAuth.token = currentToken;
                } else {
                  layerAuth.apikey = currentToken;
                }
                
                const layer = EL.featureLayer({
                  url: url,
                  pane: RECORD_LAYER_PANE,
                  ...layerAuth,
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
                    
                    // Helper function to open drawer with record data
                    const openRecordDrawer = () => {
                      setRecordDrawerLoading(true);
                      setSelectedRecord({
                        recordId,
                        filename: props.file_name || props.filename,
                        thumbnail: props.thumbnail,
                        fileUrl: fileUrl && fileUrl.startsWith("http") ? fileUrl : undefined,
                        filePath,
                        cloudinaryId: props.cloudinary_id || props.cloudinaryId || props.cloudinary_public_id,
                        intersectionGuess: props.intersection_guess || props.intersectionGuess || props.intersection,
                        trustScore: props.trust_score !== undefined ? props.trust_score : (props.trustScore !== undefined ? props.trustScore : undefined),
                        utilityType: props.utility_type,
                        city: props.city,
                        textBlob: props.text_blob || props.textBlob || props.ai_summary || props.aiSummary,
                        geometryType: props.geometry_type || props.geometryType || "Point",
                        recordType: props.record_type,
                        organization: props.source,
                        processedDate,
                        uploadedBy: props.Creator || props.created_by || props.uploaded_by || props.createdBy,
                        feature: feature,
                        layer: layer,
                      });
                      setRecordDrawerOpen(true);
                      
                      // Simulate loading delay (remove in production if not needed)
                      setTimeout(() => {
                        setRecordDrawerLoading(false);
                      }, 300);
                    };
                    
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
                        onMoreDetails={openRecordDrawer}
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
                  if (RECORDS_POINT_URL) {
                    const pointLayer = createRecordsLayer(RECORDS_POINT_URL, "Point");
                    pointLayer.addTo(map);
                    recordsPointLayerRef.current = pointLayer;
                    
                    // Add delayed zoom after layer loads (wait for Map Pane init)
                    pointLayer.on("load", () => {
                      console.log("Records Point layer loaded");
                      
                      // Removed automatic rebinding - layers should not interfere with each other
                      // Work area popups are bound once and should remain stable
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
                          const feature = zoomToFeature?.feature;
                          if (features.length > 0 && feature?.geometry) {
                            console.log("Zooming to feature from Point layer");
                            if (feature?.geometry) {
                              zoomToEsriFeature(map, feature);
                            } else {
                              console.warn("Skipping zoom — feature missing geometry:", feature);
                            }
                          }
                        } catch (err) {
                          console.warn("Error zooming after Point layer load:", err);
                        }
                      }, 400);
                    });
                  }
                  
                  // Add Line layer
                  if (RECORDS_LINE_URL) {
                    const lineLayer = createRecordsLayer(RECORDS_LINE_URL, "Line");
                    lineLayer.addTo(map);
                    recordsLineLayerRef.current = lineLayer;
                    
                    // Add delayed zoom after layer loads (wait for Map Pane init)
                    lineLayer.on("load", () => {
                      console.log("Records Line layer loaded");
                      
                      // Removed automatic rebinding - layers should not interfere with each other
                      // Work area popups are bound once and should remain stable
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
                          const feature = zoomToFeature?.feature;
                          if (features.length > 0 && feature?.geometry) {
                            console.log("Zooming to feature from Line layer");
                            if (feature?.geometry) {
                              zoomToEsriFeature(map, feature);
                            } else {
                              console.warn("Skipping zoom — feature missing geometry:", feature);
                            }
                          }
                        } catch (err) {
                          console.warn("Error zooming after Line layer load:", err);
                        }
                      }, 400);
                    });
                  }
                  
                  // Add Polygon layer
                  if (RECORDS_POLYGON_URL) {
                    const polygonLayer = createRecordsLayer(RECORDS_POLYGON_URL, "Polygon");
                    polygonLayer.addTo(map);
                    recordsPolygonLayerRef.current = polygonLayer;
                    
                    // Add delayed zoom after layer loads (wait for Map Pane init)
                    polygonLayer.on("load", () => {
                      console.log("Records Polygon layer loaded");
                      
                      // Removed automatic rebinding - layers should not interfere with each other
                      // Work area popups are bound once and should remain stable
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
                          const feature = zoomToFeature?.feature;
                          if (features.length > 0 && feature?.geometry) {
                            console.log("Zooming to feature from Polygon layer");
                            if (feature?.geometry) {
                              zoomToEsriFeature(map, feature);
                            } else {
                              console.warn("Skipping zoom — feature missing geometry:", feature);
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
                // Ensure Geoman toolbar is removed - using custom UTILITX toolbar instead
                try {
                  map.pm.removeControls();
                } catch (e) {
                  // Controls might not exist, that's fine
                }

                if (enableWorkAreaDrawing) {
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
                  // Enable the appropriate drawing mode programmatically
                  if (georefMode === "point") {
                    map.pm.enableDraw("Marker");
                  } else if (georefMode === "line") {
                    map.pm.enableDraw("Line");
                  } else if (georefMode === "polygon") {
                    map.pm.enableDraw("Polygon");
                  }
                } else {
                  map.pm.disableDraw();
                }

                // Disable drawing when edit mode is enabled to prevent overlap
                // 🔥 Store handler in ref for proper cleanup (prevents "wrong listener type" errors)
                const handleEditModeToggle = (e: any) => {
                  if (e.enabled) {
                    map.pm.disableDraw();
                  }
                };
                editModeToggleHandlerRef.current = handleEditModeToggle;
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
              console.log("🔐 Saving work area...");

              const response = await saveWorkArea(WORKAREA_URL, path);
              console.log("🧩 saveWorkArea response in EsriMap:", response);

              // Normalized objectId extraction to handle both legacy and new response shapes
              const objectId =
                response?.objectId ??
                response?.addResults?.[0]?.objectId ??
                response?.addFeatureResults?.[0]?.objectId;

              let newWorkAreaId: string | undefined;
              if (objectId !== undefined && objectId !== null) {
                newWorkAreaId = `WA-${String(objectId).padStart(4, "0")}`;
              } else {
                console.warn("⚠️ Could not derive new work area ID from save response:", response);
              }

              // Notify parent about new work area creation
              if (onNewWorkAreaCreated && newWorkAreaId) {
                const newWorkArea = {
                  id: newWorkAreaId,
                  name: `Work Area ${newWorkAreaId}`,
                  geometry,
                  ...attributes,
                };
                console.log("🎉 Notifying parent of new work area:", newWorkArea);
                // Remember this as the last created ID so we can auto-highlight its layer
                lastCreatedWorkAreaIdRef.current = newWorkAreaId;
                onNewWorkAreaCreated(newWorkArea);
              }
              
              if (workAreasLayerRef.current) {
                workAreasLayerRef.current.refresh();
                
                // 🔥 FIX: Manually trigger popup rebinding after refresh
                // The load event might not fire immediately, so we also trigger it manually
                setTimeout(() => {
                  console.log('🔄 Manually rebinding popups after work area save...');
                  try {
                    // Access the rebind function if it exists in scope
                    // We'll need to store it in a way that's accessible here
                    if (workAreasLayerRef.current) {
                      const workAreas = workAreasLayerRef.current;
                      let featureCount = 0;
                      
                      // Try eachFeature
                      if (typeof workAreas.eachFeature === 'function') {
                        workAreas.eachFeature((feature: any, layer: L.Layer | null | undefined) => {
                          if (feature && layer) {
                            featureCount++;
                            bindWorkAreaPopup(feature, layer);
                          }
                        });
                      }
                      
                      // Fallback: access through _layers
                      if (featureCount === 0) {
                        const layers = (workAreas as any)._layers || {};
                        Object.keys(layers).forEach((key) => {
                          const layer = layers[key];
                          if (layer && layer.feature) {
                            featureCount++;
                            bindWorkAreaPopup(layer.feature, layer);
                          }
                        });
                      }
                      
                      console.log(`✅ Manually rebound popups to ${featureCount} features after save`);
                    }
                  } catch (err) {
                    console.warn('Error manually rebinding popups:', err);
                  }
                }, 500); // Wait a bit longer for refresh to complete
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
              try {
                map.pm.disableDraw();
              } catch (e) {
                // Ignore if already disabled
              }
              // 🔥 FIX: Safely disable global modes (prevents "wrong listener type: undefined")
              safelyDisableGeomanModes(map);
              
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
                errorMessage = "Permission denied. Please ensure you're logged in with an ArcGIS account that has edit permissions for the workarea layer.";
              } else if (err?.code === 401 || err?.message?.includes("401") || err?.message?.includes("Invalid token")) {
                errorMessage = "Authentication failed. Please log in with your ArcGIS account.";
              } else if (err?.message?.includes("ResizeObserver") || err?.message?.includes("window is not defined")) {
                errorMessage = "Initialization error. Please refresh the page.";
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
                      await saveRecordPoint(recordsLayerUrl, point.lat, point.lng, attributes);
                      console.log("✅ Record saved to ArcGIS successfully");
                      recordSavedToArcGISRef.current = true;
                      
                      // 🔥 Fix invisible drawing: Refresh ONLY the Point layer (not all layers)
                      // This ensures the new record appears without removing the just-drawn geometry
                      if (recordsPointLayerRef.current) {
                        setTimeout(() => {
                          try {
                            recordsPointLayerRef.current?.refresh();
                            console.log("✅ Refreshed Records_Point layer only");
                            
                            // 🔥 FIX: Rebind work area popups after record save (they might get lost)
                            if (workAreasLayerRef.current && rebindWorkAreaPopupsRef.current) {
                              setTimeout(() => {
                                console.log('🔄 Rebinding work area popups after record save...');
                                rebindWorkAreaPopupsRef.current?.();
                              }, 300);
                            }
                          } catch (err) {
                            console.warn("Could not refresh Point layer:", err);
                          }
                        }, 500); // Small delay to ensure ArcGIS commit
                      }
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
                      if (geometryType === "Line") {
                        await saveRecordLine(recordsLayerUrl, path, attributes);
                      } else {
                        await saveRecordPolygon(recordsLayerUrl, path, attributes);
                      }
                      console.log("✅ Record saved to ArcGIS successfully");
                      recordSavedToArcGISRef.current = true;
                      
                      // 🔥 Fix invisible drawing: Refresh ONLY the specific layer type (not all layers)
                      // This ensures the new record appears without removing the just-drawn geometry
                      setTimeout(() => {
                        try {
                          if (geometryType === "Line" && recordsLineLayerRef.current) {
                            recordsLineLayerRef.current.refresh();
                            console.log("✅ Refreshed Records_Line layer only");
                          } else if (geometryType === "Polygon" && recordsPolygonLayerRef.current) {
                            recordsPolygonLayerRef.current.refresh();
                            console.log("✅ Refreshed Records_Polygon layer only");
                          }
                          
                          // 🔥 FIX: Rebind work area popups after record save (they might get lost)
                          if (workAreasLayerRef.current && rebindWorkAreaPopupsRef.current) {
                            setTimeout(() => {
                              console.log('🔄 Rebinding work area popups after record save...');
                              rebindWorkAreaPopupsRef.current?.();
                            }, 300);
                          }
                        } catch (err) {
                          console.warn("Could not refresh layer:", err);
                        }
                      }, 500); // Small delay to ensure ArcGIS commit
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

            // Keep the drawn layer visible - let the Esri feature layer "overdraw" it
            // This prevents the "disappearing line" behavior while waiting for layer refresh
            // The temporary layer will remain as visual confirmation until the real feature appears
            
            isDrawingRecordRef.current = false;
            
            // Reset the save flag for next drawing session
            setTimeout(() => {
              recordSavedToArcGISRef.current = false;
            }, 1000);
          };

          // Handle point picking for georeferencing
          const handleMapClick = (e: L.LeafletMouseEvent) => {
            // 🔥 FIX: Don't close popups when clicking on map (unless it's a point pick)
            // Check if click target is a popup or popup-related element
            const target = (e.originalEvent?.target as HTMLElement);
            if (target) {
              const isPopupClick = target.closest?.('.leaflet-popup') || target.closest?.('.leaflet-popup-content-wrapper');
              if (isPopupClick) {
                // Click is on popup, don't close it
                return;
              }
            }
            
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
                // 🔥 Create stable callback references for proper binding/unbinding
                // This prevents "wrong listener type: undefined" errors that cause pane resets
                
                // pm:create handler - stable reference
                const handlePmCreate = (e: any) => {
                  const layer = e.layer;
                  const geojson = layer.toGeoJSON();
                  const geometry = geojson.geometry;

                  // 🔥 Fix invisible shape bug - force redraw immediately after creation
                  setTimeout(() => {
                    if (!map || !mapRef.current) return;

                    try {
                      // Fix 1 — refresh layer bounds (forces Leaflet to compute geometry)
                      if (layer.getBounds) {
                        layer.getBounds();
                      }

                      // Fix 2 — force Leaflet to recalc tile & layer sizes
                      map.invalidateSize({ animate: false });

                      // Fix 3 — force SVG/canvas redraw
                      if (layer.redraw) {
                        layer.redraw();
                      }

                      // Fix 4 — ensure SVG becomes visible immediately (fixes browser "invisible SVG" bug)
                      if (layer._path) {
                        layer._path.setAttribute("stroke-opacity", "1");
                        if (geometry.type === "Polygon") {
                          layer._path.setAttribute("fill-opacity", "0.3");
                        }
                      }
                    } catch (err) {
                      console.warn("Error forcing layer redraw:", err);
                    }
                  }, 50);

                  // ⭐ OPTIMISTIC RENDERING: Show the drawn geometry immediately for instant feedback
                  // This gives users instant visual feedback (like Wiz, Felt, ArcGIS Online)
                  const tempLayer = layer;
                  
                  // Ensure layer is on the map and visible
                  if (!map.hasLayer(tempLayer)) {
                    tempLayer.addTo(map);
                  }
                  
                  // Apply initial optimistic styling (will be updated after save)
                  if (geometry.type === "Polygon") {
                    (tempLayer as L.Polygon).setStyle({
                      color: "#3388ff",
                      weight: 2,
                      opacity: 0.8,
                      fillOpacity: 0.2,
                    });
                  } else if (geometry.type === "LineString") {
                    (tempLayer as L.Polyline).setStyle({
                      color: "#3388ff",
                      weight: 3,
                      opacity: 0.8,
                    });
                  } else if (geometry.type === "Point") {
                    // Points are markers, styling handled in handler
                  }
                  
                  // Disable Geoman editing on temp layer to prevent interference
                  try {
                    tempLayer.pm?.disable();
                  } catch (e) {
                    // Ignore if pm not available
                  }

                  // Determine if this is work area or record
                  // PRIORITY: Check record drawing mode FIRST (georefMode), then work area
                  // Use refs to get current values, not captured closure values
                  console.log("🔍 pm:create event - routing decision:", {
                    geometryType: geometry.type,
                    georefMode: georefModeRef.current,
                    enableWorkAreaDrawing: enableWorkAreaDrawingRef.current,
                  });
                  
                  // ⭐ ASYNC SAVE: Save to ArcGIS in background without blocking UI
                  if (georefModeRef.current !== "none") {
                    // Record drawing mode is active - route to record handler
                    console.log("✅ Routing to handleRecordDrawing");
                    handleRecordDrawing(e)
                      .then(() => {
                        console.log("✅ Record saved to ArcGIS (async)");
                        // Layer will be updated when Esri layer refreshes
                        // Temp layer will naturally be replaced by the real feature
                      })
                      .catch((err) => {
                        console.error("❌ Error saving record:", err);
                        // Visual error feedback - make layer red
                        if (geometry.type === "Polygon") {
                          (tempLayer as L.Polygon).setStyle({ color: "red", opacity: 0.6 });
                        } else if (geometry.type === "LineString") {
                          (tempLayer as L.Polyline).setStyle({ color: "red", opacity: 0.6 });
                        }
                      });
                  } else if (enableWorkAreaDrawingRef.current && geometry.type === "Polygon") {
                    // Work area drawing mode is active - route to work area handler
                    console.log("✅ Routing to handleWorkAreaDrawing");
                    handleWorkAreaDrawing(e)
                      .then(() => {
                        console.log("✅ Work area saved to ArcGIS (async)");
                        // Layer will be updated when Esri layer refreshes
                        // Temp layer will naturally be replaced by the real feature
                      })
                      .catch((err) => {
                        console.error("❌ Error saving work area:", err);
                        // Visual error feedback - make layer red
                        (tempLayer as L.Polygon).setStyle({ color: "red", opacity: 0.6 });
                      });
                  } else {
                    console.log("⚠️ No handler matched - geometry type:", geometry.type);
                  }
                };
                
                // pm:edit handler - stable reference
                const handlePmEdit = () => {
                  setTimeout(() => {
                    if (map && mapRef.current) {
                      map.invalidateSize({ animate: false });
                    }
                  }, 50);
                };
                
                // pm:resize handler - stable reference
                const handlePmResize = () => {
                  setTimeout(() => {
                    if (map && mapRef.current) {
                      map.invalidateSize({ animate: false });
                    }
                  }, 50);
                };
                
                // Store references for cleanup
                pmCreateHandlerRef.current = handlePmCreate;
                pmEditHandlerRef.current = handlePmEdit;
                pmResizeHandlerRef.current = handlePmResize;
                mapClickHandlerRef.current = handleMapClick;
                
                // Bind listeners with stable references
                map.on("pm:create", handlePmCreate);
                map.on("pm:edit", handlePmEdit);
                map.on("pm:resize", handlePmResize);
                
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
      // Clean up resize handler
      if (safeResizeRef.current) {
        window.removeEventListener("resize", safeResizeRef.current);
        safeResizeRef.current = null;
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
      
      // 🔥 Clean up Geoman event listeners with stable references
      // This prevents "wrong listener type" errors and pane resets
      if (mapRef.current) {
        const map = mapRef.current;
        
        // Unbind with stable references (not undefined)
        if (pmCreateHandlerRef.current) {
          map.off("pm:create", pmCreateHandlerRef.current);
          pmCreateHandlerRef.current = null;
        }
        if (pmEditHandlerRef.current) {
          map.off("pm:edit", pmEditHandlerRef.current);
          pmEditHandlerRef.current = null;
        }
        if (pmResizeHandlerRef.current) {
          map.off("pm:resize", pmResizeHandlerRef.current);
          pmResizeHandlerRef.current = null;
        }
        if (mapClickHandlerRef.current) {
          map.off("click", mapClickHandlerRef.current);
          mapClickHandlerRef.current = null;
        }
        if (editModeToggleHandlerRef.current) {
          map.off("pm:globaleditmodetoggled", editModeToggleHandlerRef.current);
          editModeToggleHandlerRef.current = null;
        }
        
        // Disable all drawing modes before removing map
        try {
          map.pm.disableDraw();
        } catch (e) {
          // Ignore errors during cleanup
        }
        // 🔥 FIX: Safely disable global modes (prevents "wrong listener type: undefined")
        safelyDisableGeomanModes(map);
        
        map.remove();
        mapRef.current = null;
      }
    };
  }, []); // Empty dependency array - runs once on mount

  // Separate effect to handle zoom to feature updates without re-initializing the map
  useEffect(() => {
    if (readOnly) return;
    const map = mapRef.current;
    if (!map) return;

    setTimeout(() => {
      try {
        if (!map.getPane('mapPane') || !map.getContainer()) {
          console.warn("Map not ready for zoom, skipping...");
          return;
        }

        const feature = zoomToFeature?.feature;
        if (feature?.geometry) {
          isRestoringViewRef.current = true;
          zoomToEsriFeature(map, feature);

          setTimeout(() => {
            if (!map) return;
            lastCenterRef.current = map.getCenter();
            lastZoomRef.current = map.getZoom();
            isRestoringViewRef.current = false;
          }, 600);
        } else if (feature && !feature.geometry) {
          console.warn("Skipping zoom — feature missing geometry:", feature);
        }
      } catch (err) {
        console.error("Error zooming to feature:", err);
        isRestoringViewRef.current = false;
      }
    }, 400);
  }, [zoomToFeature?.version]);

  // Separate effect to handle focusPoint/focusZoom updates
  // Only set view if we don't have a tracked view state (first mount) or if explicitly needed
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Only set view if we don't have a tracked center/zoom yet (first initialization)
    // This prevents the map from resetting when parent props change
    if (focusPoint && (!lastCenterRef.current || !lastZoomRef.current)) {
      map.setView([focusPoint.lat, focusPoint.lng], focusZoom);
    }
  }, [focusPoint, focusZoom]);

  // Separate effect to handle enableDrop/onDropFilesAt
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const mapContainer = document.getElementById(mapId);
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
  }, [enableWorkAreaDrawing, readOnly]);

  useEffect(() => {
    georefModeRef.current = georefMode;
  }, [georefMode]);

  useEffect(() => {
    pendingRecordMetadataRef.current = pendingRecordMetadata;
  }, [pendingRecordMetadata]);

  // 🔥 PATCH A: Respond to work area draw triggers even when memoized
  // This ensures draw mode activates even after memoization prevents re-renders
  useEffect(() => {
    if (readOnly) return;
    const map = mapRef.current;
    if (!map) return;

    // Only run if the counter increments (command token pattern)
    if (shouldStartWorkAreaDraw > 0) {
      console.log("✏️ Enabling work area draw mode (effect running)", shouldStartWorkAreaDraw);
      
      // Disable any other mode
      try {
        map.pm.disableDraw();
      } catch (e) {
        // Ignore if already disabled
      }
      // 🔥 FIX: Safely disable global modes (prevents "wrong listener type: undefined")
      safelyDisableGeomanModes(map);

      // Start polygon draw explicitly
      map.pm.enableDraw("Polygon", {
        allowSelfIntersection: false,
        snappable: true,
        snapDistance: 20,
      });
      
      drawingSessionActiveRef.current = true;
      hasActiveWorkAreaRef.current = true;
    }
  }, [shouldStartWorkAreaDraw, readOnly]);

  // 🔒 Only toggle work area drawing when the prop actually changes state.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (enableWorkAreaDrawing === true) {
      console.log("✏️ Enabling work area draw mode");
      // Ensure we disable any existing draw mode first to prevent conflicts
      try {
        map.pm.disableDraw();
      } catch (e) {
        // Ignore if already disabled
      }
      map.pm.enableDraw("Polygon");
      drawingSessionActiveRef.current = true;
      hasActiveWorkAreaRef.current = true;
      
      return () => {
        // Cleanup: disable draw mode when effect re-runs or unmounts
        if (map && mapRef.current) {
          try {
            map.pm.disableDraw();
            drawingSessionActiveRef.current = false;
            hasActiveWorkAreaRef.current = false;
          } catch (e) {
            // Ignore errors during cleanup
          }
        }
      };
    }

    if (enableWorkAreaDrawing === false && drawingSessionActiveRef.current) {
      console.log("🛑 Disabling work area draw mode");
      try {
        map.pm.disableDraw();
      } catch (e) {
        // Ignore if already disabled
      }
      drawingSessionActiveRef.current = false;
      hasActiveWorkAreaRef.current = false;
    }
  }, [enableWorkAreaDrawing]);

  // 🔥 PATCH B: Record drawing mode - respond to draw triggers even when memoized
  // This ensures draw mode activates even after memoization prevents re-renders
  useEffect(() => {
    if (readOnly) return;
    const map = mapRef.current;
    if (!map) return;
    if (shouldStartRecordDraw === 0) return;

    // Only trigger if georefMode is active and command token is set
    if (shouldStartRecordDraw > 0 && georefMode !== "none") {
      console.log("✏️ Starting record draw mode via effect (memo-safe):", georefMode);

      // Disable any active work area draw first to prevent conflicts
      try {
        map.pm.disableDraw();
      } catch (e) {
        // Ignore if already disabled
      }
      // 🔥 FIX: Safely disable global modes (prevents "wrong listener type: undefined")
      safelyDisableGeomanModes(map);

      // Ensure Geoman toolbar is removed - using custom UTILITX toolbar instead
      try {
        map.pm.removeControls();
      } catch (e) {
        // Controls might not exist, that's fine
      }

      // Enable appropriate PM draw mode based on georefMode
      if (georefMode === "line") {
        map.pm.enableDraw("Line", { snappable: true });
      } else if (georefMode === "polygon") {
        map.pm.enableDraw("Polygon", { allowSelfIntersection: false, snappable: true });
      } else if (georefMode === "point") {
        map.pm.enableDraw("Marker", { snappable: true });
      }
    }
  }, [shouldStartRecordDraw, georefMode, readOnly]);

  // Removed duplicate pm:globaleditmodetoggled binding - handled in main initialization effect

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
      if (workAreas && handleWorkAreaClick) {
        try {
          workAreas.off("click", handleWorkAreaClick);
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
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
        
        // Helper function to open drawer with bubble data
        const openBubbleDrawer = () => {
          setRecordDrawerLoading(true);
          setSelectedRecord({
            recordId,
            filename: bubble.fileName,
            thumbnail: undefined, // Bubbles don't have thumbnails yet
            fileUrl: bubbleFileUrl && bubbleFileUrl.startsWith("http") ? bubbleFileUrl : undefined,
            filePath: bubbleFilePath,
            cloudinaryId: bubble.cloudinaryId || bubble.cloudinary_id || bubble.cloudinary_public_id,
            intersectionGuess: undefined, // Not available in bubbles yet
            trustScore: undefined, // Not available in bubbles yet
            utilityType: utilityTypeForPopup,
            city: undefined, // Not available in bubbles yet
            textBlob: undefined, // Not available in bubbles yet
            geometryType: "Point", // Bubbles are always points
            recordType: recordTypeForPopup,
            organization: bubble.orgName,
            processedDate: bubble.processedDate || bubble.uploadedAt,
            uploadedBy: bubble.uploadedBy,
            feature: {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [bubble.position.lng, bubble.position.lat],
              },
            },
            layer: marker,
          });
          setRecordDrawerOpen(true);
          
          // Simulate loading delay (remove in production if not needed)
          setTimeout(() => {
            setRecordDrawerLoading(false);
          }, 300);
        };
        
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
            onMoreDetails={openBubbleDrawer}
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

  // 🔄 REMOVED: Full layer refresh on bubbles/shapes change
  // This was causing invisible drawing bug - reloading all layers removes the just-drawn geometry
  // Instead, we now refresh only the specific layer type that was just drawn (see handleRecordDrawing)
  // useEffect(() => {
  //   // Refresh all three record layers
  //   const layers = [
  //     recordsPointLayerRef.current,
  //     recordsLineLayerRef.current,
  //     recordsPolygonLayerRef.current,
  //   ].filter(Boolean);
  //   
  //   layers.forEach((layer) => {
  //     if (layer) {
  //       try {
  //         layer.refresh();
  //       } catch (err) {
  //         console.warn("Could not refresh records layer:", err);
  //       }
  //     }
  //   });
  // }, [bubbles.length, shapes.length]); // Refresh when record count changes

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

  // Reapply styles when selectedWorkArea changes - wait for all layers to be loaded
  // Cleanup effect for proper map teardown on hot reloads
  useEffect(() => {
    return () => {
      // Only cleanup if we're actually unmounting (not just re-rendering)
      if (mapRef.current) {
        try {
          // 🔥 FIX: Don't call off() without arguments - it causes "wrong listener type: undefined"
          // Instead, properly remove all listeners using remove() which handles cleanup internally
          // mapRef.current.off(); // ❌ REMOVED - causes "wrong listener type: undefined"
          mapRef.current.remove(); // This properly cleans up all listeners
        } catch (err) {
          console.warn("Error during map cleanup:", err);
        }
        mapRef.current = null;
      }
      // Reset initialization flag
      isInitializingRef.current = false;
      // Also clear the container's Leaflet ID to allow re-initialization
      const mapContainer = document.getElementById(mapId);
      if (mapContainer) {
        delete (mapContainer as any)._leaflet_id;
        delete (mapContainer as any)._leaflet;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-md border border-gray-200">
      <div
        id={mapId}
        className="w-full h-full"
      />
      {/* UI overlays */}
      <div className="absolute top-4 right-4 z-[500] pointer-events-none">
        <BasemapToggle map={mapRef.current} arcgisToken={arcgisToken} />
      </div>
      <div className="absolute bottom-4 right-4 z-[500] pointer-events-none">
        <Legend />
      </div>
      <MapProvider map={mapInstance}>
        {React.Children.map(children, (child: React.ReactNode) => {
          if (!React.isValidElement(child)) return child
          return React.cloneElement(child as React.ReactElement<{ map?: L.Map | null }>, {
            map: mapRef.current,
          })
        })}
      </MapProvider>
      
      {/* Record Detail Drawer */}
      <RecordDetailDrawer
        open={recordDrawerOpen}
        onOpenChange={setRecordDrawerOpen}
        recordId={selectedRecord?.recordId}
        filename={selectedRecord?.filename}
        thumbnail={selectedRecord?.thumbnail}
        fileUrl={selectedRecord?.fileUrl}
        filePath={selectedRecord?.filePath}
        cloudinaryId={selectedRecord?.cloudinaryId}
        intersectionGuess={selectedRecord?.intersectionGuess}
        trustScore={selectedRecord?.trustScore}
        utilityType={selectedRecord?.utilityType}
        city={selectedRecord?.city}
        textBlob={selectedRecord?.textBlob}
        geometryType={selectedRecord?.geometryType}
        recordType={selectedRecord?.recordType}
        organization={selectedRecord?.organization}
        processedDate={selectedRecord?.processedDate}
        uploadedBy={selectedRecord?.uploadedBy}
        isLoading={recordDrawerLoading}
        onZoomToRecord={() => {
          if (selectedRecord?.feature && mapRef.current) {
            try {
              const geometry = selectedRecord.feature.geometry;
              zoomToEsriFeature(mapRef.current, geometry);
              console.log("✅ Zoomed to record:", selectedRecord.recordId);
            } catch (error) {
              console.error("Error zooming to record:", error);
            }
          }
        }}
        onViewFile={async () => {
          const record = selectedRecord;
          if (!record) return;
          
          if (record.filePath) {
            try {
              const signedUrl = await getSignedUrl(record.filePath, 3600);
              window.open(signedUrl, "_blank");
            } catch (error: any) {
              console.error("Error generating signed URL:", error);
              alert(`Failed to open file: ${error.message}`);
            }
          } else if (record.fileUrl && record.fileUrl.startsWith("http")) {
            window.open(record.fileUrl, "_blank");
          }
        }}
        feature={selectedRecord?.feature}
        layer={selectedRecord?.layer}
        onAiSummaryUpdated={handleAiSummaryUpdated}
      />
    </div>
  );
}

// 🔥 PATCH 1: Memoize EsriMap to prevent double initialization
// This prevents React from re-rendering or re-mounting the map when parent components change state
export default memo(EsriMap);
