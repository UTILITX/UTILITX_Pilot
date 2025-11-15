"use client"

import { Bell, HelpCircle, User } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function Topbar() {
  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Logo */}
        <div className="flex items-center">
          <span className="text-xl font-bold text-[#0D1B2A]">UTILITX</span>
        </div>

        {/* Center: Project Selector */}
        <div className="flex-1 flex justify-center">
          <Select>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select Project / Municipality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="project1">Project 1</SelectItem>
              <SelectItem value="project2">Project 2</SelectItem>
              <SelectItem value="municipality1">Municipality 1</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <button
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-gray-600" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Help"
          >
            <HelpCircle className="h-5 w-5 text-gray-600" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="User Profile"
          >
            <div className="h-8 w-8 rounded-full bg-[#0D1B2A] flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          </button>
        </div>
      </div>
    </header>
  )
}

