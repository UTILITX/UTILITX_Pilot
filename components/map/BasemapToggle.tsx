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
  const basemapLayersRef = useRef<Record<string, L.TileLayer>>({}); // Kept for compatibility but not used for switching
  const currentBasemapRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!map) return;

    const apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY;
    if (!apiKey) {
      console.warn("ArcGIS API key not found");
      return;
    }

    // Initialize basemap layers (factory functions - create new instances when needed)
    const createBasemap = (type: BasemapType): L.TileLayer => {
      return EL.basemapLayer(type, {
        apikey: apiKey,
        maxZoom: 19,
      });
    };

    // Store factory function instead of instances
    basemapLayersRef.current = {
      Imagery: createBasemap("Imagery"),
      Streets: createBasemap("Streets"),
      Topographic: createBasemap("Topographic"),
    };

    // Detect if a basemap is already on the map (from EsriMap initialization)
    // Check all layers and find the first basemap tile layer
    let foundExisting = false;
    map.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer && layer._url && !foundExisting) {
        const url = layer._url.toLowerCase();
        // Check if this is an ArcGIS basemap layer
        if (url.includes("arcgis.com") || url.includes("arcgisonline.com")) {
          if (url.includes("imagery") || url.includes("world_imagery")) {
            currentBasemapRef.current = layer;
            setActiveBasemap("Imagery");
            foundExisting = true;
          } else if (url.includes("topographic") || url.includes("world_topo")) {
            currentBasemapRef.current = layer;
            setActiveBasemap("Topographic");
            foundExisting = true;
          } else if (url.includes("street") || url.includes("world_street")) {
            currentBasemapRef.current = layer;
            setActiveBasemap("Streets");
            foundExisting = true;
          }
        }
      }
    });

    // If no basemap found, add default (shouldn't happen as EsriMap adds one, but just in case)
    if (!foundExisting) {
      const defaultBasemap = createBasemap("Streets");
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

    // Remove all existing basemap tile layers from map
    // This ensures we don't have multiple basemaps stacked
    const layersToRemove: L.Layer[] = [];
    map.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer && layer._url) {
        const url = layer._url.toLowerCase();
        // Check if this is an ArcGIS basemap layer
        if (url.includes("arcgis.com") || url.includes("arcgisonline.com")) {
          if (url.includes("imagery") || url.includes("topographic") || url.includes("street") || 
              url.includes("world_imagery") || url.includes("world_topo") || url.includes("world_street")) {
            layersToRemove.push(layer);
          }
        }
      }
    });

    // Remove all basemap layers
    layersToRemove.forEach(layer => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });

    // Clear the current basemap ref
    currentBasemapRef.current = null;

    // Create and add new basemap
    const apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY;
    if (!apiKey) {
      console.warn("ArcGIS API key not found");
      return;
    }

    const newBasemap = EL.basemapLayer(basemapType, {
      apikey: apiKey,
      maxZoom: 19,
    });

    newBasemap.addTo(map);
    currentBasemapRef.current = newBasemap;
    setActiveBasemap(basemapType);

    // Update map maxZoom when basemap loads
    newBasemap.on("load", () => {
      const tileMax = (newBasemap.options as any).maxZoom ?? 19;
      map.setMaxZoom(tileMax);
    });
  };

  if (!map) return null;

  return (
    <div
      className="
        pointer-events-auto
        bg-white/20 backdrop-blur-xl border border-white/40
        rounded-full px-3 py-2 shadow-lg flex gap-2
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
  );
};

export default BasemapToggle;

