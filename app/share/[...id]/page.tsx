import nextDynamic from "next/dynamic"

// Force dynamic rendering - NO static generation
export const dynamic = 'force-dynamic'

const SharePageClient = nextDynamic(() => import("./client"), {
  ssr: false,
})

export default function SharePage() {
  return <SharePageClient />
}
