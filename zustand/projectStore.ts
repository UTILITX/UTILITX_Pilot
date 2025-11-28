import { create } from "zustand"
import type { LatLng } from "@/lib/record-types"
import type { GeorefShape, MapBubble } from "@/components/map-with-drawing"

export type Collaborator = {
  id: string
  email: string
  role: string
  invitedAt: string
}

export type RecordRequestStatus = "Pending" | "Received"

export interface RecordRequest {
  id: string
  recipient: string
  recordTypes: string[]
  status: RecordRequestStatus
  createdAt: string
}

export interface DemoRecord {
  id: string
  title: string
  type: string
  organization: string
  uploadedBy: string
  uploadedAt: string
  files: number
}

export interface DemoProject {
  id: string
  name: string
  region: string
  areaSqMeters: number
  polygon: LatLng[]
  recordTypes: string[]
  summary: {
    records: number
    files: number
  }
  records: DemoRecord[]
  bubbles: MapBubble[]
  shapes: GeorefShape[]
  meta?: {
    shareId?: string
  }
}

const demoPolygon: LatLng[] = [
  { lat: 40.7194, lng: -74.0123 },
  { lat: 40.7167, lng: -73.9988 },
  { lat: 40.7091, lng: -73.9956 },
  { lat: 40.7062, lng: -74.0035 },
  { lat: 40.7098, lng: -74.0106 },
]

const mapBubbles: MapBubble[] = [
  {
    id: "bubble-asbuilts",
    position: { lat: 40.7145, lng: -74.0054 },
    title: "Hudson River As-Builts",
    description: "Detailed as-built set uploaded 2 days ago",
    recordLabel: "As-Builts",
    size: 28,
  },
  {
    id: "bubble-fiber",
    position: { lat: 40.7118, lng: -74.0021 },
    title: "Fiber Feeder Alignment",
    description: "Fiber plan with conduit depths included",
    recordLabel: "Fiber Plans",
    size: 26,
  },
  {
    id: "bubble-gas",
    position: { lat: 40.7126, lng: -73.9992 },
    title: "Gas Main Survey",
    description: "Surveyed gas main corridor uploaded today",
    recordLabel: "Gas Maps",
    size: 24,
  },
]

const lineShapePath: LatLng[] = [
  { lat: 40.7190, lng: -74.0110 },
  { lat: 40.7160, lng: -74.0050 },
  { lat: 40.7120, lng: -74.0000 },
  { lat: 40.7085, lng: -73.9960 },
]

const mapShapes: GeorefShape[] = [
  {
    id: "shape-boundary",
    type: "Polygon",
    path: demoPolygon,
    title: "Work Area Boundary",
    description: "Hudson River corridor coverage",
    strokeColor: "#2563eb",
    fillColor: "#2563eb22",
  },
  {
    id: "shape-path",
    type: "LineString",
    path: lineShapePath,
    title: "Proposed Fiber Alignment",
    description: "Proposed fiber conduit follows this corridor",
    strokeColor: "#0ea5e9",
  },
]

const demoRecords: DemoRecord[] = [
  {
    id: "record-1",
    title: "Hudson River As-Builts",
    type: "As-Builts",
    organization: "Hudson Utilities",
    uploadedBy: "Elena Parker",
    uploadedAt: "2025-11-24T14:12:00.000Z",
    files: 4,
  },
  {
    id: "record-2",
    title: "Fiber Corridor Profile",
    type: "Fiber Plans",
    organization: "Riverline Telecom",
    uploadedBy: "Nate Kim",
    uploadedAt: "2025-11-22T09:48:00.000Z",
    files: 3,
  },
  {
    id: "record-3",
    title: "North Gas Main Survey",
    type: "Gas Maps",
    organization: "Metro Gas",
    uploadedBy: "Priya Singh",
    uploadedAt: "2025-11-18T11:03:00.000Z",
    files: 7,
  },
]

export const DEMO_PROJECT: DemoProject = {
  id: "magic-link-demo",
  name: "Hudson River Utility Corridor",
  region: "Hudson Valley • NY",
  areaSqMeters: 265_000,
  polygon: demoPolygon,
  recordTypes: ["As-Builts", "Construction Drawings", "Fiber Plans", "Gas Maps", "Sewer / Water"],
  summary: {
    records: 12,
    files: 38,
  },
  records: demoRecords,
  bubbles: mapBubbles,
  shapes: mapShapes,
}

const initialCollaborators: Collaborator[] = [
  {
    id: "collab-owner",
    email: "leigh@utilitx.app",
    role: "Owner",
    invitedAt: "2025-11-20T14:00:00.000Z",
  },
  {
    id: "collab-manager",
    email: "zoe@urbangrid.com",
    role: "Project Manager",
    invitedAt: "2025-11-22T09:15:00.000Z",
  },
]

const initialRecordRequests: RecordRequest[] = [
  {
    id: "req-alectra",
    recipient: "Alectra Utilities",
    recordTypes: ["As-Builts", "Fiber Plans"],
    status: "Pending",
    createdAt: "2025-11-23T11:20:00.000Z",
  },
  {
    id: "req-nyc",
    recipient: "NYC Department of Water",
    recordTypes: ["Gas Maps"],
    status: "Received",
    createdAt: "2025-11-19T08:45:00.000Z",
  },
]

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function resolveProject(id: string | undefined, fallback: DemoProject): DemoProject {
  if (!id) return fallback
  if (id === fallback.id) return fallback
  return {
    ...fallback,
    id,
    meta: {
      shareId: id,
    },
  }
}

export interface ProjectStoreState {
  collaborators: Collaborator[]
  addCollaborator: (email: string) => void
  recordRequests: RecordRequest[]
  addRecordRequest: (payload: { recipient: string; recordTypes: string[] }) => void
  updateRecordRequestStatus: (id: string, newStatus: RecordRequestStatus) => void
  demoProject: DemoProject
  projects: Record<string, DemoProject>
  setProject: (project: DemoProject) => void
  getProjectById: (id: string) => DemoProject | null
}

export const useProjectStore = create<ProjectStoreState>((set, get) => {
  const initialProjects: Record<string, DemoProject> = {
    [DEMO_PROJECT.id]: DEMO_PROJECT,
  }
  return {
    collaborators: initialCollaborators,
    addCollaborator: (email) =>
      set((state) => ({
        collaborators: [
          {
            id: createId(),
            email,
            role: "Collaborator",
            invitedAt: new Date().toISOString(),
          },
          ...state.collaborators,
        ],
      })),
    recordRequests: initialRecordRequests,
    addRecordRequest: ({ recipient, recordTypes }) =>
      set((state) => ({
        recordRequests: [
          {
            id: createId(),
            recipient,
            recordTypes,
            status: "Pending",
            createdAt: new Date().toISOString(),
          },
          ...state.recordRequests,
        ],
      })),
    updateRecordRequestStatus: (id, newStatus) =>
      set((state) => ({
        recordRequests: state.recordRequests.map((request) =>
          request.id === id ? { ...request, status: newStatus } : request,
        ),
      })),
    demoProject: DEMO_PROJECT,
    projects: initialProjects,
    setProject: (project) =>
      set((state) => ({
        projects: {
          ...state.projects,
          [project.id]: project,
        },
      })),
    getProjectById: (id) => {
      if (!id) return null
      const stored = get().projects[id]
      return stored || resolveProject(id, DEMO_PROJECT)
    },
  }
})

