"use client"

import { createContext, useContext, type ReactNode, type RefObject } from "react"

import { useMapToolbarOffset } from "@/hooks/useMapToolbarOffset"

type MapToolbarContextValue = {
  containerRef: RefObject<HTMLDivElement> | null
  toolbarOffset: number
}

const MapToolbarContext = createContext<MapToolbarContextValue>({
  containerRef: null,
  toolbarOffset: 0,
})

interface MapToolbarProviderProps {
  children: ReactNode
  containerRef: RefObject<HTMLDivElement>
}

export function MapToolbarProvider({ children, containerRef }: MapToolbarProviderProps) {
  const toolbarOffset = useMapToolbarOffset(containerRef)
  return (
    <MapToolbarContext.Provider value={{ containerRef, toolbarOffset }}>
      {children}
    </MapToolbarContext.Provider>
  )
}

export function useMapToolbarContext() {
  return useContext(MapToolbarContext)
}

