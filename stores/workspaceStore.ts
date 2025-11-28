import { create } from "zustand"
import { calculateGeoJSONAreaSqm } from "@/lib/geometry-utils"

// Lightweight project model used across the workspace.
// It is intentionally generic so we can hydrate it from Esri work areas,
// staged workflow records, or other backends without tight coupling.
export interface WorkspaceProject {
  id: string
  name?: string
  geometry?: any
  areaSqm?: number
  areaKm2?: number
  complexity?: number
  duration?: { start?: string; end?: string }
  coveragePct?: number
  owner?: string
  updatedAt?: string
  // Optional attached records for the active project
  records?: any[]
  // Optional arbitrary metadata bag
  meta?: Record<string, any>
}

export interface WorkspaceState {
  currentProject: WorkspaceProject | null
  // Core project selection
  setCurrentProject: (project: WorkspaceProject | null) => void
  // Partial updates to the current project (e.g., rename, coverage, geometry)
  updateProjectMetadata: (updates: Partial<WorkspaceProject>) => void
  // Attach/replace records associated with the current project
  setRecords: (records: any[]) => void
  // Push a single record into the current project
  addRecord: (record: any) => void
}

function computeAreaKm2(geometry: any): number | undefined {
  if (!geometry) return undefined

  try {
    const sqm = calculateGeoJSONAreaSqm(geometry)
    if (typeof sqm !== "number" || Number.isNaN(sqm)) return undefined
    return sqm / 1_000_000
  } catch (e) {
    console.error("Area computation failed:", e)
    return undefined
  }
}

function aggregateUtilities(records: any[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const rec of records) {
    const key = (rec.utilityType || rec.utility || rec.domain || "unknown") as string
    map[key] = (map[key] || 0) + 1
  }
  return map
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentProject: null,

  setCurrentProject: (project) =>
    set(() => {
      if (!project) {
        return { currentProject: null }
      }

      return {
        currentProject: {
          ...project,
          areaKm2: computeAreaKm2(project.geometry ?? project),
        },
      }
    }),

  updateProjectMetadata: (updates) =>
    set((state) => {
      if (!state.currentProject) return { currentProject: null }

      const next: WorkspaceProject = {
        ...state.currentProject,
        ...updates,
      }

      if (updates.geometry) {
        next.areaKm2 = computeAreaKm2(updates.geometry)
      }

      return { currentProject: next }
    }),

  setRecords: (records) =>
    set((state) => {
      if (!state.currentProject) return { currentProject: null }
      const utilities = aggregateUtilities(records)
      return {
        currentProject: {
          ...state.currentProject,
          records,
          meta: {
            ...(state.currentProject.meta || {}),
            coverage: {
              recordCount: records.length,
              utilities,
            },
          },
        },
      }
    }),

  addRecord: (record) =>
    set((state) => {
      if (!state.currentProject) return { currentProject: null }
      const existing = state.currentProject.records || []
      const records = [...existing, record]
      const utilities = aggregateUtilities(records)
      return {
        currentProject: {
          ...state.currentProject,
          records,
          meta: {
            ...(state.currentProject.meta || {}),
            coverage: {
              recordCount: records.length,
              utilities,
            },
          },
        },
      }
    }),
}))


