import { Spinner } from "./spinner"
import { cn } from "@/lib/utils"

export interface LoadingProps {
  className?: string
  size?: "sm" | "md" | "lg"
  text?: string
  fullScreen?: boolean
}

export function Loading({ className, size = "md", text, fullScreen = false }: LoadingProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Spinner size={size} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {content}
      </div>
    )
  }

  return content
}
