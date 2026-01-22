"use client"

import type React from "react"
import { useState } from "react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { LogIn, Mail } from "lucide-react"
import { signIn } from "next-auth/react"

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoginSuccess: () => void
}

type Provider = "google" | "azure-ad" | null

export function LoginDialog({ open, onOpenChange, onLoginSuccess }: LoginDialogProps) {
  const [loadingProvider, setLoadingProvider] = useState<Provider>(null)

  const handleProviderLogin = async (provider: Exclude<Provider, null>) => {
    if (loadingProvider) return
    setLoadingProvider(provider)

    const res = await signIn(provider, { callbackUrl: "/", redirect: false })

    if (!res) {
      toast.error("Falha ao iniciar sessão", {
        description: "Não foi possível iniciar o fluxo de autenticação. Tente novamente.",
      })
      setLoadingProvider(null)
      return
    }

    if (res.error) {
      const isAccessDenied = res.error === "AccessDenied"

      toast.error(
        isAccessDenied ? "Acesso bloqueado" : "Falha no login",
        {
          description: isAccessDenied
            ? "O seu email não pertence aos domínios autorizados (@legendary.pt / @silver-lining.pt)."
            : "Ocorreu um erro ao autenticar. Tente novamente.",
        }
      )

      setLoadingProvider(null)
      return
    }

    onOpenChange(false)
    onLoginSuccess()

    if (res.url) window.location.href = res.url
  }

  const isLoading = loadingProvider !== null

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isLoading && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bem-vindo</DialogTitle>
          <DialogDescription>
            Entre com a sua conta corporativa (Google/Outlook) para aceder ao sistema de reservas.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="company">Conta da Empresa</TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Use a sua conta corporativa com email{" "}
                <strong>@legendary.pt</strong> ou <strong>@silver-lining.pt</strong> para aceder ao sistema de reservas.
              </p>

              <div className="space-y-2">
                <Button
                  className="w-full"
                  type="button"
                  onClick={() => handleProviderLogin("google")}
                  disabled={isLoading}
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  {loadingProvider === "google" ? "A redirecionar..." : "Entrar com Google"}
                </Button>

                <Button
                  className="w-full"
                  type="button"
                  variant="outline"
                  onClick={() => handleProviderLogin("azure-ad")}
                  disabled={isLoading}
                >
                  <Mail className="mr-2 h-5 w-5" />
                  {loadingProvider === "azure-ad" ? "A redirecionar..." : "Entrar com Outlook / Microsoft"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Outros domínios serão bloqueados automaticamente durante o login.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
