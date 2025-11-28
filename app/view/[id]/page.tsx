import nextDynamic from "next/dynamic"

export const dynamic = "force-dynamic"

const MagicLinkViewer = nextDynamic(() => import("./client"), {
  ssr: false,
})

export default function MagicLinkViewerPage() {
  return <MagicLinkViewer />
}

