"use client";

import { useEffect, useState, useRef } from "react";
import * as EL from "esri-leaflet";
import L from "leaflet";

type BasemapToggleProps = {
  map: L.Map | null;
};

type BasemapType = "Imagery" | "Streets" | "Topographic";

const BasemapToggle = ({ map }: BasemapToggleProps) => {
  const [activeBasemap, setActiveBasemap] = useState<BasemapType>("Streets");
  const basemapLayersRef = useRef<Record<string, L.TileLayer>>({});
  const currentBasemapRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!map) return;

    const apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY;
    if (!apiKey) {
      console.warn("ArcGIS API key not found");
      return;
    }

    // Initialize basemap layers
    // Note: Using basemapLayer (deprecated but functional)
    // When esri-leaflet is upgraded, migrate to: EL.Vector.vectorBasemapLayer("ArcGIS:Streets", { apiKey })
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

    basemapLayersRef.current = basemaps;

    // Detect if a basemap is already on the map (from EsriMap initialization)
    let foundExisting = false;
    map.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer && layer._url) {
        const url = layer._url.toLowerCase();
        if (url.includes("imagery")) {
          currentBasemapRef.current = layer;
          setActiveBasemap("Imagery");
          foundExisting = true;
        } else if (url.includes("topographic")) {
          currentBasemapRef.current = layer;
          setActiveBasemap("Topographic");
          foundExisting = true;
        } else if (url.includes("street")) {
          currentBasemapRef.current = layer;
          setActiveBasemap("Streets");
          foundExisting = true;
        }
      }
    });

    // If no basemap found, add default
    if (!foundExisting) {
      const defaultBasemap = basemaps.Streets;
      defaultBasemap.addTo(map);
      currentBasemapRef.current = defaultBasemap;

      defaultBasemap.on("load", () => {
        const tileMax = (defaultBasemap.options as any).maxZoom ?? 19;
        map.setMaxZoom(tileMax);
      });
    }
  }, [map]);

  const switchBasemap = (basemapType: BasemapType) => {
    if (!map || activeBasemap === basemapType) return;

    // Remove current basemap (only if it's one we manage)
    if (currentBasemapRef.current && map.hasLayer(currentBasemapRef.current)) {
      // Check if it's one of our managed basemaps
      const isManaged = Object.values(basemapLayersRef.current).includes(currentBasemapRef.current);
      if (isManaged) {
        map.removeLayer(currentBasemapRef.current);
      }
    }

    // Add new basemap
    const newBasemap = basemapLayersRef.current[basemapType];
    if (newBasemap) {
      newBasemap.addTo(map);
      currentBasemapRef.current = newBasemap;
      setActiveBasemap(basemapType);

      // Update map maxZoom when basemap loads
      newBasemap.on("load", () => {
        const tileMax = (newBasemap.options as any).maxZoom ?? 19;
        map.setMaxZoom(tileMax);
      });
    }
  };

  if (!map) return null;

  return (
    <div 
      className="absolute top-4 right-2 z-[1000] flex gap-2"
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="
          bg-white/20 backdrop-blur-xl border border-white/40
          rounded-full px-3 py-2 shadow-lg
          flex gap-2
        "
      >
        <button
          onClick={() => switchBasemap("Imagery")}
          className={`
            text-sm font-medium px-3 py-1.5 rounded-full transition-all
            ${activeBasemap === "Imagery"
              ? "bg-white/40 shadow-sm text-gray-900"
              : "bg-white/10 text-gray-700 hover:bg-white/30 hover:shadow"
            }
            active:scale-[0.97]
          `}
        >
          Imagery
        </button>

        <button
          onClick={() => switchBasemap("Streets")}
          className={`
            text-sm font-medium px-3 py-1.5 rounded-full transition-all
            ${activeBasemap === "Streets"
              ? "bg-white/40 shadow-sm text-gray-900"
              : "bg-white/10 text-gray-700 hover:bg-white/30 hover:shadow"
            }
            active:scale-[0.97]
          `}
        >
          Streets
        </button>

        <button
          onClick={() => switchBasemap("Topographic")}
          className={`
            text-sm font-medium px-3 py-1.5 rounded-full transition-all
            ${activeBasemap === "Topographic"
              ? "bg-white/40 shadow-sm text-gray-900"
              : "bg-white/10 text-gray-700 hover:bg-white/30 hover:shadow"
            }
            active:scale-[0.97]
          `}
        >
          Topographic
        </button>
      </div>
    </div>
  );
};

export default BasemapToggle;

