"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
// import { getGoogleAuthUrl } from "@/lib/google-calendar"
// import { getMicrosoftAuthUrl } from "@/lib/microsoft-calendar"
import { CheckCircle2, XCircle } from "lucide-react"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [googleConnected, setGoogleConnected] = useState(false)
  const [microsoftConnected, setMicrosoftConnected] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGoogleConnected(!!localStorage.getItem("google_access_token"))
      setMicrosoftConnected(!!localStorage.getItem("microsoft_access_token"))
    }
  }, [open])

  /* Exemplo de handlers quando ativares OAuth
  const handleGoogleConnect = () => {
    const authUrl = getGoogleAuthUrl()
    window.open(authUrl, "_blank", "width=500,height=600")
  }

  const handleMicrosoftConnect = () => {
    const authUrl = getMicrosoftAuthUrl()
    window.open(authUrl, "_blank", "width=500,height=600")
  }
  */

  const handleDisconnect = (provider: "google" | "microsoft") => {
    if (typeof window === "undefined") return

    if (provider === "google") {
      localStorage.removeItem("google_access_token")
      setGoogleConnected(false)
    } else {
      localStorage.removeItem("microsoft_access_token")
      setMicrosoftConnected(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Integrações de Calendário</DialogTitle>
          <DialogDescription>
            Configure a ligação com calendários externos para sincronizar as reservas
            (funcionalidade em desenvolvimento).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Google Calendar */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Google Calendar</Label>
            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-2">
                {googleConnected ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Ligado</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Não ligado</span>
                  </>
                )}
              </div>
              {googleConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect("google")}
                >
                  Desligar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  // onClick={handleGoogleConnect}
                >
                  Ligar Google Calendar (indisponível)
                </Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Requer: variável de ambiente <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>
            </div>
          </div>

          {/* Microsoft Calendar */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Microsoft Calendar</Label>
            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-2">
                {microsoftConnected ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Ligado</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Não ligado</span>
                  </>
                )}
              </div>
              {microsoftConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect("microsoft")}
                >
                  Desligar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  // onClick={handleMicrosoftConnect}
                >
                  Ligar Microsoft Calendar (indisponível)
                </Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Requer: variável de ambiente <code>NEXT_PUBLIC_MICROSOFT_CLIENT_ID</code>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
