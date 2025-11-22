import nextDynamic from "next/dynamic"

// Force dynamic rendering - NO static generation
export const dynamic = 'force-dynamic'

const RequestPageClient = nextDynamic(() => import("./client"), {
  ssr: false,
})

export default function RequestPage() {
  return <RequestPageClient />
}
