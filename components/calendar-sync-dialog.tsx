"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface CalendarSyncDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSync: (syncGoogle: boolean, syncMicrosoft: boolean) => void
}

export function CalendarSyncDialog({ open, onOpenChange, onSync }: CalendarSyncDialogProps) {
  const [syncGoogle, setSyncGoogle] = useState(false)
  const [syncMicrosoft, setSyncMicrosoft] = useState(false)

  const handleSync = () => {
    onSync(syncGoogle, syncMicrosoft)
    onOpenChange(false)
  }

  const nothingSelected = !syncGoogle && !syncMicrosoft

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sincronizar com Calendário</DialogTitle>
          <DialogDescription>
            Escolhe com que calendários queres sincronizar esta reserva.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="google"
              checked={syncGoogle}
              onCheckedChange={(checked) => setSyncGoogle(!!checked)}
            />
            <Label htmlFor="google" className="cursor-pointer">
              Sincronizar com Google Calendar
            </Label>
          </div>

          <div className="flex items-center space-x-2 opacity-60 cursor-not-allowed">
            <Checkbox
              id="microsoft"
              checked={syncMicrosoft}
              onCheckedChange={(checked) => setSyncMicrosoft(!!checked)}
              disabled
            />
            <Label htmlFor="microsoft" className="cursor-not-allowed">
              Sincronizar com Microsoft 365 (brevemente)
            </Label>
          </div>

          {!nothingSelected && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <p className="font-medium mb-1">Autenticação necessária</p>
              <p>
                Ao continuar, poderás ser redirecionado para autenticar a tua conta do
                calendário escolhido. A sincronização é segura e apenas usada para criar
                eventos da reunião.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSync} disabled={nothingSelected}>
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
