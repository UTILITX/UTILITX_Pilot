"use client";

import { createContext, useContext, ReactNode } from "react";
import type L from "leaflet";

type MapContextType = {
  map: L.Map | null;
};

const MapContext = createContext<MapContextType>({ map: null });

export function MapProvider({ map, children }: { map: L.Map | null; children: ReactNode }) {
  return <MapContext.Provider value={{ map }}>{children}</MapContext.Provider>;
}

export function useMap() {
  return useContext(MapContext);
}

