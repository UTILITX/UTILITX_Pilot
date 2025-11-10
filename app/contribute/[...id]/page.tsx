import dynamic from "next/dynamic"

const ContributePageClient = dynamic(() => import("./client"), {
  ssr: false,
})

export function generateStaticParams() {
  // Return a placeholder path for static export - actual routes handled client-side
  return [{ id: ["placeholder"] }]
}

export default function ContributePage() {
  return <ContributePageClient />
}
