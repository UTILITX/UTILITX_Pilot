import dynamic from "next/dynamic"

const SharePageClient = dynamic(() => import("./client"), {
  ssr: false,
})

export function generateStaticParams() {
  // Return a placeholder path for static export - actual routes handled client-side
  return [{ id: ["placeholder"] }]
}

export default function SharePage() {
  return <SharePageClient />
}
