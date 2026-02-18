import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft, FileQuestion } from "lucide-react"

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg text-center space-y-8">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-6">
              <FileQuestion className="h-16 w-16 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-6xl font-bold text-foreground">404</h1>
            <h2 className="text-2xl font-semibold text-foreground">Page Not Found</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-base">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate("/dashboard")} size="lg">
            <Home className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)} size="lg">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  )
}
