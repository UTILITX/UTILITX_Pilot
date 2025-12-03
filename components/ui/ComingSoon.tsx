"use client"

import { useState } from "react"

export function ComingSoon({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {children}
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
          onClick={() => setOpen(false)}
        >
          <div className="bg-white p-4 rounded shadow-lg max-w-sm">
            <h2 className="font-semibold text-lg">🚧 Coming Soon</h2>
            <p className="text-sm text-gray-500 mt-2">
              This AI feature will be available in the April Pilot.
            </p>
          </div>
        </div>
      )}
    </>
  )
}






