import L from "leaflet";

export const ACTIVE_WORK_AREA_STYLE = {
  color: "rgba(0, 255, 120, 1)",
  weight: 3,
  fillColor: "rgba(0, 255, 120, 0.15)",
  fillOpacity: 0.15,
};

export function setActiveWorkArea(layer: L.Layer) {
  if ((layer as any).setStyle) {
    (layer as any).setStyle?.(ACTIVE_WORK_AREA_STYLE);
  }
  (layer as any).options = {
    ...(layer as any).options,
    pane: "activeWorkAreaPane",
  };
  const el = (layer as any).getElement?.();
  if (el) {
    el.classList.add("active-work-area");
  }
}

export function setInactiveWorkArea(layer: L.Layer, INACTIVE_STYLE: any) {
  if ((layer as any).setStyle) {
    (layer as any).setStyle?.(INACTIVE_STYLE);
  }
  (layer as any).options = {
    ...(layer as any).options,
    pane: "overlayPane",
  };
  const el = (layer as any).getElement?.();
  if (el) {
    el.classList.remove("active-work-area");
  }
}

