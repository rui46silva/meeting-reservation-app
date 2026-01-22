// app/api/users/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET /api/users/[id]
export async function GET(
  _req: Request,
  context: any,
) {
  try {
    const { id } = context.params || {}

    if (!id) {
      return NextResponse.json(
        { error: "ID do utilizador em falta" },
        { status: 400 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilizador não encontrado" },
        { status: 404 },
      )
    }

    return NextResponse.json(user)
  } catch (error: any) {
    console.error("[GET /api/users/[id]] error", error)
    return NextResponse.json(
      {
        error: "Erro ao carregar utilizador",
        details: error?.message ?? String(error),
      },
      { status: 500 },
    )
  }
}

// PATCH /api/users/[id] → atualizar nome/role
export async function PATCH(
  req: Request,
  context: any,
) {
  try {
    const { id } = context.params || {}

    if (!id) {
      return NextResponse.json(
        { error: "ID do utilizador em falta" },
        { status: 400 },
      )
    }

    const body = await req.json()
    const { name, role } = body as { name?: string; role?: string }

    const data: any = {}
    if (name !== undefined) data.name = name
    if (role !== undefined) data.role = role

    const user = await prisma.user.update({
      where: { id },
      data,
    })

    return NextResponse.json(user)
  } catch (error: any) {
    console.error("[PATCH /api/users/[id]] error", error)
    return NextResponse.json(
      {
        error: "Erro ao atualizar utilizador",
        details: error?.message ?? String(error),
      },
      { status: 500 },
    )
  }
}

// DELETE /api/users/[id]
export async function DELETE(
  _req: Request,
  context: any,
) {
  try {
    const { id } = context.params || {}

    if (!id) {
      return NextResponse.json(
        { error: "ID do utilizador em falta" },
        { status: 400 },
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("[DELETE /api/users/[id]] error", error)
    return NextResponse.json(
      {
        error: "Erro ao apagar utilizador",
        details: error?.message ?? String(error),
      },
      { status: 500 },
    )
  }
}
