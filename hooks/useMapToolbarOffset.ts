"use client"

import { useEffect, useState, type RefObject } from "react"

const SAFE_PADDING_PX = 8
const WORKSPACE_WIDTH_PX = 250

export function useMapToolbarOffset(mapRef: RefObject<HTMLElement> | null) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined") return

    const updateOffset = () => {
      const element = mapRef?.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      setOffset(rect.left + WORKSPACE_WIDTH_PX + SAFE_PADDING_PX)
    }

    updateOffset()

    const handleResize = () => updateOffset()
    window.addEventListener("resize", handleResize)

    const observer = new MutationObserver(() => updateOffset())
    observer.observe(document.body, { attributes: true, childList: true, subtree: true })

    return () => {
      window.removeEventListener("resize", handleResize)
      observer.disconnect()
    }
  }, [mapRef])

  return offset
}

