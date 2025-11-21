"use client";

import React, { useEffect, useState, memo } from "react";
import type { ReactNode } from "react";
import EsriMap from "@/components/EsriMap";
import type { LatLng } from "@/lib/record-types";
import type { GeorefMode } from "@/lib/types";
import type L from "leaflet";

export type MapBubble = {
  id: string;
  position: LatLng;
  title: string;
  description: string;
  recordLabel?: string;
  size?: number;
  // File data for popup
  filePath?: string;
  fileUrl?: string;
  fileName?: string;
  // Cloudinary thumbnail support
  cloudinaryId?: string;
  cloudinary_id?: string;
  cloudinary_public_id?: string;
  // Record metadata for popup
  recordTypePath?: string;
  source?: string;
  orgName?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  processedDate?: string;
};

export type GeorefShape = {
  id: string;
  type: "LineString" | "Polygon";
  path: LatLng[];
  title: string;
  description: string;
  strokeColor?: string;
  fillColor?: string;
};

type MapWithDrawingProps = {
  mode?: "draw" | "view";
  polygon?: LatLng[] | null;
  onPolygonChange?: (path: LatLng[], area?: number) => void;
  shouldStartWorkAreaDraw?: number;
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
    result: { type: "Point"; point: LatLng } | { type: "LineString" | "Polygon"; path: LatLng[] }
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
  zoomToFeature?: any | null;
  pendingRecordMetadata?: any;
  children?: ReactNode;
};

function MapWithDrawing({
  mode = "draw",
  polygon,
  onPolygonChange,
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
  pickZoom = 16,
  bubbles = [],
  shapes = [],
  enableDrop = false,
  onDropFilesAt,
  focusPoint,
  focusZoom = 16,
  center,
  zoom,
  zoomToFeature,
  pendingRecordMetadata,
  children,
}: MapWithDrawingProps) {
  const [drawEnabled, setDrawEnabled] = useState(false);
  const [map, setMap] = useState<L.Map | null>(null);

  useEffect(() => {
    if (shouldStartWorkAreaDraw > 0) {
      setDrawEnabled(true);
    }
  }, [shouldStartWorkAreaDraw]);

  useEffect(() => {
    if (polygon && polygon.length >= 3) {
      setDrawEnabled(false);
    }
  }, [polygon]);

  // Handle map ready callback
  const handleMapReady = (mapInstance: L.Map) => {
    console.log("🗺️ MapWithDrawing: Map initialized:", mapInstance);
    setMap(mapInstance);
  };

  return (
    <div className="h-full w-full flex flex-col relative">
      <EsriMap
        mode={mode}
        polygon={polygon}
        onPolygonChange={onPolygonChange}
        enableWorkAreaDrawing={drawEnabled}
        shouldStartWorkAreaDraw={shouldStartWorkAreaDraw}
        shouldStartRecordDraw={shouldStartRecordDraw}
        enableWorkAreaSelection={enableWorkAreaSelection}
        onWorkAreaSelected={onWorkAreaSelected}
        onWorkAreaClick={onWorkAreaClick}
        onOpenWorkAreaAnalysis={onOpenWorkAreaAnalysis}
        onNewWorkAreaCreated={onNewWorkAreaCreated}
        onWorkAreaSelect={onWorkAreaSelect}
        selectedWorkArea={selectedWorkArea}
        arcgisToken={arcgisToken}
        georefMode={georefMode}
        georefColor={georefColor}
        onGeorefComplete={onGeorefComplete}
        pickPointActive={pickPointActive}
        pickZoom={pickZoom}
        bubbles={bubbles}
        shapes={shapes}
        enableDrop={enableDrop}
        onDropFilesAt={onDropFilesAt}
        focusPoint={focusPoint}
        focusZoom={focusZoom}
        center={center}
        zoom={zoom}
        zoomToFeature={zoomToFeature}
        pendingRecordMetadata={pendingRecordMetadata}
        onMapReady={handleMapReady}
      />
      {React.Children.map(children, (child: ReactNode) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<{ map?: L.Map | null }>, {
          map: map,
        });
      })}
    </div>
  );
}

// 🔥 PATCH 2: Memoize MapWithDrawing with shallow comparison
// This ensures MapWithDrawing won't re-render every time left panel opens/closes or switches modes
export default memo(MapWithDrawing, (prev: MapWithDrawingProps, next: MapWithDrawingProps) => {
  // Only re-render if these specific props change
  return (
    prev.shouldStartWorkAreaDraw === next.shouldStartWorkAreaDraw &&
    prev.shouldStartRecordDraw === next.shouldStartRecordDraw &&
    prev.enableWorkAreaSelection === next.enableWorkAreaSelection &&
    prev.zoomToFeature === next.zoomToFeature &&
    prev.mode === next.mode &&
    prev.georefMode === next.georefMode &&
    prev.pickPointActive === next.pickPointActive
  );
});
