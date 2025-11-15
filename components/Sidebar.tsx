"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Map, 
  FolderOpen, 
  MousePointer, 
  BarChart3 
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Dashboard", route: "/dashboard", icon: LayoutDashboard },
  { label: "Work Areas", route: "/work-areas", icon: Map },
  { label: "Records", route: "/records", icon: FolderOpen },
  { label: "Map", route: "/map", icon: MousePointer },
  { label: "Insights", route: "/insights", icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-[#0D1B2A] flex flex-col items-center py-4 z-50">
      <nav className="flex flex-col gap-2 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.route || 
            (item.route !== "/dashboard" && pathname?.startsWith(item.route))
          
          return (
            <Link
              key={item.route}
              href={item.route}
              className={cn(
                "group relative flex items-center justify-center w-full h-12 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
              title={item.label}
            >
              {/* Left accent bar for active item */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r" />
              )}
              
              <Icon className="h-5 w-5" />
              
              {/* Tooltip on hover */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                {item.label}
              </div>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

