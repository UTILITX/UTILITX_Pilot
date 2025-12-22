import type { LatLng } from "@/lib/record-types"
import { convertArcGISToGeoJSONPolygon } from "@/lib/geometry-utils"
import type { WorkspaceProject } from "@/stores/workspaceStore"
import type { DemoProject, DemoRecord } from "@/zustand/projectStore"

export type SharedWorkareaPayload = {
  projectId: string
  polygon: LatLng[]
  records: DemoRecord[]
}

export function getSharePolygon(
  project: WorkspaceProject | null | undefined,
  fallback: LatLng[],
): LatLng[] {
  if (!project?.geometry) return fallback
  const converted = convertArcGISToGeoJSONPolygon(project.geometry)
  if (converted && converted.length >= 3) {
    return converted
  }
  return fallback
}

export function buildSharedProject(
  project: WorkspaceProject | null | undefined,
  demoProject: DemoProject,
): DemoProject {
  const polygon = getSharePolygon(project, demoProject.polygon)
  return {
    ...demoProject,
    id: project?.id ?? demoProject.id,
    name: project?.name ?? demoProject.name,
    polygon,
  }
}

export function persistSharedWorkarea(project: DemoProject) {
  if (typeof window === "undefined") return
  const payload: SharedWorkareaPayload = {
    projectId: project.id,
    polygon: project.polygon,
    records: project.records,
  }
  window.localStorage.setItem("shared-workarea", JSON.stringify(payload))
}










