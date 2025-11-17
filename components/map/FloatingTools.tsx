"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Minus, Type, Edit3, Trash2, Undo2 } from "lucide-react"
import L from "leaflet"

type FloatingToolsProps = {
  map?: L.Map | null
}

export default function FloatingTools({ map }: FloatingToolsProps) {
  const [undoStack, setUndoStack] = useState<L.Layer[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [isDeleteMode, setIsDeleteMode] = useState(false)

  const addToUndoStack = useCallback((layer: L.Layer) => {
    setUndoStack((prev) => [...prev, layer])
  }, [])

  useEffect(() => {
    if (!map) return

    const handleLayerCreate = (e: any) => {
      if (e.layer) {
        addToUndoStack(e.layer)
      }
    }

    const handleEditModeToggle = () => {
      setIsEditMode(map.pm?.globalEditEnabled() || false)
    }

    const handleRemovalModeToggle = () => {
      setIsDeleteMode(map.pm?.globalRemovalEnabled() || false)
    }

    map.on("pm:create", handleLayerCreate)
    map.on("pm:globaleditmodetoggled", handleEditModeToggle)
    map.on("pm:globalremovalmodetoggled", handleRemovalModeToggle)

    return () => {
      map.off("pm:create", handleLayerCreate)
      map.off("pm:globaleditmodetoggled", handleEditModeToggle)
      map.off("pm:globalremovalmodetoggled", handleRemovalModeToggle)
    }
  }, [map, addToUndoStack])

  if (!map) return null

  const undoLast = () => {
    if (undoStack.length === 0) return

    const last = undoStack[undoStack.length - 1]
    if (last && map.hasLayer(last)) {
      try {
        map.removeLayer(last)
        setUndoStack((prev) => prev.slice(0, -1))
      } catch (error) {
        console.error("Undo error:", error)
      }
    } else {
      setUndoStack((prev) => prev.slice(0, -1))
    }
  }

  const addTextAnnotation = () => {
    const center = map.getCenter()

    const divIcon = L.divIcon({
      html: `<div contenteditable="true" style="
        padding: 4px 8px;
        background: white;
        border-radius: 4px;
        border: 1px solid #ccc;
        font-size: 14px;
        min-width: 40px;
        cursor: text;
      ">Text</div>`,
      className: "",
      iconSize: [100, 30],
      iconAnchor: [50, 15],
    })

    const marker = L.marker(center, { icon: divIcon, draggable: true }).addTo(map)
    addToUndoStack(marker)
  }

  const toggleEdit = () => {
    if (!map.pm) return

    if (map.pm.globalEditEnabled()) {
      map.pm.disableGlobalEditMode()
      setIsEditMode(false)
    } else {
      map.pm.disableDraw()
      map.pm.disableGlobalRemovalMode()
      map.pm.enableGlobalEditMode()
      setIsEditMode(true)
      setIsDeleteMode(false)
    }
  }

  const toggleDelete = () => {
    if (!map.pm) return

    if (map.pm.globalRemovalEnabled()) {
      map.pm.disableGlobalRemovalMode()
      setIsDeleteMode(false)
    } else {
      map.pm.disableDraw()
      map.pm.disableGlobalEditMode()
      map.pm.enableGlobalRemovalMode()
      setIsDeleteMode(true)
      setIsEditMode(false)
    }
  }

  const buttonClass =
    "w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm text-gray-700 hover:bg-white/40 flex items-center justify-center shadow border border-white/40 transition disabled:opacity-40 disabled:cursor-not-allowed"

  return (
    <div className="absolute bottom-4 left-[440px] z-[500] bg-white/20 backdrop-blur-xl border border-white/40 shadow-lg rounded-xl p-1.5 flex flex-col gap-1.5">
      <button className={buttonClass} onClick={() => map.zoomIn()}>
        <Plus size={14} />
      </button>
      <button className={buttonClass} onClick={() => map.zoomOut()}>
        <Minus size={14} />
      </button>
      <button className={buttonClass} onClick={addTextAnnotation}>
        <Type size={14} />
      </button>
      <button className={`${buttonClass} ${isEditMode ? "bg-white/40 text-blue-600 shadow-sm" : ""}`} onClick={toggleEdit}>
        <Edit3 size={14} />
      </button>
      <button
        className={`${buttonClass} ${isDeleteMode ? "bg-white/40 text-red-600 shadow-sm" : ""}`}
        onClick={toggleDelete}
      >
        <Trash2 size={14} />
      </button>
      <button className={buttonClass} onClick={undoLast} disabled={undoStack.length === 0}>
        <Undo2 size={14} />
      </button>
    </div>
  )
}

