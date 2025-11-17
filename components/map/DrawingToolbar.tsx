"use client";

import { Plus, Minus, Type, Edit3, Trash2, Undo2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import L from "leaflet";

type DrawingToolbarProps = {
  map: L.Map | null;
};

export default function DrawingToolbar({ map }: DrawingToolbarProps) {
  const [undoStack, setUndoStack] = useState<L.Layer[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  // -------------------------------
  // Helper: Add to Undo Stack
  // -------------------------------
  const addToUndoStack = useCallback((layer: L.Layer) => {
    setUndoStack((prev) => [...prev, layer]);
  }, []);

  // Listen for new layers being created to add to undo stack
  useEffect(() => {
    if (!map) return;

    const handleLayerCreate = (e: any) => {
      if (e.layer) {
        addToUndoStack(e.layer);
      }
    };

    const handleEditModeToggle = () => {
      setIsEditMode(map.pm?.globalEditEnabled() || false);
    };

    const handleRemovalModeToggle = () => {
      setIsDeleteMode(map.pm?.globalRemovalEnabled() || false);
    };

    map.on("pm:create", handleLayerCreate);
    map.on("pm:globaleditmodetoggled", handleEditModeToggle);
    map.on("pm:globalremovalmodetoggled", handleRemovalModeToggle);

    return () => {
      map.off("pm:create", handleLayerCreate);
      map.off("pm:globaleditmodetoggled", handleEditModeToggle);
      map.off("pm:globalremovalmodetoggled", handleRemovalModeToggle);
    };
  }, [map, addToUndoStack]);

  // Early return after all hooks
  if (!map) return null;

  // -------------------------------
  // Undo Last Created Layer
  // -------------------------------
  const undoLast = () => {
    if (undoStack.length === 0) return;
    
    const last = undoStack[undoStack.length - 1];
    if (last && map.hasLayer(last)) {
      try {
        map.removeLayer(last);
        setUndoStack((prev) => prev.slice(0, -1));
      } catch (e) {
        console.error("Undo error:", e);
      }
    } else {
      // Remove invalid layers from stack
      setUndoStack((prev) => prev.slice(0, -1));
    }
  };

  // -------------------------------
  // Text Annotation
  // -------------------------------
  const addTextAnnotation = () => {
    const center = map.getCenter();

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
    });

    const marker = L.marker(center, { icon: divIcon, draggable: true }).addTo(map);
    addToUndoStack(marker);
  };

  // -------------------------------
  // Edit Mode
  // -------------------------------
  const toggleEdit = () => {
    if (map.pm.globalEditEnabled()) {
      map.pm.disableGlobalEditMode();
      setIsEditMode(false);
    } else {
      map.pm.disableDraw();
      map.pm.disableGlobalRemovalMode();
      map.pm.enableGlobalEditMode();
      setIsEditMode(true);
      setIsDeleteMode(false);
    }
  };

  // -------------------------------
  // Delete Mode
  // -------------------------------
  const toggleDelete = () => {
    if (map.pm.globalRemovalEnabled()) {
      map.pm.disableGlobalRemovalMode();
      setIsDeleteMode(false);
    } else {
      map.pm.disableDraw();
      map.pm.disableGlobalEditMode();
      map.pm.enableGlobalRemovalMode();
      setIsDeleteMode(true);
      setIsEditMode(false);
    }
  };

  return (
    <div
      className="
        absolute top-4 left-[536px] z-[9999]
        flex flex-col gap-1.5
        bg-white/20 backdrop-blur-xl 
        border border-white/40 
        rounded-xl p-1.5 
        shadow-[0_4px_30px_rgba(0,0,0,0.12)]
      "
    >
      {/* Zoom In */}
      <button className="utilitx-btn" onClick={() => map.zoomIn()}>
        <Plus size={16} />
      </button>

      {/* Zoom Out */}
      <button className="utilitx-btn" onClick={() => map.zoomOut()}>
        <Minus size={16} />
      </button>

      {/* Text */}
      <button className="utilitx-btn" onClick={addTextAnnotation}>
        <Type size={16} />
      </button>

      {/* Edit */}
      <button 
        className={`utilitx-btn ${isEditMode ? 'active' : ''}`}
        onClick={toggleEdit}
      >
        <Edit3 size={16} />
      </button>

      {/* Delete */}
      <button 
        className={`utilitx-btn ${isDeleteMode ? 'active' : ''}`}
        onClick={toggleDelete}
      >
        <Trash2 size={16} />
      </button>

      {/* Undo */}
      <button 
        className="utilitx-btn" 
        onClick={undoLast}
        disabled={undoStack.length === 0}
      >
        <Undo2 size={16} />
      </button>
    </div>
  );
}
