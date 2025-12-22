"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { useProjectStore } from "@/zustand/projectStore"
import { formatDistanceToNow } from "date-fns"

export default function SectionCollaborators() {
  const collaborators = useProjectStore((state) => state.collaborators)
  const addCollaborator = useProjectStore((state) => state.addCollaborator)
  const [email, setEmail] = useState("")

  const handleShare = () => {
    const trimmed = email.trim()
    if (!trimmed) {
      toast({ title: "Enter an email address." })
      return
    }
    addCollaborator(trimmed)
    setEmail("")
    toast({ title: "Invitation sent" })
  }

  return (
    <section className="border-b border-border/50 pb-6">
      <h2 className="text-lg font-semibold mb-1">Collaborate With Your Team</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Invite teammates instantly and keep everyone looped in for this Work Area.
      </p>

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Add email…"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              handleShare()
            }
          }}
        />
        <Button onClick={handleShare}>Share</Button>
      </div>

      <div className="space-y-3">
        {collaborators.length === 0 ? (
          <p className="text-sm text-muted-foreground">No collaborators yet.</p>
        ) : (
          collaborators.map((collaborator) => (
            <div
              key={collaborator.id}
              className="flex items-center justify-between rounded-lg border border-border/70 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-200" />
                <div>
                  <p className="text-sm font-medium">{collaborator.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {collaborator.role} · invited{" "}
                    {formatDistanceToNow(new Date(collaborator.invitedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline">
                View
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}










