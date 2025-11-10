import dynamic from "next/dynamic"

const RequestPageClient = dynamic(() => import("./client"), {
  ssr: false,
})

export default function RequestPage() {
  return <RequestPageClient />
}
