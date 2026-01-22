"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getCurrentUser,
  updateUser,
  getAllUsers,
  updateUserRole,
  isAdmin,
  createUserByAdmin,
  deleteUser,
  changePassword,
} from "@/lib/auth"
import type { User, UserRole } from "@/lib/types"
import { toast } from "sonner"
import { UserIcon, Shield, Settings, UserPlus, Trash2, Key } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminDashboard } from "./admin-dashboard"

interface ProfileSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRoomsUpdate: () => void
}

export function ProfileSettingsDialog({ open, onOpenChange, onRoomsUpdate }: ProfileSettingsDialogProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [activeTab, setActiveTab] = useState("profile")

  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newUserRole, setNewUserRole] = useState<UserRole>("user")

  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")

  useEffect(() => {
    if (!open) return

    let cancelled = false

    ;(async () => {
      try {
        const user = await getCurrentUser()
        if (cancelled) return

        if (user) {
          setCurrentUser(user)
          setName(user.name)
          setEmail(user.email)
        } else {
          setCurrentUser(null)
          setName("")
          setEmail("")
        }

        if (user && isAdmin(user)) {
          const users = await getAllUsers()
          if (!cancelled) setAllUsers(users)
        } else {
          setAllUsers([])
        }
      } catch (err) {
        console.error(err)
        toast.error("Erro ao carregar utilizador")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open])

  const handleSaveProfile = async () => {
    if (!currentUser) return

    try {
      await updateUser(currentUser.id, { name, email })
      const updated = await getCurrentUser()
      setCurrentUser(updated)
      toast.success("Perfil atualizado com sucesso")
    } catch (e) {
      console.error(e)
      toast.error("Erro ao atualizar perfil")
    }
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole)
      const users = await getAllUsers()
      setAllUsers(users)
      toast.success("Permissões atualizadas")
    } catch (e) {
      console.error(e)
      toast.error("Erro ao atualizar permissões")
    }
  }

  const handleCreateUser = async () => {
    if (!currentUser) return

    const result = await createUserByAdmin(
      newUserEmail,
      newUserPassword,
      newUserName,
      newUserRole,
      currentUser,
    )

    if (result.success) {
      toast.success("Utilizador criado com sucesso")
      const users = await getAllUsers()
      setAllUsers(users)
      setShowCreateUser(false)
      setNewUserName("")
      setNewUserEmail("")
      setNewUserPassword("")
      setNewUserRole("user")
    } else {
      toast.error("Erro ao criar utilizador", { description: result.error })
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!currentUser) return

    if (!confirm(`Tem a certeza que deseja eliminar o utilizador ${userName}?`)) return

    const result = await deleteUser(userId, currentUser)

    if (result.success) {
      toast.success("Utilizador eliminado com sucesso")
      const users = await getAllUsers()
      setAllUsers(users)
    } else {
      toast.error("Erro ao eliminar utilizador", { description: result.error })
    }
  }

  const handleChangePassword = async () => {
    toast.info("A autenticação é gerida pelo Google / Outlook", {
      description: "A palavra-passe deve ser alterada diretamente no fornecedor de login.",
    })
  
    setShowChangePassword(false)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmNewPassword("")
  }
  

  const hasAdminAccess = currentUser && isAdmin(currentUser)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Definições
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={hasAdminAccess ? "grid w-full grid-cols-3" : "grid w-full grid-cols-1"}>
            <TabsTrigger value="profile">
              <UserIcon className="h-4 w-4 mr-2" />
              Perfil
            </TabsTrigger>

            {hasAdminAccess && (
              <>
                <TabsTrigger value="permissions">
                  <Shield className="h-4 w-4 mr-2" />
                  Utilizadores
                </TabsTrigger>
                <TabsTrigger value="rooms">
                  <Settings className="h-4 w-4 mr-2" />
                  Gestão de Salas
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informação do Perfil</CardTitle>
                <CardDescription>Atualize as suas informações pessoais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                </div>
                <Button onClick={handleSaveProfile}>Guardar Alterações</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Segurança</CardTitle>
                <CardDescription>
                  A autenticação é feita via Google ou Outlook
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>

          {hasAdminAccess && (
            <>
              <TabsContent value="permissions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Gestão de Utilizadores</CardTitle>
                    <CardDescription>Criar, editar e gerir utilizadores do sistema</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!showCreateUser ? (
                      <Button onClick={() => setShowCreateUser(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Criar Novo Utilizador
                      </Button>
                    ) : (
                      <div className="p-4 border rounded-lg space-y-4">
                        <h3 className="font-semibold">Criar Novo Utilizador</h3>
                        <div className="space-y-2">
                          <Label htmlFor="new-user-name">Nome</Label>
                          <Input
                            id="new-user-name"
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            placeholder="Nome completo"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-user-email">Email</Label>
                          <Input
                            id="new-user-email"
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="email@exemplo.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-user-password">Palavra-passe</Label>
                          <Input
                            id="new-user-password"
                            type="password"
                            value={newUserPassword}
                            onChange={(e) => setNewUserPassword(e.target.value)}
                            placeholder="(não aplicável com Google/Outlook)"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-user-role">Função</Label>
                          <Select value={newUserRole} onValueChange={(value: UserRole) => setNewUserRole(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="user">Utilizador</SelectItem>
                              <SelectItem value="guest">Convidado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleCreateUser}>Criar</Button>
                          <Button variant="outline" onClick={() => setShowCreateUser(false)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 mt-6">
                      <h3 className="font-semibold">Utilizadores Existentes</h3>
                      {allUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select value={user.role} onValueChange={(value: UserRole) => handleRoleChange(user.id, value)}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="user">Utilizador</SelectItem>
                                <SelectItem value="guest">Convidado</SelectItem>
                              </SelectContent>
                            </Select>

                            {user.id !== currentUser?.id && (
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id, user.name)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rooms" className="space-y-4">
                <AdminDashboard onRoomsUpdate={onRoomsUpdate} embedded />
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
