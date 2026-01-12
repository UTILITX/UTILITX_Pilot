"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Map, 
  FolderOpen, 
  MapPin,
  BarChart3,
  Beaker,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Map", route: "/map", icon: Map },
  { label: "Dashboard", route: "/dashboard", icon: LayoutDashboard },
  { label: "Playground", route: "/pilot/playground", icon: Beaker },
  { label: "Work Areas", route: "/work-areas", icon: MapPin },
  { label: "Records", route: "/records", icon: FolderOpen },
  { label: "Insights", route: "/insights", icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="h-full w-16 flex-shrink-0 bg-[var(--utilitx-navy)] flex flex-col items-center py-4"
      style={{ boxShadow: "var(--utilitx-shadow-light)" }}
    >
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
                  ? "bg-[var(--utilitx-blue)] text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
              title={item.label}
            >
              {/* Left accent bar for active item */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--utilitx-blue)] rounded-r" />
              )}
              
              <Icon className="h-5 w-5" />
              
              {/* Tooltip on hover */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-[var(--utilitx-navy)] text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                {item.label}
              </div>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

