"use client"

import Link from "next/link"
import { Bell, HelpCircle, User } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface WorkArea {
  id: string
  name: string
  region?: string
  owner?: string
  createdBy?: string
  date?: string
  notes?: string
  records?: any[]
}

interface TopbarProps {
  workAreas?: WorkArea[]
  selectedWorkArea?: WorkArea | null
  handleSelectProject?: (id: string) => void
}

export default function Topbar({ workAreas = [], selectedWorkArea = null, handleSelectProject }: TopbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-white border-b border-[var(--utilitx-gray-200)] shadow-sm">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left: Logo */}
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-[var(--utilitx-gray-900)]">UTILITX</h1>
        </div>

        {/* Center: Project Selector */}
        <div className="flex-1 flex justify-center">
          <Select
            value={selectedWorkArea?.id}
            onValueChange={(id) => handleSelectProject?.(id)}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select Project / Work Area" />
            </SelectTrigger>
            <SelectContent>
              {workAreas.map((wa) => (
                <SelectItem key={wa.id} value={wa.id}>
                  {wa.name || wa.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <button
            className="p-2 rounded-lg hover:bg-[#d7e0eb] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-[#68869a]" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-[#d7e0eb] transition-colors"
            aria-label="Help"
          >
            <HelpCircle className="h-5 w-5 text-[#68869a]" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-[#d7e0eb] transition-colors"
            aria-label="User Profile"
          >
            <div className="h-8 w-8 rounded-full bg-[#011e31] flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          </button>
        </div>
      </div>
    </header>
  )
}

