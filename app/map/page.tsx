"use client"

// Force dynamic rendering - NO static generation (uses browser APIs like ResizeObserver)
export const dynamic = 'force-dynamic'

import nextDynamic from "next/dynamic"

const ClientMapPage = nextDynamic(() => import("./ClientMapPage"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="text-lg font-medium text-gray-700">Loading map...</div>
      </div>
    </div>
  ),
})

export default function MapPage() {
  return <ClientMapPage />
}
