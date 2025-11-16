import Link from "next/link"

interface BrandLogoProps {
  /**
   * Whether to show the text label
   * @default true
   */
  showLabel?: boolean
  /**
   * Size variant for the text
   * @default "default"
   */
  size?: "small" | "default" | "large"
  /**
   * Whether the logo is clickable (links to home)
   * @default true
   */
  clickable?: boolean
  /**
   * Additional className for the container
   */
  className?: string
}

export default function BrandLogo({
  showLabel = true,
  size = "default",
  clickable = true,
  className = "",
}: BrandLogoProps) {
  const content = (
    <div className={`flex items-center ${className}`}>
      {showLabel && (
        <span
          className={`font-semibold tracking-tight text-[#011e31] ${
            size === 'small' ? 'text-base' : size === 'large' ? 'text-2xl' : 'text-lg'
          }`}
        >
          UTILITX
        </span>
      )}
    </div>
  )

  if (clickable) {
    return (
      <Link href="/" className="flex items-center">
        {content}
      </Link>
    )
  }

  return content
}

