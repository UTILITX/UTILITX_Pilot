import { create } from "zustand"

type WorkflowState = {
  step: number
  setStep: (s: number) => void
  workAreaCreated: boolean
  filesUploaded: boolean
  markWorkAreaDone: () => void
  markFilesUploaded: () => void
}

export const useWorkflow = create<WorkflowState>((set) => ({
  step: 1,
  setStep: (s) => set({ step: s }),

  workAreaCreated: false,
  filesUploaded: false,

  markWorkAreaDone: () => set({ workAreaCreated: true, step: 2 }),

  markFilesUploaded: () => set({ filesUploaded: true, step: 3 }),
}))

