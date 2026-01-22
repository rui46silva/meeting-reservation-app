// lib/auth.ts
import type { User, UserRole } from "@/lib/types"

export const ALLOWED_DOMAINS = ["legendary.pt", "silver-lining.pt"]

export function toAppRole(role: string | null | undefined): UserRole {
  const r = (role || "USER").toUpperCase()
  if (r === "ADMIN") return "admin"
  if (r === "GUEST") return "guest"
  return "user"
}

export function isAdmin(user: User | null | undefined) {
  return !!user && user.role === "admin"
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch("/api/auth/session", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    if (!res.ok) return null

    const session = await res.json()

    const email = session?.user?.email as string | undefined
    const name = (session?.user?.name as string | undefined) ?? email ?? ""
    const id = session?.user?.id as string | undefined
    const role = session?.user?.role as string | undefined

    if (!email || !id) return null

    return {
      id,
      email,
      name: name || email.split("@")[0],
      role: toAppRole(role),
    }
  } catch (e) {
    console.error("[getCurrentUser] error:", e)
    return null
  }
}


export async function updateUser(userId: string, updates: { name?: string; email?: string }) {
  const res = await fetch(`/api/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error("Falha ao atualizar utilizador")
  return res.json()
}

export async function getAllUsers(): Promise<User[]> {
  const res = await fetch("/api/users", { cache: "no-store" })
  if (!res.ok) throw new Error("Falha ao carregar utilizadores")
  const data = await res.json()

  return (Array.isArray(data) ? data : []).map((u: any) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: toAppRole(u.role),
  }))
}

export async function updateUserRole(userId: string, role: UserRole) {
  const roleDb = role === "admin" ? "ADMIN" : role === "guest" ? "GUEST" : "USER"
  const res = await fetch(`/api/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: roleDb }),
  })
  if (!res.ok) throw new Error("Falha ao atualizar role")
  return res.json()
}

export async function createUserByAdmin(
  email: string,
  password: string, 
  name: string,
  role: UserRole,
  currentUser: User,
) {

  if (!isAdmin(currentUser)) {
    return { success: false, error: "Sem permissões." }
  }

  const roleDb = role === "admin" ? "ADMIN" : role === "guest" ? "GUEST" : "USER"

  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, role: roleDb }),
  })

  if (!res.ok) {
    const txt = await res.text()
    return { success: false, error: txt || "Erro ao criar utilizador" }
  }

  return { success: true }
}

export async function deleteUser(userId: string, currentUser: User) {
  if (!isAdmin(currentUser)) return { success: false, error: "Sem permissões." }

  const res = await fetch(`/api/users/${userId}`, { method: "DELETE" })
  if (!res.ok) {
    const txt = await res.text()
    return { success: false, error: txt || "Erro ao apagar utilizador" }
  }
  return { success: true }
}

export async function changePassword() {
  return { success: false, error: "Autenticação via Google/Outlook não suporta alterar password aqui." }
}

export function loginAsGuest(name: string): User {
  return {
    id: `guest-${Date.now()}`,
    email: "",
    name,
    role: "guest",
  }
}
