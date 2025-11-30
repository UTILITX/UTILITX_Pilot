"use client"

import { Sparkles } from "lucide-react"

type AITagProps = {
  label?: string
}

export function AITag({ label = "AI-Powered" }: AITagProps) {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--utilitx-light-blue)] border border-[var(--utilitx-blue)]">
      <Sparkles className="w-3 h-3 text-[var(--utilitx-blue)]" />
      <span className="text-xs font-medium text-[var(--utilitx-blue)]">{label}</span>
    </div>
  )
}

