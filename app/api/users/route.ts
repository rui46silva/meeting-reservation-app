// app/api/users/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import type { UserRole } from "@prisma/client"
import { randomUUID } from "crypto"

// GET /api/users
export async function GET(_req: Request) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("[GET /api/users] error", error)
    return NextResponse.json(
      { error: "Erro ao carregar utilizadores" },
      { status: 500 },
    )
  }
}

// POST /api/users
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, name, role } = body as {
      email?: string
      name?: string
      role?: string
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 },
      )
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Já existe um utilizador com este email" },
        { status: 400 },
      )
    }

    const rawRole = (role ?? "user").toUpperCase()

    const validRoles: UserRole[] = ["ADMIN", "USER", "GUEST"]

    const finalRole: UserRole = validRoles.includes(rawRole as UserRole)
      ? (rawRole as UserRole)
      : "USER"

    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        name: name ?? email,
        role: finalRole,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("[POST /api/users] error", error)
    return NextResponse.json(
      { error: "Erro ao criar utilizador" },
      { status: 500 },
    )
  }
}
