import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/contexts/auth"
import logoImage from "@/assets/logo.png"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login({ username: username.trim(), password })
      navigate("/dashboard")
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : "Login failed"
      const msg = message ?? "Login failed"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="min-h-screen grid lg:grid-cols-2">
        <div className="flex items-center justify-center p-6">
          <Card className="w-full max-w-md !border-0 !shadow-none outline-none ring-0">
            <CardHeader className="space-y-2 p-8">
              <div className="flex items-center mb-10">
                <img 
                  src={logoImage} 
                  alt="Madison 88" 
                  className="h-12 w-auto"
                />
              </div>
              <CardTitle className="text-2xl">Log in to your account</CardTitle>
              <CardDescription>Please enter your details</CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-2 px-8 pb-8">
                <div className="space-y-3 mt-1">
                  <Label htmlFor="username" className="block">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-3 mt-1">
                  <Label htmlFor="password" className="block">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={remember}
                      onCheckedChange={(checked) => setRemember(checked === true)}
                      disabled={loading}
                    />
                    <Label
                      htmlFor="remember"
                      className="text-sm font-normal text-muted-foreground cursor-pointer"
                    >
                      Remember for 30 days
                    </Label>
                  </div>
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline underline-offset-4"
                    disabled={loading}
                    onClick={() => {
                      // TODO: wire password reset flow
                      toast.error("Password reset not implemented yet.")
                    }}
                  >
                    Forgot password
                  </button>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4 px-8 pb-8">
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
                  disabled={loading}
                >
                  {loading ? "Logging in…" : "Log in"}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  By logging in, you agree to our{" "}
                  <span className="underline underline-offset-4">Terms of Use</span>.
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>

        <div className="relative hidden lg:block overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundColor: '#1a2539' }} />
          <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_20%_20%,white,transparent_45%),radial-gradient(circle_at_80%_10%,white,transparent_35%)]" />

          <div className="relative h-full p-10 flex items-center justify-center">
            <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-10">
              <div className="text-white/90 text-sm font-medium">Madison 88</div>
              <div className="mt-2 text-white text-4xl font-semibold leading-tight">
                Development Tracker
              </div>

              <div className="mt-8 flex justify-center">
                <div className="relative w-[520px] max-w-full">
                  <div className="absolute -inset-6 rounded-[2.5rem] bg-black/20 blur-2xl" />
                  <div className="relative aspect-[16/10] rounded-[2rem] border border-white/15 bg-gradient-to-br from-white/10 to-white/5 overflow-hidden">
                    <div className="absolute inset-0 grid grid-cols-12 gap-3 p-6 opacity-80">
                      <div className="col-span-4 space-y-3">
                        <div className="h-10 rounded-lg bg-white/10" />
                        <div className="h-6 rounded-lg bg-white/10" />
                        <div className="h-6 rounded-lg bg-white/10" />
                        <div className="h-6 rounded-lg bg-white/10" />
                      </div>
                      <div className="col-span-8 space-y-3">
                        <div className="h-12 rounded-lg bg-white/10" />
                        <div className="h-24 rounded-lg bg-white/10" />
                        <div className="h-24 rounded-lg bg-white/10" />
                      </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
