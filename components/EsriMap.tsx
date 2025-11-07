"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

import * as EL from "esri-leaflet";

declare module "leaflet" {
  interface Map {
    pm: any;
  }
}

import { addFeatureToLayer } from "@/lib/esriUtils";



export default function EsriMap() {
  useEffect(() => {
    // 🗺️ Define basemap layers
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
  
    // 1️⃣ Initialize the map
    const map = L.map("map", {
      center: [43.7, -79.4], // Toronto default
      zoom: 12,
    });

    // 🛠 Fix squished map layout by triggering resize
    setTimeout(() => {
    map.invalidateSize();
    }, 100);
  

    // 2️⃣ Add default basemap
    basemaps.Streets.addTo(map); // 👈 or use Topographic if preferred

    // 🧭 Add layer control to toggle basemaps
    L.control
        .layers(basemaps, undefined, { position: "topright", collapsed: false })
        .addTo(map);


    // 3️⃣ Add hosted WorkAreas layer (polygons)
    const workAreas = EL.featureLayer({
      url: process.env.NEXT_PUBLIC_WORKAREA_LAYER_URL!,
      apikey: process.env.NEXT_PUBLIC_ARCGIS_API_KEY!,
      style: () => ({ color: "#0077ff", weight: 2, fillOpacity: 0.15 }),
    }).addTo(map);

    // 4️⃣ Add hosted Records layer (points)
    const records = EL.featureLayer({
      url: process.env.NEXT_PUBLIC_RECORDS_LAYER_URL!,
      apikey: process.env.NEXT_PUBLIC_ARCGIS_API_KEY!,
      pointToLayer: (_feature, latlng) =>
        L.circleMarker(latlng, { radius: 6, color: "#ff6600", fillOpacity: 0.8 }),
    }).addTo(map);

    // 5️⃣ Enable drawing controls (Leaflet-Geoman)
    map.pm.addControls({
        position: "topleft",
        drawMarker: true,
        drawPolygon: true,
        editMode: true,
        dragMode: false,
        cutPolygon: false,
        removalMode: true,
        });

      

    // 6️⃣ Handle newly created features
    map.on("pm:create", async (e: any) => {
      const layer = e.layer;
      const geojson = layer.toGeoJSON();
      const geometry = geojson.geometry;
      const type = geometry.type;

      const attributes = {
        created_by: "PilotUser",
        timestamp: new Date().toISOString(),
      };

      try {
        if (type === "Polygon") {
          await addFeatureToLayer(
            process.env.NEXT_PUBLIC_WORKAREA_LAYER_URL!,
            geometry,
            attributes
          );
          workAreas.refresh(); // refresh WorkAreas layer
        } else if (type === "Point") {
          await addFeatureToLayer(
            process.env.NEXT_PUBLIC_RECORDS_LAYER_URL!,
            geometry,
            attributes
          );
          records.refresh(); // refresh Records layer
        }
        alert(`✅ ${type} added successfully!`);
      } catch (err) {
        console.error("Error adding feature:", err);
        alert("❌ Failed to add feature.");
      }

      map.removeLayer(layer); // clear the drawn shape after submit
    });

    // Cleanup on unmount
    return () => {
      map.remove();
    };
  }, []);

  return (
    <div
      id="map"
      className="w-full h-[80vh] min-h-[500px] rounded-2xl overflow-hidden shadow-md border border-gray-200"
      />
  );
}
