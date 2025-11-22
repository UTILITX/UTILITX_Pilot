import { redirect } from "next/navigation"

// Force dynamic rendering - redirects must be dynamic
export const dynamic = 'force-dynamic'

export default function Page() {
  redirect("/map")
}
