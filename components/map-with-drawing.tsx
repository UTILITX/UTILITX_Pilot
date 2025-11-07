"use client";

import EsriMap from "@/components/EsriMap";

export default function MapWithDrawingWrapper() {
  return (
    <div className="h-full w-full flex flex-col">
      <EsriMap />
    </div>
  );
}
