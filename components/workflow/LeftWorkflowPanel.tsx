"use client"

import type { ReactNode } from "react"
import { useWorkflow } from "@/stores/workflow-store"

type LeftWorkflowPanelProps = {
  children: ReactNode
}

export default function LeftWorkflowPanel({ children }: LeftWorkflowPanelProps) {
  const step = useWorkflow((state) => state.step)
  const setStep = useWorkflow((state) => state.setStep)

  return (
    <div className="w-[320px] h-full border-r bg-white shadow flex flex-col">
      {/* Step Rail */}
      <div className="p-4 border-b">
        <div
          className={`py-2 font-semibold cursor-pointer ${
            step === 1 ? "text-blue-600" : "text-gray-700"
          }`}
          onClick={() => setStep(1)}
        >
          1. Define Work Area
        </div>

        <div
          className={`py-2 ${
            step >= 2 ? "text-blue-600 cursor-pointer" : "text-gray-400 cursor-not-allowed"
          }`}
          onClick={() => step >= 2 && setStep(2)}
        >
          2. Attach Records
        </div>

        <div
          className={`py-2 ${
            step >= 3 ? "text-blue-600 cursor-pointer" : "text-gray-400 cursor-not-allowed"
          }`}
          onClick={() => step >= 3 && setStep(3)}
        >
          3. Share & View
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  )
}

